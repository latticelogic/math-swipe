/**
 * functions/src/reconcile.ts
 *
 * Account reconciliation — closes the sign-in data-loss / paywall-bypass hole.
 *
 * When a user links their anonymous account and the credential is already in
 * use, Firebase switches them to the PRE-EXISTING account (a different uid).
 * Their anonymous uid's entitlement (paid state + trial clock) would be
 * orphaned: a paid user could lose access, and — worse — an EXPIRED user would
 * land on a fresh 14-day trial (a re-runnable paywall bypass).
 *
 * SECURITY: we can't trust a client-supplied "fromUid" — that would let anyone
 * copy a paid/high-stat account onto their own. Instead the client passes the
 * anonymous account's ID TOKEN (captured before the switch). We verifyIdToken
 * it here: a valid token PROVES the caller controlled that source account. Only
 * then do we merge. So both sides are proven — source by token, target by the
 * callable's own auth context.
 *
 * Merge policy:
 *   • entitlement.trialStartedAt → the EARLIEST of the two (a sign-in can never
 *     reset/extend a trial → no bypass).
 *   • entitlement.paidAt/source/originalTransactionId → kept if EITHER side is
 *     paid (never lose paid access).
 *   • stats → take the source blob when it has strictly more XP (it's the
 *     caller's own proven data). Same-device localStorage already covers most
 *     cases; this handles cross-device / cleared-storage sign-ins.
 *
 * Deploys with the go-live function bundle (needs the DRS invoker exception,
 * same as claimReferral / the Stripe callables).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

export const reconcileAccount = onCall(
    { enforceAppCheck: true, maxInstances: 10 },
    async (request) => {
        const db = admin.firestore();

        const toUid = request.auth?.uid;
        if (!toUid) throw new HttpsError('unauthenticated', 'Sign-in required.');

        const fromIdToken = String(request.data?.fromIdToken ?? '');
        if (!fromIdToken) throw new HttpsError('invalid-argument', 'Missing source token.');

        // Proof of ownership of the source account.
        let fromUid: string;
        try {
            fromUid = (await admin.auth().verifyIdToken(fromIdToken)).uid;
        } catch {
            throw new HttpsError('permission-denied', 'Invalid source token.');
        }
        if (fromUid === toUid) return { merged: false, reason: 'same' };

        // ── Entitlement: keep paid, keep the earliest trial start ──
        const fromEntRef = db.doc(`entitlements/${fromUid}`);
        const toEntRef = db.doc(`entitlements/${toUid}`);
        const [fromEntSnap, toEntSnap] = await Promise.all([fromEntRef.get(), toEntRef.get()]);
        const fromEnt = fromEntSnap.data();
        const toEnt = toEntSnap.data();

        if (fromEnt || toEnt) {
            const trials = [fromEnt?.trialStartedAt, toEnt?.trialStartedAt]
                .filter((n): n is number => typeof n === 'number' && n > 0);
            // Prefer a paid record from either side.
            const paid = fromEnt?.paidAt ? fromEnt : (toEnt?.paidAt ? toEnt : null);
            await toEntRef.set({
                trialStartedAt: trials.length ? Math.min(...trials) : (toEnt?.trialStartedAt ?? fromEnt?.trialStartedAt ?? 0),
                paidAt: paid?.paidAt ?? null,
                source: paid?.source ?? null,
                originalTransactionId: paid?.originalTransactionId ?? null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        // ── Stats: adopt the source blob if it's ahead (proven-owned data) ──
        const [fromUserSnap, toUserSnap] = await Promise.all([
            db.doc(`users/${fromUid}`).get(),
            db.doc(`users/${toUid}`).get(),
        ]);
        const fromStats = fromUserSnap.get('stats');
        if (fromStats && typeof fromStats === 'object') {
            const fromXP = Number(fromStats.totalXP ?? 0);
            const toXP = Number(toUserSnap.get('stats')?.totalXP ?? toUserSnap.get('totalXP') ?? 0);
            if (fromXP > toXP) {
                await db.doc(`users/${toUid}`).set({
                    stats: fromStats,
                    totalXP: fromXP,
                    totalSolved: Number(fromStats.totalSolved ?? 0),
                    bestStreak: Number(fromStats.bestStreak ?? 0),
                    accuracy: Number(fromUserSnap.get('accuracy') ?? 0),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
        }

        logger.info('account reconciled', { fromUid, toUid, paid: !!(fromEnt?.paidAt || toEnt?.paidAt) });
        return { merged: true };
    },
);
