/**
 * Apple StoreKit 2 billing for the $3.14 lifetime unlock — the iOS-channel
 * analogue of playBilling.ts. The iOS shell (ios-native/) buys `pro_lifetime`
 * via StoreKit 2 and hands the SIGNED-TRANSACTION JWS to the web app, which
 * calls verifyAppleTransaction here. We verify Apple's signature chain
 * server-side and grant the entitlement with source:'apple'.
 *
 *   verifyAppleTransaction — Callable. Auth via the Firebase ID token. Takes
 *                            { jws }, verifies the JWS against Apple's root
 *                            CAs (offline x5c-chain verification via the
 *                            official @apple/app-store-server-library — no API
 *                            key needed), checks bundle id + product + not
 *                            revoked, replay-guards on originalTransactionId,
 *                            writes paidAt, and returns the transactionId so
 *                            the client can `finish()` the transaction (the
 *                            StoreKit analogue of server-side acknowledge —
 *                            an unfinished transaction re-delivers, so a
 *                            failed verification is always retried).
 *   appleNotifications     — HTTP endpoint for App Store Server Notifications
 *                            V2 (refunds/revocations). Verifies the signed
 *                            payload with the same chain and revokes paidAt,
 *                            source-gated exactly like playRtdn / the
 *                            Airwallex refund path.
 *
 * Environments: production AND sandbox verifiers — TestFlight and App Review
 * run in the sandbox environment, real users in production. NOTE (fail-closed
 * until App Store Connect exists): verifying PRODUCTION transactions requires
 * the app's numeric Apple ID (APP_APPLE_ID below), which is only assigned when
 * the app is created in App Store Connect. Until it's filled in, production
 * verification fails closed while sandbox (TestFlight/review) works — set it
 * during the App Store launch checklist (docs/native-ios-plan.md).
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    Environment,
    SignedDataVerifier,
    VerificationException,
} from '@apple/app-store-server-library';
import { creditReferralConversion } from './referral';

/** Must match ios-native/project.yml PRODUCT_BUNDLE_IDENTIFIER and (later) the
 *  App Store Connect app record. */
const BUNDLE_ID = 'app.mathchallenge.ios';
/** The app's numeric Apple ID from App Store Connect ("App Information" page).
 *  REQUIRED for production-environment verification; undefined until the app
 *  record exists → production verification fails closed, sandbox works. */
const APP_APPLE_ID: number | undefined = undefined;
/** The one product. Must match PLAY_SKU / the App Store Connect product id. */
const VALID_SKUS = new Set(['pro_lifetime']);

/** Apple's public root CAs (checked into functions/certs/ — public, stable).
 *  JWS x5c chains must terminate at one of these. */
function appleRootCerts(): Buffer[] {
    const dir = join(__dirname, '..', 'certs');
    return [
        'AppleRootCA-G3.cer',
        'AppleRootCA-G2.cer',
        'AppleIncRootCertificate.cer',
        'AppleComputerRootCertificate.cer',
    ].map(f => readFileSync(join(dir, f)));
}

function makeVerifier(environment: Environment): SignedDataVerifier {
    return new SignedDataVerifier(
        appleRootCerts(),
        /* enableOnlineChecks */ false,   // offline chain verification; no OCSP dependency in the hot path
        environment,
        BUNDLE_ID,
        APP_APPLE_ID,
    );
}

interface DecodedTransaction {
    bundleId?: string;
    productId?: string;
    transactionId?: string;
    originalTransactionId?: string;
    purchaseDate?: number;
    revocationDate?: number;
    environment?: string;
}

/** Verify + decode a signed-transaction JWS, trying production first then
 *  sandbox (TestFlight / App Review). Throws if neither accepts it. */
async function verifyTransactionJws(jws: string): Promise<DecodedTransaction> {
    let lastErr: unknown;
    for (const env of [Environment.PRODUCTION, Environment.SANDBOX]) {
        try {
            return await makeVerifier(env).verifyAndDecodeTransaction(jws) as DecodedTransaction;
        } catch (err) {
            lastErr = err;
        }
    }
    throw lastErr instanceof Error ? lastErr : new VerificationException(0 as never);
}

// ── verifyAppleTransaction ───────────────────────────────────────────────────

