# Airwallex payments setup

Airwallex is the intended payment provider for the Singapore entity (Lattice
Logic Pte. Ltd.). The integration mirrors the Stripe one: a callable creates a
hosted payment and returns a redirect URL; a signed webhook writes/clears
`paidAt` on `entitlements/{uid}`. Code is in `functions/src/airwallex.ts` +
`src/utils/checkout.ts`.

> **Status: scaffold.** It's written against Airwallex's documented REST API
> without a live account to test, and is **inert until the secrets are set**. The
> `TODO(airwallex)` markers in `airwallex.ts` are the handful of things to
> confirm against the current API reference before the first real charge.

## Prerequisites

1. **Airwallex Payment Acceptance activated** — complete the KYB at
   `airwallex.com/app/kyb/payment-activation` (business info + the site domain
   for approval; submit `https://math-swipe-c7k.pages.dev` + any custom domain).
2. **API keys** — Airwallex → Developer → API keys → note the **Client ID** and
   an **API key**.
3. **A one-time USD 3.14 product** isn't needed up front — the callable creates
   the amount per payment.

## Wire it up (when activated)

1. **Set the secrets** (Cloud Functions):
   ```bash
   firebase functions:secrets:set AIRWALLEX_CLIENT_ID --project math-swipe-prod --account tim@latticelogic.app
   firebase functions:secrets:set AIRWALLEX_API_KEY --project math-swipe-prod --account tim@latticelogic.app
   firebase functions:secrets:set AIRWALLEX_WEBHOOK_SECRET --project math-swipe-prod --account tim@latticelogic.app
   firebase functions:secrets:set PUBLIC_ORIGIN --project math-swipe-prod --account tim@latticelogic.app   # e.g. https://math-swipe-c7k.pages.dev
   ```
2. **Deploy** the functions:
   ```bash
   firebase deploy --only functions --project math-swipe-prod --account tim@latticelogic.app
   ```
   Note: `createAirwallexPayment` (callable) + `airwallexWebhook` (public HTTP)
   need the **public invoker** — which hits the org's Domain Restricted Sharing
   policy exactly like the Stripe functions did (see docs/billing-safety.md).
   Open the project-scoped DRS exception, then re-grant the invoker.
3. **Register the webhook** in the Airwallex dashboard → Developer → Webhooks →
   endpoint `https://us-central1-math-swipe-prod.cloudfunctions.net/airwallexWebhook`,
   subscribed to payment-success + refund events. Copy the signing secret into
   `AIRWALLEX_WEBHOOK_SECRET`.
4. **Client provider flag:** `VITE_PAYMENT_PROVIDER=airwallex` (the default) —
   set it on Cloudflare Pages (prod + preview) so the client calls the Airwallex
   callable. `stripe` switches back to the Stripe path.

## Confirm before first live charge (`TODO(airwallex)` in airwallex.ts)

- **Payment creation:** we use `POST /api/v1/pa/payment_links/create` (returns a
  hosted `url`). Confirm this endpoint/fields for your account, or switch to
  Payment Intent + the JS SDK's `redirectToCheckout`.
- **Webhook events:** we grant on `payment_intent.succeeded` and revoke on a
  `*refund*succeeded/processed*` event — confirm the exact names.
- **Webhook signature:** we verify HMAC-SHA256 over `${x-timestamp}${rawBody}`
  from `x-signature` — confirm the header names + concatenation order.
- **Region host:** `AIRWALLEX_BASE` is `api.airwallex.com` (sandbox is
  `api-demo.airwallex.com`).

## Test

Run the equivalent of `docs/first-purchase-qa.md` against Airwallex sandbox
first (set the base to the demo host + sandbox keys), verify a test payment
writes `paidAt` with `source:'airwallex'`, then a test refund clears it.

## Stripe

`functions/src/stripe.ts` stays in the tree as a fallback (inert without its
secrets). To use it instead, set `VITE_PAYMENT_PROVIDER=stripe` and deploy with
the Stripe secrets. Only one provider needs to be live.
