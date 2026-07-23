/**
 * Cloud Functions — push notification senders.
 *
 * Two functions in this file:
 *
 *  1. `dailyReminder`  — pubsub-scheduled, runs once per day. Iterates over
 *                        every `pushSubscriptions/{uid}` doc with
 *                        `dailyEnabled: true` whose owner hasn't played in
 *                        the last 18 hours, and sends a streak-reminder push.
 *
 *  2. `notifyBeaten`   — Firestore-triggered on `users/{uid}` updates.
 *                        When a user's `bestSpeedrunTime` improves enough to
 *                        bump someone above them, look up the bumped user's
 *                        push subscription (if any) and send a "you got
 *                        beaten" notification.
 *
 * Both functions read VAPID credentials from runtime config:
 *   firebase functions:config:set vapid.public_key="..." vapid.private_key="..." vapid.subject="mailto:you@example.com"
 *
 * Deploy:
 *   cd functions && npm install && npm run build && npm run deploy
 *
 * See ./README.md for the full setup checklist.
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import * as webpush from 'web-push';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();
const db = admin.firestore();

// Re-export Airwallex payment + webhook functions. Lives in its own module to
// keep the push code self-contained — both are independently deployable.
// (Payments are Airwallex-only; Stripe was removed 2026-07-15.)
export { createAirwallexPayment, airwallexWebhook } from './airwallex';

// Google Play Billing (Android/TWA channel): server-side purchase verification
// + grant (source:'google'), and RTDN-driven refund revocation — the Play
// analogue of the Airwallex webhook. Inert until the one-time TODO(play)
// Play Console steps in ./playBilling.ts are done.
export { verifyPlayPurchase, playRtdn } from './playBilling';
export { verifyAppleTransaction, appleNotifications } from './appleBilling';

// Leaderboard cache rebuilder — see ./leaderboard.ts for the 60s cron
// that pre-aggregates the top-20 score and top-10 speedrun cache docs
// the client reads instead of running N live user-doc listeners.
export { rebuildLeaderboardCache } from './leaderboard';

// Referral attribution callable — records who invited a new player and bumps
// the referrer's server-verified referral count. See ./referral.ts.
export { claimReferral } from './referral';

// Account reconciliation callable — merges an anonymous account's entitlement
// (paid + earliest trial) + stats into the account it signs into, proven by the
// source ID token. Closes the sign-in paywall-bypass / data-loss hole. See
// ./reconcile.ts.
export { reconcileAccount } from './reconcile';

// VAPID credentials live in Secret Manager. Even the public key is a secret
// here (rather than a plain param) so rotation is one CLI command + a
// function redeploy, with no code edits.
//
//   firebase functions:secrets:set VAPID_PUBLIC --data-file -
//   firebase functions:secrets:set VAPID_PRIVATE --data-file -
//   firebase functions:secrets:set VAPID_SUBJECT --data-file -
const VAPID_PUBLIC = defineSecret('VAPID_PUBLIC');
const VAPID_PRIVATE = defineSecret('VAPID_PRIVATE');
const VAPID_SUBJECT = defineSecret('VAPID_SUBJECT');

// Resend transactional email — used to email the weekly growth digest.
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
// Recipient + sender. FROM uses Resend's shared domain so it works with ZERO DNS
// setup; TO must be the Resend account's own email UNLESS latticelogic.app is
// verified in Resend (then FROM can be branded + TO can be anyone). One-line
// change + redeploy to update either.
const DIGEST_EMAIL_TO = 'support@latticelogic.app';
const DIGEST_EMAIL_FROM = 'Math Challenge <onboarding@resend.dev>';

/** Best-effort digest email via Resend. Never throws — a mail failure must not
 *  break the digest (which also pushes + stores the snapshot). No-ops if the
 *  RESEND_API_KEY secret isn't set yet. */
async function sendDigestEmail(subject: string, html: string): Promise<boolean> {
    let key: string | undefined;
    try { key = RESEND_API_KEY.value(); } catch { key = undefined; }
    if (!key) return false;
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: DIGEST_EMAIL_FROM, to: [DIGEST_EMAIL_TO], subject, html }),
        });
        if (!res.ok) {
            logger.warn('growthDigest: email send failed', { status: res.status, body: (await res.text()).slice(0, 200) });
            return false;
        }
        return true;
    } catch (e) {
        logger.warn('growthDigest: email error', { err: String(e) });
        return false;
    }
}

