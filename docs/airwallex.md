# Airwallex payments setup

Airwallex is the **sole** payment provider for the Singapore entity (Lattice
Logic Pte. Ltd.) — Stripe was removed 2026-07-15. A callable creates a hosted
payment and returns a redirect URL; a signed webhook writes `paidAt` on
`entitlements/{uid}` on a successful payment and clears it on a refund. Code is
in `functions/src/airwallex.ts` + `src/utils/checkout.ts`.

> **Status: scaffold.** It's written against Airwallex's documented REST API
> without a live account to test, and is **inert until the secrets are set**. The
> `TODO(airwallex)` markers in `airwallex.ts` are the handful of things to
> confirm against the current API reference before the first real charge.

## Website requirements (application rejected 2026-07-21)

The first payment-activation application was **rejected for all methods**
(Visa / MC / Amex / UnionPay / Apple Pay / Google Pay) with reason
"website requirements". Airwallex's onboarding doc requires the site to
show: business identification (company name, registration number, contact
details incl. address), discoverable policies (Terms, Privacy, **Refund**),
a public checkout/pricing surface, and governing law matching the
registered country.

Fixed in code (2026-07-21):

- **`/pricing`** — public product + pricing page (US$3.14 one-time, what it
  unlocks, payment methods, refund link). The in-app paywall is invisible to
  a reviewer; this page is the public checkout surface.
- **Footer row** is now Pricing · Privacy · Terms · Refund on the legal
  pages, the Paywall, the Settings sheet, AND the bottom of the Me tab
  (previously Refund was only linked from inside the Terms — undiscoverable).
- **`<BusinessBlock />`** — company name + UEN + contact email shown under
  every legal page and the Me tab.
- **Stale Stripe references** in the Privacy/Refund copy replaced with
  Airwallex (the policy text named a different processor than the
  application — a consistency red flag).
- Governing law already matched (Singapore ↔ Lattice Logic Pte. Ltd.). ✓

**Before reapplying (owner):** fill in `BUSINESS.address` (ACRA registered
office) and optionally `BUSINESS.phone` in `src/components/LegalPages.tsx` —
Airwallex lists address explicitly under "contact information". Then deploy
(merge to master) and resubmit at `airwallex.com/app/kyb/payment-activation`
with `https://mathchallenge.app`.

## Prerequisites

1. **Airwallex Payment Acceptance activated** — complete the KYB at
   `airwallex.com/app/kyb/payment-activation` (business info + the site domain
   for approval; submit `https://mathchallenge.app` + any custom domain).
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
   firebase functions:secrets:set PUBLIC_ORIGIN --project math-swipe-prod --account tim@latticelogic.app   # e.g. https://mathchallenge.app
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

## Go-live QA (against the Airwallex sandbox first)

Point the base at the demo host (`https://api-demo.airwallex.com`) with sandbox
keys, then walk the full loop end-to-end:

1. **Purchase** — tap unlock → redirected to the hosted Airwallex page →
   complete a test payment → land back on `?paywall=ok`.
2. **Grant** — `entitlements/{uid}` now has `paidAt` set + `source:'airwallex'`;
   the paywall auto-closes and the Pro set unlocks (advanced modes, full Magic
   Tricks, Pro cosmetics).
3. **Webhook idempotency** — re-deliver the success event; `paidAt` is unchanged
   (grant no-ops on an already-paid doc), and the stale-timestamp guard rejects
   an old replayed delivery.
4. **Refund** — issue a test refund → the refund event fires → `paidAt` is
   cleared (only when `source==='airwallex'`), and access reverts to the
   trial/paywall state.
5. **Dashboard** — `/admin/billing` reflects the paid → refunded transition.

Then repeat once with LIVE keys as the real gate before launch.

## Stripe removed

Stripe was fully removed on 2026-07-15 (`functions/src/stripe.ts` deleted, the
`stripe` dependency dropped, the client wired directly to
`createAirwallexPayment`). Airwallex is the only provider; there is no
`VITE_PAYMENT_PROVIDER` switch anymore.