export const verifyAppleTransaction = onCall(
    { maxInstances: 10 }, // bound fan-out (runaway-cost guard, same as verifyPlayPurchase)
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) {
            throw new HttpsError('unauthenticated', 'Sign-in required to purchase.');
        }
        const jws = String(request.data?.jws ?? '');
        if (!jws || jws.length > 16384 || jws.split('.').length !== 3) {
            throw new HttpsError('invalid-argument', 'Bad purchase payload.');
        }

        // 1) Verify Apple's signature chain — the ONLY trusted signal. A forged
        //    or tampered JWS fails here; so does one for another app.
        let tx: DecodedTransaction;
        try {
            tx = await verifyTransactionJws(jws);
        } catch (err) {
            logger.warn('[verifyAppleTransaction] JWS verification failed', { uid, err: String(err) });
            throw new HttpsError('permission-denied', 'Purchase could not be verified.');
        }
        if (tx.bundleId !== BUNDLE_ID || !tx.productId || !VALID_SKUS.has(tx.productId)) {
            throw new HttpsError('permission-denied', 'Purchase is for a different product.');
        }
        if (tx.revocationDate) {
            throw new HttpsError('failed-precondition', 'Purchase was refunded.');
        }
        const originalId = String(tx.originalTransactionId ?? tx.transactionId ?? '');
        if (!originalId) {
            throw new HttpsError('failed-precondition', 'Transaction has no id.');
        }

        const db = admin.firestore();

        // 2) Replay guard: one original transaction grants exactly one account,
        //    ever (restores re-present the same originalTransactionId).
        const claimRef = db.doc(`applePurchases/${originalId}`);
        await db.runTransaction(async (t) => {
            const claim = await t.get(claimRef);
            if (claim.exists && claim.data()?.uid !== uid) {
                throw new HttpsError('already-exists', 'This purchase belongs to another account.');
            }
            t.set(claimRef, {
                uid,
                sku: tx.productId,
                environment: tx.environment ?? null,
                claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            // 3) Grant. Merge-write mirrors the Airwallex/Play grant shape.
            t.set(db.doc(`entitlements/${uid}`), {
                paidAt: Number(tx.purchaseDate) || Date.now(),
                source: 'apple',
                originalTransactionId: originalId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        });

        // Referral conversion credit (guarded — never throws into the grant path).
        await creditReferralConversion(uid);

        logger.info(`[verifyAppleTransaction] granted lifetime access to ${uid} (${originalId}, ${tx.environment})`);
        // The client finishes the StoreKit transaction ONLY on this success.
        return { ok: true, transactionId: String(tx.transactionId ?? originalId) };
    }
);

// ── appleNotifications — App Store Server Notifications V2 (refunds) ─────────
//
// Configure in App Store Connect → App Information → App Store Server
// Notifications (V2) → this function's URL, once the app record exists. The
// signed payload is self-verifying (x5c chain), so no shared secret is needed;
// unverifiable payloads are rejected.

interface DecodedNotification {
    notificationType?: string;
    data?: { signedTransactionInfo?: string; bundleId?: string };
}

export const appleNotifications = onRequest(
    { maxInstances: 5 },
    async (req, res) => {
        if (req.method !== 'POST') { res.status(405).send('method not allowed'); return; }
        const signedPayload = String((req.body as { signedPayload?: string })?.signedPayload ?? '');
        if (!signedPayload) { res.status(400).send('missing payload'); return; }

        let note: DecodedNotification | null = null;
        for (const env of [Environment.PRODUCTION, Environment.SANDBOX]) {
            try {
                note = await makeVerifier(env).verifyAndDecodeNotification(signedPayload) as DecodedNotification;
                break;
            } catch { /* try the other environment */ }
        }
        if (!note) {
            logger.warn('[appleNotifications] unverifiable payload; rejecting');
            res.status(401).send('unverifiable');
            return;
        }

        // Refund-class events revoke; everything else is informational here
        // (purchases are granted via the callable path).
        const type = note.notificationType ?? '';
        if (type !== 'REFUND' && type !== 'REVOKE') {
            logger.info(`[appleNotifications] ${type}: no action`);
            res.status(200).send('ok');
            return;
        }

        const txJws = note.data?.signedTransactionInfo ?? '';
        let tx: DecodedTransaction | null = null;
        if (txJws) {
            try { tx = await verifyTransactionJws(txJws); } catch { tx = null; }
        }
        const originalId = String(tx?.originalTransactionId ?? '');
        if (!originalId) {
            logger.warn('[appleNotifications] refund without a verifiable transaction; ignoring');
            res.status(200).send('ok');
            return;
        }

        const db = admin.firestore();
        const claim = await db.doc(`applePurchases/${originalId}`).get();
        const uid = claim.data()?.uid as string | undefined;
        if (!uid) {
            logger.warn('[appleNotifications] refunded transaction with no recorded claim');
            res.status(200).send('ok');
            return;
        }
        const entRef = db.doc(`entitlements/${uid}`);
        const ent = await entRef.get();
        // Only revoke access Apple granted — an Apple refund must never clear a
        // paidAt written by another source (airwallex/google/promo).
        if (!ent.exists || ent.data()?.paidAt == null || ent.data()?.source !== 'apple') {
            logger.info(`[appleNotifications] nothing to revoke for ${uid} (source=${ent.data()?.source})`);
            res.status(200).send('ok');
            return;
        }
        await entRef.set({
            paidAt: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        logger.info(`[appleNotifications] revoked access for ${uid} (${type} ${originalId})`);
        res.status(200).send('ok');
    }
);