function configurePush() {
    webpush.setVapidDetails(
        VAPID_SUBJECT.value(),
        VAPID_PUBLIC.value(),
        VAPID_PRIVATE.value(),
    );
}

interface PushSubscriptionDoc {
    /** Web Push (browser PushManager) fields. Absent for native subscribers. */
    endpoint?: string;
    keys?: { p256dh: string; auth: string };
    /** Native FCM registration token (the WebView shell registers this instead
     *  of endpoint/keys). Present → send via the Firebase Admin SDK, not web-push. */
    fcmToken?: string;
    /** 'android' for the native shell; absent/‘web’ for the browser. */
    platform?: string;
    userAgent?: string;
    dailyEnabled?: boolean;
    pingsEnabled?: boolean;
    /** IANA timezone from the client, e.g. "Asia/Singapore". Reminders fire at
     *  the user's local evening; absent → falls back to the default zone. */
    timezone?: string;
    /** Server timestamp (ms) of the last 'beaten' notification we sent.
     *  Used to throttle so a hot streak of leaderboard bumps doesn't
     *  hammer the user with notifications in quick succession. */
    lastBeatenPingAt?: number;
}

interface NotificationPayload {
    title: string;
    body: string;
    url?: string;
    kind: 'daily' | 'beaten' | 'generic' | 'streak-risk';
}

/** Append a row to `pushEvents/` so the analytics view can compute
 *  delivery / failure / click rates. Best-effort — never blocks send. */
async function logPushEvent(uid: string, kind: string, event: 'sent' | 'failed', errorCode?: number) {
    try {
        await db.collection('pushEvents').add({
            uid,
            kind,
            event,
            ...(typeof errorCode === 'number' ? { errorCode } : {}),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (err) {
        logger.warn('Failed to log pushEvent', { uid, kind, event, err });
    }
}

async function sendOne(uid: string, sub: PushSubscriptionDoc, payload: NotificationPayload): Promise<boolean> {
    // Native subscribers (the WebView shell) carry an FCM token, not a web-push
    // endpoint — send via the Firebase Admin SDK. Same doc/collection + prefs,
    // so the reminder/ping selection logic above is unchanged.
    if (sub.fcmToken) {
        try {
            await admin.messaging().send({
                token: sub.fcmToken,
                notification: { title: payload.title, body: payload.body },
                data: { url: payload.url ?? '/', kind: payload.kind },
                android: { notification: { channelId: 'daily_reminders' } },
            });
            await logPushEvent(uid, payload.kind, 'sent');
            return true;
        } catch (err) {
            const code = (err as { code?: string }).code;
            await logPushEvent(uid, payload.kind, 'failed');
            // Dead token → clean up so we stop trying (mirrors the 404/410 path).
            if (code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token' ||
                code === 'messaging/invalid-argument') {
                logger.info('FCM token invalid, removing', { uid });
                await db.collection('pushSubscriptions').doc(uid).delete().catch(() => { /* ignore */ });
            } else {
                logger.warn('Native push send failed', { uid, err });
            }
            return false;
        }
    }
    if (!sub.endpoint || !sub.keys) return false; // malformed / neither channel
    try {
        await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            JSON.stringify({
                notification: { title: payload.title, body: payload.body, icon: '/icon-192.png' },
                data: { url: payload.url ?? '/', kind: payload.kind },
            }),
        );
        await logPushEvent(uid, payload.kind, 'sent');
        return true;
    } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        await logPushEvent(uid, payload.kind, 'failed', status);
        // 404 / 410 = subscription expired or unsubscribed; clean up.
        if (status === 404 || status === 410) {
            logger.info('Subscription expired, removing', { uid });
            await db.collection('pushSubscriptions').doc(uid).delete().catch(() => { /* ignore */ });
        } else {
            logger.warn('Push send failed', { uid, err });
        }
        return false;
    }
}

// ── 1. Daily reminder (timezone-aware + streak-risk) ──────────────────────────

/** Hour of the user's local day to nudge at (18 = 6pm). */
const REMINDER_LOCAL_HOUR = 18;
/** Default zone when a subscription predates timezone capture. */
const DEFAULT_TZ = 'America/Los_Angeles';

/** The user's local hour (0–23) and calendar date (YYYY-MM-DD) right now.
 *  YYYY-MM-DD matches the client's todayKey() format so it compares directly
 *  against stats.lastPlayedDate. */
function localHourAndDate(tz: string, now: Date): { hour: number; date: string } {
    let hour: number;
    let date: string;
    try {
        hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', hour12: false }).format(now), 10) % 24;
        date = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    } catch {
        // Bad/unknown tz string — fall back to the default zone.
        hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TZ, hour: '2-digit', hour12: false }).format(now), 10) % 24;
        date = new Intl.DateTimeFormat('en-CA', { timeZone: DEFAULT_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    }
    return { hour, date };
}

