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

function configurePush() {
    webpush.setVapidDetails(
        VAPID_SUBJECT.value(),
        VAPID_PUBLIC.value(),
        VAPID_PRIVATE.value(),
    );
}

interface PushSubscriptionDoc {
    endpoint: string;
    keys: { p256dh: string; auth: string };
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
