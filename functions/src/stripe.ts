/**
 * Stripe Checkout + webhook for the $3.14 lifetime unlock.
 *
 * Two functions:
 *
 *   createCheckoutSession  — Callable (HTTPS) the client invokes to get a
 *                            Stripe Checkout URL for the price-1x3.14 SKU.
 *                            Authenticates via the Firebase ID token on the
 *                            call; embeds uid in the session metadata so the
 *                            webhook knows which user just bought.
 *
 *   stripeWebhook          — Raw HTTPS endpoint Stripe POSTs to on every
 *                            payment event. We only act on
 *                            `checkout.session.completed`. On that event we
 *                            write paidAt + source='stripe' +
 *                            originalTransactionId to entitlements/{uid}.
 *                            Signature is verified before any side-effects.
 *
 * Secrets (set once with `firebase functions:secrets:set <NAME>`):
 *
 *   STRIPE_SECRET_KEY      — sk_live_… or sk_test_…
 *   STRIPE_WEBHOOK_SECRET  — whsec_…  (per-endpoint, given to you when you
 *                            register the webhook URL in the Stripe dashboard)
 *   STRIPE_PRICE_ID        — the Price object id for the $3.14 lifetime SKU
 *   PUBLIC_ORIGIN          — eg https://math-swipe-c7k.pages.dev — used to
 *                            build the success/cancel return URLs
 *
 * Idempotency:
 *   Stripe retries failed webhooks. Writing paidAt with merge:true is
 *   idempotent — re-applying the same paidAt timestamp is a no-op. We
 *   also short-circuit if entitlements/{uid}.paidAt is already set.
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const STRIPE_PRICE_ID = defineSecret('STRIPE_PRICE_ID');
const PUBLIC_ORIGIN = defineSecret('PUBLIC_ORIGIN');

/** Lazy Stripe client — instantiated per invocation so secret values are
 *  fresh at runtime (defineSecret values aren't available at module load).
 *  API version pinned to whatever the installed SDK declares as its default,
 *  so Stripe-side schema changes don't surprise us silently. */
function stripeClient(): Stripe {
    return new Stripe(STRIPE_SECRET_KEY.value());
}

// ── createCheckoutSession ─────────────────────────────────────────────────────

/**
 * Client invokes this with no args (the SKU + price live server-side).
 * Returns { url } — a Stripe Checkout URL the client should redirect to.
 *
 * Requires Firebase Auth: anonymous users CAN purchase, but they're warned
 * client-side to sign in first so the lifetime entitlement is portable
 * across devices. We still accept the call from anonymous accounts because
 * forcing sign-in adds friction at the worst possible moment (payment).
 */
export const createCheckoutSession = onCall(
    { secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_ID, PUBLIC_ORIGIN] },
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) {
            throw new HttpsError('unauthenticated', 'Sign-in required to purchase.');
        }

        // Short-circuit if this user has already paid — Stripe doesn't dedupe
        // for us, and a curious user clicking the unlock button twice
        // shouldn't pay twice.
        const entSnap = await admin.firestore()
            .doc(`entitlements/${uid}`)
            .get();
        const existing = entSnap.data();
        if (existing?.paidAt) {
            throw new HttpsError('already-exists', 'Already unlocked.');
        }

        const origin = PUBLIC_ORIGIN.value();
        try {
            const session = await stripeClient().checkout.sessions.create({
                mode: 'payment',
                line_items: [{ price: STRIPE_PRICE_ID.value(), quantity: 1 }],
                // success/cancel route back to the app. The Worker rewrites
                // the same shell on both, so no special routes needed.
                success_url: `${origin}/?paywall=ok&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin}/?paywall=cancelled`,
                // Metadata so the webhook knows which Firestore doc to write.
                // Stripe persists this on the Session, the PaymentIntent, AND
                // the Charge — all three readable from the webhook event.
                metadata: { uid },
                payment_intent_data: { metadata: { uid } },
                // Customer hint — prefill if we have one from a past abandoned
                // session. Not required.
                client_reference_id: uid,
                // Don't let Stripe collect billing address unless their bank
                // demands it (some EU cards do). Shorter checkout = better.
                billing_address_collection: 'auto',
                // 14-day-old-trial users hitting the gate are mid-emotional
                // moment. Don't tempt them with promo banners.
                allow_promotion_codes: false,
            });

            if (!session.url) {
                throw new HttpsError('internal', 'Stripe returned no checkout URL.');
            }
            return { url: session.url };
        } catch (err) {
            logger.error('[createCheckoutSession] Stripe error', err);
            throw new HttpsError('internal', 'Could not start checkout. Try again in a moment.');
        }
    }
);

