/**
 * Google Play Billing for the $3.14 lifetime unlock — the Android-channel
 * analogue of airwallex.ts. The client (PWA running as a Trusted Web Activity
 * from Google Play) buys the `pro_lifetime` in-app product through the Digital
 * Goods API; this module verifies the purchase server-side and grants the
 * entitlement with source:'google'.
 *
 *   verifyPlayPurchase — Callable. Auth via the Firebase ID token. Takes
 *                        { sku, purchaseToken }, verifies the token against the
 *                        Android Publisher API, guards against token replay
 *                        across accounts, writes paidAt, and ACKNOWLEDGES the
 *                        purchase (unacknowledged purchases auto-refund after
 *                        3 days — acknowledgement is not optional).
 *   playRtdn           — Pub/Sub handler for Play's Real-Time Developer
 *                        Notifications. Revokes paidAt on voided/refunded
 *                        purchases, source-gated exactly like the Airwallex
 *                        refund path so a Play refund can never clear a paidAt
 *                        written by another provider.
 *
 * Auth model: no secrets. The function runs as the project's service account;
 * the Android Publisher API accepts it once that SA is granted access in Play
 * Console. Setup steps (one-time, dashboard — see docs/google-play-launch.md):
 *
 *   TODO(play): Play Console → Users and permissions → invite
 *     math-swipe-prod@appspot.gserviceaccount.com   (or the gen2 default
 *     compute SA) with "View financial data" + "Manage orders" permissions,
 *     scoped to the Math Challenge app.
 *   TODO(play): create the in-app product `pro_lifetime` at $3.14 (one-time).
 *   TODO(play): Play Console → Monetize → Monetization setup → RTDN → point at
 *     the Pub/Sub topic `play-rtdn` in math-swipe-prod (create the topic first:
 *     `gcloud pubsub topics create play-rtdn --project math-swipe-prod`).
 *
 * Nothing here can grant access until those steps are done — verification
 * fails closed (the Publisher API rejects the unauthorized SA).
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { GoogleAuth } from 'google-auth-library';
import { createHash } from 'node:crypto';

/** Must match the TWA's applicationId in twa-manifest.json. */
const PACKAGE_NAME = 'app.mathchallenge.twa';
/** The one product. Must match PLAY_SKU in src/utils/checkout.ts and the
 *  in-app product id created in Play Console. */
const VALID_SKUS = new Set(['pro_lifetime']);

const ANDROID_PUBLISHER_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

/** Hash tokens before using them as doc ids — purchase tokens are long,
 *  contain unsafe chars, and shouldn't sit raw in doc ids anyway. */
function tokenDocId(purchaseToken: string): string {
    return createHash('sha256').update(purchaseToken).digest('hex');
}

interface ProductPurchase {
    purchaseState?: number;         // 0 = purchased, 1 = canceled, 2 = pending
    acknowledgementState?: number;  // 0 = yet to be acknowledged, 1 = acknowledged
    orderId?: string;
    purchaseTimeMillis?: string;
}

// ── verifyPlayPurchase ────────────────────────────────────────────────────────

