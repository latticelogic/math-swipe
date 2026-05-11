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
}

interface NotificationPayload {
    title: string;
    body: string;
    url?: string;
    kind: 'daily' | 'beaten' | 'generic';
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

// ── 1. Daily reminder ─────────────────────────────────────────────────────────

export const dailyReminder = onSchedule(
    {
        schedule: '0 17 * * *',
        timeZone: 'America/Los_Angeles',
        secrets: [VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT],
    },
    async () => {
        configurePush();
        const cutoff = Date.now() - 18 * 60 * 60 * 1000; // 18h ago

        const subsSnap = await db.collection('pushSubscriptions').where('dailyEnabled', '==', true).get();
        let sent = 0;
        for (const doc of subsSnap.docs) {
            const uid = doc.id;
            const sub = doc.data() as PushSubscriptionDoc;
            // Skip users who already played today
            const userSnap = await db.collection('users').doc(uid).get();
            const lastPlayedDate = userSnap.data()?.stats?.lastPlayedDate;
            if (typeof lastPlayedDate === 'string') {
                // YYYY-MM-DD format from useStats
                const lastTime = Date.parse(lastPlayedDate + 'T12:00:00Z');
                if (!Number.isNaN(lastTime) && lastTime > cutoff) continue;
            }
            const ok = await sendOne(uid, sub, {
                title: '🔥 Keep your streak alive!',
                body: 'Just a few problems to keep the day going.',
                url: '/',
                kind: 'daily',
            });
            if (ok) sent++;
        }
        logger.info('dailyReminder complete', { totalSubs: subsSnap.size, sent });
    },
);

// ── 2. You got beaten ─────────────────────────────────────────────────────────

export const notifyBeaten = onDocumentUpdated(
    {
        document: 'users/{uid}',
        secrets: [VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT],
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

    const beaterName = after.displayName ?? 'Someone';
    const beatenName = prevSlot.docs[0].data().displayName ?? 'You';
    await sendOne(beatenUid, sub, {
        title: '⚔️ You got beaten!',
        body: `${beaterName} just passed you on the speedrun board.`,
        url: `/u/${encodeURIComponent(beatenName)}-${beatenUid.slice(0, 4)}`,
        kind: 'beaten',
    });
});