// Runs hourly. Each subscriber is only nudged once/day — in the hour that is
// their local REMINDER_LOCAL_HOUR — so a global user base is reached at a
// humane local time rather than a fixed Pacific hour (S2). When an active
// day-streak is genuinely at risk (no shield left, not played today), the copy
// switches to a soft loss-aversion variant (S1).
export const dailyReminder = onSchedule(
    {
        schedule: '0 * * * *',
        timeZone: 'Etc/UTC',
        secrets: [VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT],
        // One instance handles the hourly pass; cap bounds cost pre-launch.
        maxInstances: 2,
    },
    async () => {
        configurePush();
        const now = new Date();

        const subsSnap = await db.collection('pushSubscriptions').where('dailyEnabled', '==', true).get();
        let sent = 0;
        let streakRisk = 0;
        for (const doc of subsSnap.docs) {
            const uid = doc.id;
            const sub = doc.data() as PushSubscriptionDoc;
            const { hour, date: localToday } = localHourAndDate(sub.timezone || DEFAULT_TZ, now);
            // Only in the subscriber's local evening hour.
            if (hour !== REMINDER_LOCAL_HOUR) continue;

            const stats = (await db.collection('users').doc(uid).get()).data()?.stats;
            const lastPlayedDate: string | undefined = stats?.lastPlayedDate;
            // Already played today (their local day)? Nothing to nudge.
            if (lastPlayedDate === localToday) continue;

            const dayStreak = Number(stats?.dayStreak ?? 0);
            const shields = Number(stats?.streakShields ?? 0);
            // Streak is truly on the line tonight only if it's worth protecting,
            // hasn't been played today, and there's no shield to forgive a miss.
            const atRisk = dayStreak >= 3 && shields === 0;

            const payload: NotificationPayload = atRisk
                ? {
                    title: `Your ${dayStreak}-day streak ends tonight`,
                    body: 'A quick round keeps it going — no pressure.',
                    url: '/',
                    kind: 'streak-risk',
                }
                : {
                    // Soft, teacher-not-alarm tone — matches the existing bar.
                    title: 'A few problems waiting',
                    body: "Whenever you're ready — your spot is held.",
                    url: '/',
                    kind: 'daily',
                };

            const ok = await sendOne(uid, sub, payload);
            if (ok) { sent++; if (atRisk) streakRisk++; }
        }
        logger.info('dailyReminder complete', { totalSubs: subsSnap.size, sent, streakRisk });
    },
);

// ── 2. You got beaten ─────────────────────────────────────────────────────────

