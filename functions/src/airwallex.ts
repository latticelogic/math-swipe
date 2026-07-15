/**
 * Airwallex payments for the $3.14 lifetime unlock — the Airwallex analogue of
 * stripe.ts. Structurally identical: a callable that creates a hosted payment
 * and returns a redirect URL, plus a signed webhook that writes/clears paidAt.
 *
 *   createAirwallexPayment — Callable. Auth via the Firebase ID token; embeds
 *                            uid in the payment metadata + merchant_order_id so
 *                            the webhook knows which user bought. Returns { url }
 *                            to a hosted Airwallex payment page.
 *   airwallexWebhook       — Raw HTTPS endpoint Airwallex POSTs to. Verifies the
 *                            HMAC signature over the raw body, then grants on a
 *                            successful payment and revokes on a refund.
 *
 * Secrets (firebase functions:secrets:set <NAME>):
 *   AIRWALLEX_CLIENT_ID     — from Airwallex → Developer → API keys
 *   AIRWALLEX_API_KEY       — from Airwallex → Developer → API keys
 *   AIRWALLEX_WEBHOOK_SECRET— per-endpoint webhook signing secret
 *   PUBLIC_ORIGIN           — e.g. https://mathchallenge.app
 *
 * Entitlement writes use source:'airwallex'. The client gate is source-agnostic.
 *
 * ⚠️ SCAFFOLD — authored against Airwallex's documented REST API without a live
 * account to test. Before going live, confirm against the current API reference:
 * the payment-creation endpoint/shape (Payment Links vs Payment Intent + HPP),
 * the exact webhook event names, and the signature scheme. Spots to verify are
 * marked `TODO(airwallex)`. Nothing here runs until the secrets are set.
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { createHmac, timingSafeEqual } from 'node:crypto';

const AIRWALLEX_CLIENT_ID = defineSecret('AIRWALLEX_CLIENT_ID');
const AIRWALLEX_API_KEY = defineSecret('AIRWALLEX_API_KEY');
const AIRWALLEX_WEBHOOK_SECRET = defineSecret('AIRWALLEX_WEBHOOK_SECRET');
const PUBLIC_ORIGIN = defineSecret('PUBLIC_ORIGIN');

// Production host. Airwallex's sandbox is https://api-demo.airwallex.com — swap
// for local/staging testing. TODO(airwallex): confirm the region host for your
// account (some accounts use a regional base).
const AIRWALLEX_BASE = 'https://api.airwallex.com';

const PRICE = { amount: 3.14, currency: 'USD' }; // Airwallex amounts are decimal major units (not cents)

/** Exchange the client id + api key for a short-lived bearer token. */
async function airwallexToken(): Promise<string> {
    const res = await fetch(`${AIRWALLEX_BASE}/api/v1/authentication/login`, {
        method: 'POST',
        headers: {
            'x-client-id': AIRWALLEX_CLIENT_ID.value(),
            'x-api-key': AIRWALLEX_API_KEY.value(),
        },
    });
    if (!res.ok) {
        throw new Error(`Airwallex auth failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { token: string };
    return json.token;
}

/** Simple request-id for idempotent Airwallex calls (no Math.random needed — a
 *  uid + ms timestamp is unique enough per purchase attempt). */
function requestId(uid: string): string {
    return `msw_${uid}_${Date.now()}`;
}

// ── createAirwallexPayment ────────────────────────────────────────────────────

export const createAirwallexPayment = onCall(
    {
        secrets: [AIRWALLEX_CLIENT_ID, AIRWALLEX_API_KEY, PUBLIC_ORIGIN],
        maxInstances: 10, // bound fan-out (see docs/billing-safety.md)
    },
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) {
            throw new HttpsError('unauthenticated', 'Sign-in required to purchase.');
        }

        // Don't let an already-paid user pay twice.
        const existing = (await admin.firestore().doc(`entitlements/${uid}`).get()).data();
        if (existing?.paidAt) {
            throw new HttpsError('already-exists', 'Already unlocked.');
        }

        const origin = PUBLIC_ORIGIN.value();
        const orderId = requestId(uid);
        try {
            const token = await airwallexToken();

            // Create a single-use hosted Payment Link and redirect the user to
            // its `url`. uid rides in metadata AND merchant_order_id so the
            // webhook can always resolve it (mirrors the robust Stripe pattern).
            // TODO(airwallex): confirm the payment-links create endpoint + fields
            // for your account; some integrations use payment_intents + the JS
            // SDK's redirectToCheckout instead.
            const res = await fetch(`${AIRWALLEX_BASE}/api/v1/pa/payment_links/create`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    request_id: orderId,
                    amount: PRICE.amount,
                    currency: PRICE.currency,
                    title: 'Math Challenge — lifetime unlock',
                    reusable: false,
                    merchant_order_id: orderId,
                    metadata: { uid },
                    return_url: `${origin}/?paywall=ok`,
                }),
            });

            if (!res.ok) {
                logger.error('[createAirwallexPayment] create failed', res.status, await res.text());
                throw new HttpsError('internal', 'Could not start checkout. Try again in a moment.');
            }
            const link = (await res.json()) as { url?: string };
            if (!link.url) {
                throw new HttpsError('internal', 'Airwallex returned no payment URL.');
            }
            return { url: link.url };
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            logger.error('[createAirwallexPayment] error', err);
            throw new HttpsError('internal', 'Could not start checkout. Try again in a moment.');
        }
    }
);

// ── airwallexWebhook ──────────────────────────────────────────────────────────

/** Airwallex signs webhooks with HMAC-SHA256 over `${timestamp}${rawBody}`,
 *  hex-encoded, sent in `x-signature` with the timestamp in `x-timestamp`.
 *  TODO(airwallex): confirm the header names + concatenation order for your
 *  account's webhook config. */
function verifyAirwallexSignature(rawBody: Buffer, timestamp: string, signature: string, secret: string): boolean {
    const expected = createHmac('sha256', secret).update(`${timestamp}${rawBody.toString('utf8')}`).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
}

interface AirwallexEvent {
    name?: string;
    data?: { object?: Record<string, unknown> };
}

export const airwallexWebhook = onRequest(
    {
        secrets: [AIRWALLEX_WEBHOOK_SECRET],
        cors: false,
        maxInstances: 10,
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }
        const sig = req.headers['x-signature'];
        const ts = req.headers['x-timestamp'];
        if (typeof sig !== 'string' || typeof ts !== 'string') {
            res.status(400).send('Missing signature headers');
            return;
        }
        if (!verifyAirwallexSignature(req.rawBody, ts, sig, AIRWALLEX_WEBHOOK_SECRET.value())) {
            logger.warn('[airwallexWebhook] signature verification failed');
            res.status(400).send('Bad signature');
            return;
        }

        let event: AirwallexEvent;
        try {
            event = JSON.parse(req.rawBody.toString('utf8')) as AirwallexEvent;
        } catch {
            res.status(400).send('Bad JSON');
            return;
        }

        const obj = event.data?.object ?? {};
        // TODO(airwallex): confirm exact event names. Common ones:
        //   payment success → 'payment_intent.succeeded'
        //   refund          → 'refund.succeeded' / 'payment_attempt.refund.succeeded'
        if (event.name === 'payment_intent.succeeded') {
            await grant(resolveUid(obj), String(obj.id ?? ''), res);
            return;
        }
        if (event.name && /refund/.test(event.name) && /succeeded|processed/.test(event.name)) {
            await revoke(resolveUid(obj), res);
            return;
        }
        logger.info(`[airwallexWebhook] ignoring event ${event.name}`);
        res.status(200).send('ignored');
    }
);

/** uid comes from metadata.uid, falling back to parsing merchant_order_id
 *  (`msw_<uid>_<ts>`) — belt and braces, like the Stripe refund path. */
function resolveUid(obj: Record<string, unknown>): string | null {
    const meta = obj.metadata as Record<string, unknown> | undefined;
    if (meta && typeof meta.uid === 'string') return meta.uid;
    const order = obj.merchant_order_id;
    if (typeof order === 'string' && order.startsWith('msw_')) {
        const parts = order.split('_');
        if (parts.length >= 3) return parts.slice(1, -1).join('_');
    }
    return null;
}

type WebhookResponse = { status: (n: number) => { send: (s: string) => void } };

async function grant(uid: string | null, txnId: string, res: WebhookResponse) {
    if (!uid) {
        logger.error('[airwallexWebhook] payment success without resolvable uid');
        res.status(200).send('no uid');
        return;
    }
    try {
        const ref = admin.firestore().doc(`entitlements/${uid}`);
        const snap = await ref.get();
        if (snap.exists && snap.data()?.paidAt) {
            res.status(200).send('already paid');
            return;
        }
        await ref.set({
            paidAt: Date.now(),
            source: 'airwallex',
            originalTransactionId: txnId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        logger.info(`[airwallexWebhook] granted lifetime access to ${uid} (${txnId})`);
        res.status(200).send('ok');
    } catch (err) {
        logger.error('[airwallexWebhook] grant write failed', err);
        res.status(500).send('write failed');
    }
}

async function revoke(uid: string | null, res: WebhookResponse) {
    if (!uid) {
        res.status(200).send('no uid');
        return;
    }
    try {
        const ref = admin.firestore().doc(`entitlements/${uid}`);
        const snap = await ref.get();
        if (!snap.exists || snap.data()?.paidAt == null) {
            res.status(200).send('nothing to revoke');
            return;
        }
        // Clear paidAt; keep source + originalTransactionId for the admin
        // dashboard's refund detection (paidAt==null + txn id set).
        await ref.set({
            paidAt: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        logger.info(`[airwallexWebhook] revoked access for ${uid} (refund)`);
        res.status(200).send('ok');
    } catch (err) {
        logger.error('[airwallexWebhook] revoke write failed', err);
        res.status(500).send('write failed');
    }
}
