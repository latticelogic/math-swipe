/**
 * functions/src/referral.ts
 *
 * Referral attribution — the one closed viral loop the app was missing.
 *
 * Share URLs carry `?r=<referrerUid>`. When a NEW user arrives, plays enough
 * to prove they're a real player, the client calls `claimReferral` with the
 * referrer's uid. This callable validates and records the attribution
 * server-side, then bumps the referrer's verified `referralStats/{uid}.count`.
 *
 * The reward is delivered CLIENT-SIDE off that verified count (referral
 * achievements + cosmetics), exactly like every other stat-derived unlock —
 * but the count itself can only be written here (admin SDK), so it can't be
 * forged from the client.
 *
 * Anti-abuse (we're a kids' game with cosmetic-only rewards, so the bar is
 * "make casual farming pointless", not "defeat a determined Sybil"):
 *   • Self-referral blocked (referrer !== invitee).
 *   • One credit per invitee, ever — `referrals/{inviteeUid}` is created once
 *     and a second attempt is a no-op. An invitee can't be resold.
 *   • Invitee must have actually played: users/{invitee}.totalSolved >= MIN.
 *     A bot that just opens the link and calls this earns the referrer nothing.
 *   • Referrer must exist as a real user doc.
 *   • App Check enforced (attestation the caller is the genuine app).
 * Residual risk (many throwaway invitee accounts each grinding MIN problems to
 * farm one's own referral achievements) is accepted: the payoff is cosmetic,
 * capped by the achievement ladder, and each fake costs real play effort.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

/** Problems an invitee must have solved before a referral credits. */
const MIN_INVITEE_SOLVED = 10;

export const claimReferral = onCall(
    { enforceAppCheck: true, maxInstances: 10 },
    async (request) => {
        const db = admin.firestore();

        const inviteeUid = request.auth?.uid;
        if (!inviteeUid) {
            throw new HttpsError('unauthenticated', 'Sign-in required.');
        }

        const referrerUid = String(request.data?.referrerUid ?? '').trim();
        if (!referrerUid || referrerUid.length > 128) {
            throw new HttpsError('invalid-argument', 'Missing referrer.');
        }
        if (referrerUid === inviteeUid) {
            // Self-referral — silently succeed as a no-op so the client just
            // clears its pending code and never retries.
            return { credited: false, reason: 'self' };
        }

        // Idempotency + one-per-invitee: if this invitee already has a referral
        // record, do nothing (whoever got there first keeps the credit).
        const inviteeRef = db.doc(`referrals/${inviteeUid}`);
        const existing = await inviteeRef.get();
        if (existing.exists) {
            return { credited: false, reason: 'already' };
        }

        // Invitee must be a genuine player, not a link-opening bot.
        const inviteeSnap = await db.doc(`users/${inviteeUid}`).get();
        const inviteeSolved = Number(inviteeSnap.get('totalSolved') ?? 0);
        if (!Number.isFinite(inviteeSolved) || inviteeSolved < MIN_INVITEE_SOLVED) {
            throw new HttpsError('failed-precondition', 'Play a little more first.');
        }

        // Referrer must exist.
        const referrerRef = db.doc(`users/${referrerUid}`);
        const referrerSnap = await referrerRef.get();
        if (!referrerSnap.exists) {
            return { credited: false, reason: 'no-referrer' };
        }

        // Record attribution and bump the verified count in one transaction so
        // a double-fire can't double-count.
        const statsRef = db.doc(`referralStats/${referrerUid}`);
        await db.runTransaction(async (tx) => {
            const already = await tx.get(inviteeRef);
            if (already.exists) return; // lost a race — someone else recorded it
            tx.set(inviteeRef, {
                referrerUid,
                creditedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(
                statsRef,
                {
                    count: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
            );
        });

        logger.info('referral credited', { referrerUid, inviteeUid });
        return { credited: true };
    },
);