export const notifyBeaten = onDocumentUpdated(
    {
        document: 'users/{uid}',
        secrets: [VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT],
        // Fires on every users/{uid} write — the highest-fan-out trigger here.
        // Cap instances so a traffic spike (or a write storm) can't scale out
        // unboundedly and blow the pre-launch budget.
        maxInstances: 10,
    },
    async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const beforeTime = before.bestSpeedrunTime ?? 0;
    const afterTime = after.bestSpeedrunTime ?? 0;
    // Only fire when this user just improved (lower is better; 0 = never played)
    if (afterTime === 0 || (beforeTime > 0 && afterTime >= beforeTime)) return;

    configurePush();

    // Find the player this user just bumped — i.e., the next-faster time
    // before this update.
    const prevSlot = await db.collection('users')
        .where('bestSpeedrunTime', '>', afterTime)
        .where('bestSpeedrunTime', '<', beforeTime || Number.MAX_SAFE_INTEGER)
        .orderBy('bestSpeedrunTime', 'asc')
        .limit(1)
        .get();
    if (prevSlot.empty) return;
    const beatenUid = prevSlot.docs[0].id;
    if (beatenUid === event.params.uid) return; // self-bump, ignore

    const subSnap = await db.collection('pushSubscriptions').doc(beatenUid).get();
    if (!subSnap.exists) return;
    const sub = subSnap.data() as PushSubscriptionDoc;
    if (!sub.pingsEnabled) return;

    // Throttle: don't send more than one beaten-ping per 30 minutes per user.
    // A hot streak of leaderboard bumps would otherwise spam them, which is
    // the fastest way to lose a user. The first bump still goes through;
    // follow-ups within 30 minutes are silently swallowed.
    const now = Date.now();
    const THROTTLE_MS = 30 * 60 * 1000;
    if (sub.lastBeatenPingAt && now - sub.lastBeatenPingAt < THROTTLE_MS) {
        logger.info('beaten ping throttled', { beatenUid, sinceMs: now - sub.lastBeatenPingAt });
        return;
    }

    const beaterName = after.displayName ?? 'Someone';
    const beatenName = prevSlot.docs[0].data().displayName ?? 'You';
    // Softer-toned: "You got beaten" reads hostile; "passed your time"
    // is the same fact phrased without aggression. Lifts the focus from
    // loss to fact-of-event, which matches the kid-friendly tone better.
    const ok = await sendOne(beatenUid, sub, {
        title: 'Someone passed your time',
        body: `${beaterName} edged ahead on the speedrun board.`,
        url: `/u/${encodeURIComponent(beatenName)}-${beatenUid.slice(0, 4)}`,
        kind: 'beaten',
    });
    if (ok) {
        // Record so subsequent bumps within the throttle window are skipped.
        await db.collection('pushSubscriptions').doc(beatenUid).update({
            lastBeatenPingAt: now,
        }).catch(() => { /* non-fatal */ });
    }
});

// ── 3. Error-spike alert (ops, not user-facing) ──────────────────────────────
//
// The client writes crash reports to `errors/` (errorMonitor.ts) but until
// 2026-07-21 nothing read them — a production outage was first reported by a
// tester, hours in. This cron closes that loop: every hour, if the last hour
// produced >= ERROR_SPIKE_THRESHOLD reports, push a notification to every
// admin (isAdmin custom claim) who has a push subscription, deep-linking to
// /admin/errors. Runs at :30 to stay out of dailyReminder's :00 slot.

const ERROR_SPIKE_THRESHOLD = 3;

export const errorSpike = onSchedule(
    {
        schedule: '30 * * * *',
        timeZone: 'Etc/UTC',
        secrets: [VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT],
        maxInstances: 1,
    },
    async () => {
        const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
        const snap = await db.collection('errors')
            .where('timestamp', '>', oneHourAgo)
            .get();
        if (snap.size < ERROR_SPIKE_THRESHOLD) return;

        // Sample the most common message for the notification body.
        const firstMsg = (snap.docs[0]?.data()?.message as string | undefined) ?? '';

        // Admins = users carrying the isAdmin custom claim. listUsers pages
        // 1000 at a time — fine at pre-launch scale; revisit if the user base
        // outgrows a single page (admins are created manually and early, so
        // in practice they live in the first page anyway).
        const { users } = await admin.auth().listUsers(1000);
        const adminUids = users.filter(u => u.customClaims?.isAdmin === true).map(u => u.uid);
        if (adminUids.length === 0) {
            logger.warn('errorSpike: spike detected but no admin users to notify', { count: snap.size });
            return;
        }

        configurePush();
        let sent = 0;
        for (const uid of adminUids) {
            const subSnap = await db.collection('pushSubscriptions').doc(uid).get();
            if (!subSnap.exists) continue;
            const sub = subSnap.data() as PushSubscriptionDoc;
            const ok = await sendOne(uid, sub, {
                title: `Math Challenge: ${snap.size} errors in the last hour`,
                body: firstMsg.slice(0, 120) || 'Open the error dashboard for details.',
                url: '/admin/errors',
                kind: 'generic',
            });
            if (ok) sent++;
        }
        logger.info('errorSpike: alerted admins', { errors: snap.size, admins: adminUids.length, sent });
    },
);