// ── stripeWebhook ─────────────────────────────────────────────────────────────

/**
 * Stripe POSTs to this URL for every event. We verify the signature with
 * the per-endpoint webhook secret, then handle `checkout.session.completed`
 * by writing paidAt to entitlements/{uid}. Every other event is ignored.
 *
 * Critical: Stripe sends the raw body and a signature header. Firebase v2
 * onRequest gives us the parsed body by default, which BREAKS signature
 * verification. We have to access `req.rawBody` (a Buffer Firebase populates
 * for HTTPS triggers) instead.
 *
 * After a successful write, also send an HTTP 200 fast — Stripe retries
 * on non-2xx, and slow handlers create thundering-herd risk.
 */
export const stripeWebhook = onRequest(
    {
        secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET],
        // Webhook is publicly POSTed by Stripe — no auth check, but the
        // signature verification below proves the caller has the secret.
        cors: false,
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.status(405).send('Method not allowed');
            return;
        }
        const sig = req.headers['stripe-signature'];
        if (!sig || Array.isArray(sig)) {
            res.status(400).send('Missing stripe-signature header');
            return;
        }

        let event: Stripe.Event;
        try {
            event = stripeClient().webhooks.constructEvent(
                req.rawBody,
                sig,
                STRIPE_WEBHOOK_SECRET.value()
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'unknown';
            logger.warn('[stripeWebhook] signature verification failed:', msg);
            res.status(400).send(`Webhook signature failed: ${msg}`);
            return;
        }

        // Only the completed-checkout event grants entitlement. Other events
        // (e.g. payment_intent.succeeded, charge.succeeded) are duplicate
        // signals for the same transaction and would just re-write the same
        // paidAt — handle one to keep audit logs clean.
        if (event.type !== 'checkout.session.completed') {
            logger.info(`[stripeWebhook] ignoring event ${event.type}`);
            res.status(200).send('ignored');
            return;
        }

        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.metadata?.uid;
        if (!uid || typeof uid !== 'string') {
            logger.error('[stripeWebhook] session.completed without uid metadata', session.id);
            // 200 because retrying won't help — bad data, not transient.
            res.status(200).send('no uid');
            return;
        }

        // Idempotent write — re-deliveries of the same event land here too.
        // Using set(merge:true) so we don't clobber trialStartedAt etc.
        try {
            const ref = admin.firestore().doc(`entitlements/${uid}`);
            const snap = await ref.get();
            if (snap.exists && snap.data()?.paidAt) {
                logger.info(`[stripeWebhook] ${uid} already paid, skipping`);
                res.status(200).send('already paid');
                return;
            }
            await ref.set({
                paidAt: Date.now(),
                source: 'stripe',
                originalTransactionId: session.id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            logger.info(`[stripeWebhook] granted lifetime access to ${uid} (session ${session.id})`);
            res.status(200).send('ok');
        } catch (err) {
            logger.error('[stripeWebhook] Firestore write failed', err);
            // 500 → Stripe retries with backoff. The webhook is idempotent
            // so retries are safe.
            res.status(500).send('write failed');
        }
    }
);