export const verifyPlayPurchase = onCall(
    { maxInstances: 10 }, // bound fan-out (see docs/billing-safety.md)
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) {
            throw new HttpsError('unauthenticated', 'Sign-in required to purchase.');
        }
        const sku = String(request.data?.sku ?? '');
        const purchaseToken = String(request.data?.purchaseToken ?? '');
        if (!VALID_SKUS.has(sku) || !purchaseToken || purchaseToken.length > 2048) {
            throw new HttpsError('invalid-argument', 'Bad purchase payload.');
        }

        // 1) Verify with Google — the ONLY trusted signal. The client's word is
        //    never enough (a forged token must fail here).
        let purchase: ProductPurchase;
        try {
            const client = await auth.getClient();
            const url = `${ANDROID_PUBLISHER_BASE}/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(sku)}/tokens/${encodeURIComponent(purchaseToken)}`;
            const res = await client.request<ProductPurchase>({ url });
            purchase = res.data;
        } catch (err) {
            logger.warn('[verifyPlayPurchase] publisher API rejected token', { uid, err: String(err) });
            throw new HttpsError('permission-denied', 'Purchase could not be verified.');
        }
        if (purchase.purchaseState !== 0) {
            throw new HttpsError('failed-precondition', 'Purchase is not in a completed state.');
        }

        const db = admin.firestore();

        // 2) Replay guard: one purchase token grants exactly one account, ever.
        //    Transactional claim on a token-keyed doc; a second account
        //    presenting the same token loses the race and is rejected.
        const claimRef = db.doc(`playPurchases/${tokenDocId(purchaseToken)}`);
        await db.runTransaction(async (tx) => {
            const claim = await tx.get(claimRef);
            if (claim.exists && claim.data()?.uid !== uid) {
                throw new HttpsError('already-exists', 'This purchase belongs to another account.');
            }
            tx.set(claimRef, {
                uid,
                sku,
                orderId: purchase.orderId ?? null,
                claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            // 3) Grant. Merge-write mirrors the Airwallex grant shape exactly.
            tx.set(db.doc(`entitlements/${uid}`), {
                paidAt: Number(purchase.purchaseTimeMillis) || Date.now(),
                source: 'google',
                originalTransactionId: purchase.orderId ?? tokenDocId(purchaseToken).slice(0, 24),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        });

        // 4) Acknowledge (idempotent; skip if already done). MUST happen or
        //    Play refunds the purchase automatically after 3 days.
        if (purchase.acknowledgementState === 0) {
            try {
                const client = await auth.getClient();
                const ackUrl = `${ANDROID_PUBLISHER_BASE}/applications/${PACKAGE_NAME}/purchases/products/${encodeURIComponent(sku)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
                await client.request({ url: ackUrl, method: 'POST', data: {} });
            } catch (err) {
                // Grant already committed — log loudly so a stuck ack can be
                // retried before the 3-day auto-refund window closes. The client
                // retry path (restorePlayPurchases on next boot) re-runs this.
                logger.error('[verifyPlayPurchase] ACK FAILED — must retry within 3 days', { uid, err: String(err) });
            }
        }

        logger.info(`[verifyPlayPurchase] granted lifetime access to ${uid} (${purchase.orderId})`);
        return { ok: true };
    }
);

// ── playRtdn — refund/void revocation ────────────────────────────────────────

interface RtdnEnvelope {
    version?: string;
    packageName?: string;
    oneTimeProductNotification?: {
        notificationType?: number; // 1 = purchased, 2 = canceled
        purchaseToken?: string;
        sku?: string;
    };
    voidedPurchaseNotification?: {
        purchaseToken?: string;
        orderId?: string;
        productType?: number;
    };
}

export const playRtdn = onMessagePublished(
    { topic: 'play-rtdn', maxInstances: 5 },
    async (event) => {
        let envelope: RtdnEnvelope;
        try {
            envelope = event.data.message.json as RtdnEnvelope;
        } catch {
            logger.warn('[playRtdn] non-JSON message; ignoring');
            return;
        }
        if (envelope.packageName && envelope.packageName !== PACKAGE_NAME) {
            logger.warn(`[playRtdn] unexpected package ${envelope.packageName}; ignoring`);
            return;
        }

        // Voided purchases (refunds, chargebacks) and one-time cancellations
        // both revoke. Everything else (purchase notifications) is already
        // handled by the callable path.
        const token = envelope.voidedPurchaseNotification?.purchaseToken
            ?? (envelope.oneTimeProductNotification?.notificationType === 2
                ? envelope.oneTimeProductNotification.purchaseToken
                : undefined);
        if (!token) {
            logger.info('[playRtdn] no revocation in message; ignoring');
            return;
        }

        const db = admin.firestore();
        const claim = await db.doc(`playPurchases/${tokenDocId(token)}`).get();
        const uid = claim.data()?.uid as string | undefined;
        if (!uid) {
            logger.warn('[playRtdn] voided token with no recorded claim; nothing to revoke');
            return;
        }
        const entRef = db.doc(`entitlements/${uid}`);
        const ent = await entRef.get();
        // Only revoke access that Play granted — a Play refund must never clear
        // a paidAt written by another source (airwallex/apple/promo).
        if (!ent.exists || ent.data()?.paidAt == null || ent.data()?.source !== 'google') {
            logger.info(`[playRtdn] nothing to revoke for ${uid} (source=${ent.data()?.source})`);
            return;
        }
        await entRef.set({
            paidAt: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        logger.info(`[playRtdn] revoked access for ${uid} (voided Play purchase)`);
    }
);