// ── 4. Weekly growth digest (ops, not user-facing) ───────────────────────────
//
// Turns growth telemetry from "remember to open /admin/funnel" into a passive
// tap-on-the-shoulder. Once a week it aggregates the core numbers (entitlements,
// funnel, the live A/B split), stores a snapshot for week-over-week deltas +
// anomaly flags, and pushes a one-glance summary to every admin (deep-links to
// /admin/funnel). Runs Mondays 09:00 UTC (out of the :00/:30 cron slots above).
//
// Reads are full-collection scans — fine at launch/weekly scale; revisit with
// incremental aggregation if the user base grows large. maxInstances:1 + weekly
// cadence bound the cost. TRIAL_DAYS mirrors src/utils/entitlement.ts (7).
const DIGEST_TRIAL_DAYS = 7;

function toMs(v: unknown): number {
    if (typeof v === 'number') return v;
    if (v && typeof v === 'object' && 'toMillis' in v) return (v as { toMillis: () => number }).toMillis();
    return 0;
}

export const growthDigest = onSchedule(
    {
        schedule: '0 9 * * 1',
        timeZone: 'Etc/UTC',
        secrets: [VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, RESEND_API_KEY],
        maxInstances: 1,
    },
    async () => {
        const now = Date.now();
        const weekAgo = now - 7 * 86_400_000;

        // Entitlements: paid / trial / expired / new-this-week + conversion.
        const entSnap = await db.collection('entitlements').get();
        const paidUids = new Set<string>();
        let paid = 0, trial = 0, expired = 0, newTrials = 0, newPaid = 0;
        entSnap.forEach(d => {
            const e = d.data();
            const paidAt = toMs(e.paidAt);
            if (paidAt > 0) {
                paid++; paidUids.add(d.id);
                if (paidAt >= weekAgo) newPaid++;
                return;
            }
            const started = toMs(e.trialStartedAt);
            const bonus = typeof e.trialBonusDays === 'number' ? e.trialBonusDays : 0;
            if (started >= weekAgo) newTrials++;
            const daysIn = started ? Math.floor((now - started) / 86_400_000) : 0;
            if (started && daysIn < DIGEST_TRIAL_DAYS + bonus) trial++; else expired++;
        });
        const finished = paid + expired; // users whose trial resolved one way or the other
        const conversionPct = finished > 0 ? Math.round((paid / finished) * 1000) / 10 : 0;

        // Funnel: how many reached each step (set-once docs in funnel/{uid}).
        const funnelSnap = await db.collection('funnel').get();
        let fOpen = 0, fPlay = 0, fPaywall = 0, fPurchase = 0;
        funnelSnap.forEach(d => {
            const f = d.data();
            if (f.firstOpen) fOpen++;
            if (f.firstPlay) fPlay++;
            if (f.paywallView) fPaywall++;
            if (f.purchase) fPurchase++;
        });

        // Live A/B: paywall-cta exposures per variant, joined to paid for a rough
        // conversion-per-variant read.
        const expoSnap = await db.collection('experimentExposures')
            .where('experimentId', '==', 'paywall-cta').get();
        const variantUids: Record<string, Set<string>> = {};
        expoSnap.forEach(d => {
            const x = d.data();
            const v = String(x.variant ?? 'control');
            const uid = x.uid as string | undefined;
            if (!variantUids[v]) variantUids[v] = new Set();
            if (uid) variantUids[v].add(uid);
        });
        const abLines = Object.entries(variantUids).map(([v, uids]) => {
            const total = uids.size;
            const conv = [...uids].filter(u => paidUids.has(u)).length;
            const pct = total ? Math.round((conv / total) * 1000) / 10 : 0;
            return `${v} ${conv}/${total} (${pct}%)`;
        });

        // Week-over-week deltas + anomaly flags vs the last stored snapshot.
        const latestRef = db.doc('opsDigests/latest');
        const prev = (await latestRef.get()).data();
        const convDelta = prev?.conversionPct != null ? Math.round((conversionPct - prev.conversionPct) * 10) / 10 : null;
        const anomalies: string[] = [];
        if (convDelta != null && convDelta <= -5) anomalies.push(`ALERT conversion down ${Math.abs(convDelta)}pts`);
        if (prev?.funnel?.firstOpen != null && fOpen > prev.funnel.firstOpen * 3 && fOpen - prev.funnel.firstOpen > 50) {
            anomalies.push(`installs surged (${prev.funnel.firstOpen}->${fOpen})`);
        }
        if (prev?.paid != null && paid < prev.paid) anomalies.push(`ALERT paid count dropped ${prev.paid}->${paid} (refunds?)`);

        const snapshot = {
            at: admin.firestore.FieldValue.serverTimestamp(),
            atMs: now,
            paid, trial, expired, newTrials, newPaid, conversionPct,
            funnel: { firstOpen: fOpen, firstPlay: fPlay, paywallView: fPaywall, purchase: fPurchase },
            ab: abLines,
        };
        await latestRef.set(snapshot);          // for next week's delta
        await db.collection('opsDigests').add(snapshot); // history trail

        // Compose + push the summary to admins (same delivery as errorSpike).
        const title = `Weekly: ${paid} paid, ${conversionPct}% conv, ${newTrials} new trials`;
        const bodyParts = [
            `Funnel ${fOpen}>${fPlay}>${fPaywall}>${fPurchase}`,
            abLines.length ? `A/B ${abLines.join(', ')}` : '',
            convDelta != null ? `conv ${convDelta >= 0 ? '+' : ''}${convDelta}pts wow` : '',
            ...anomalies,
        ].filter(Boolean);
        const body = bodyParts.join(' | ').slice(0, 240) || 'Open the funnel dashboard.';

        logger.info('growthDigest', { ...snapshot, at: now, anomalies });

        // Email the digest (the reliable weekly channel). Best-effort; no-ops
        // until RESEND_API_KEY is set.
        const emailHtml = `
            <div style="font-family:system-ui,sans-serif;max-width:520px">
              <h2 style="margin:0 0 12px">Math Challenge — weekly growth digest</h2>
              <ul style="line-height:1.7;padding-left:18px">
                <li><b>Paid:</b> ${paid} (${newPaid} new this week) · Trial: ${trial} · Expired: ${expired}</li>
                <li><b>Trial→paid conversion:</b> ${conversionPct}%${convDelta != null ? ` (${convDelta >= 0 ? '+' : ''}${convDelta}pts vs last week)` : ''}</li>
                <li><b>New trials this week:</b> ${newTrials}</li>
                <li><b>Funnel:</b> ${fOpen} open → ${fPlay} play → ${fPaywall} paywall → ${fPurchase} purchase</li>
                <li><b>A/B paywall-cta:</b> ${abLines.length ? abLines.join(' · ') : '— (no exposures yet)'}</li>
                ${anomalies.length ? `<li style="color:#b00"><b>Flags:</b> ${anomalies.join('; ')}</li>` : ''}
              </ul>
              <p><a href="https://mathchallenge.app/admin/funnel">Open the funnel dashboard →</a></p>
              <p style="color:#888;font-size:12px">Automated weekly digest · growthDigest</p>
            </div>`;
        const emailed = await sendDigestEmail(title, emailHtml);
        logger.info('growthDigest: email', { emailed, to: DIGEST_EMAIL_TO });

        const { users } = await admin.auth().listUsers(1000);
        const adminUids = users.filter(u => u.customClaims?.isAdmin === true).map(u => u.uid);
        if (adminUids.length === 0) {
            logger.info('growthDigest: no admins to notify (snapshot still stored)');
            return;
        }
        configurePush();
        let sent = 0;
        for (const uid of adminUids) {
            const subSnap = await db.collection('pushSubscriptions').doc(uid).get();
            if (!subSnap.exists) continue;
            const sub = subSnap.data() as PushSubscriptionDoc;
            const ok = await sendOne(uid, sub, { title, body, url: '/admin/funnel', kind: 'generic' });
            if (ok) sent++;
        }
        logger.info('growthDigest: pushed to admins', { admins: adminUids.length, sent });
    },
);
