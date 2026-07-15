# First-purchase QA — Airwallex

Run this the first time the Airwallex payment path is wired, **sandbox first,
then live**. It's the go/no-go gate before you let a real user pay. Setup is in
`docs/airwallex.md`; this is the test script.

## 0. Preconditions

- [ ] Airwallex Payment Acceptance **activated** (KYB approved).
- [ ] Secrets set: `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`,
      `AIRWALLEX_WEBHOOK_SECRET`, `PUBLIC_ORIGIN`.
- [ ] Functions deployed **and** `createAirwallexPayment` + `airwallexWebhook`
      have the **public invoker** (DRS exception done — see docs/billing-safety.md).
- [ ] Webhook registered in Airwallex → `.../airwallexWebhook`, subscribed to
      payment-success + refund events.
- [ ] `VITE_PAYMENT_PROVIDER=airwallex` set on Pages; PR #62 merged + deployed.
- [ ] The four `TODO(airwallex)` items in `functions/src/airwallex.ts` confirmed
      against Airwallex's live API reference.

## 1. Sandbox pass (no real money)

Point `AIRWALLEX_BASE` at `https://api-demo.airwallex.com` and use sandbox keys.

1. **Force an expired trial.** Easiest: a throwaway account whose `entitlements/{uid}`
   has an old `trialStartedAt` (or use the dev `mockBackdateTrial`). Confirm the
   paywall fires after one non-daily problem.
2. **Click "Keep playing" / unlock.** Expect a redirect to the Airwallex hosted
   payment page (from `createAirwallexPayment` → `{ url }`).
3. **Pay with an Airwallex test card.** Expect a redirect back to `/?paywall=ok`.
4. **Verify the grant.** In Firestore, `entitlements/{uid}` should now have:
   - `paidAt` = a recent timestamp,
   - `source: 'airwallex'`,
   - `originalTransactionId` = the payment id.
   The paywall should be gone and every paid surface unlocked on reload.
5. **Verify the webhook actually did it** (not a client shortcut): check the
   `airwallexWebhook` logs for the success event + `granted lifetime access`.
6. **Refund test.** Refund the sandbox payment in the Airwallex dashboard. The
   webhook should fire → `paidAt` cleared (back to null) while `source` +
   `originalTransactionId` remain. The user reverts to expired; the
   `/admin/billing` dashboard shows it as a refund (paidAt null + txn id set).

Failure modes to watch:
- Redirect never returns → check `return_url` / `PUBLIC_ORIGIN`.
- `paidAt` never set → webhook signature failing (check `AIRWALLEX_WEBHOOK_SECRET`
  + the signature scheme) OR the event name doesn't match (see the TODO).
- `no uid` in logs → metadata/`merchant_order_id` not propagating; confirm the
  payment-create call includes `metadata: { uid }`.

## 2. Live pass (real $3.14)

Switch `AIRWALLEX_BASE` back to `https://api.airwallex.com` + live keys, redeploy.

1. Repeat steps 1–5 with a **real card** and a real $3.14 charge on a fresh account.
2. Confirm the money shows in the Airwallex dashboard and the entitlement flips.
3. **Refund yourself** and confirm the revoke path works end-to-end on live.
4. Confirm the receipt shows **"LATTICE LOGIC PTE. LTD."** (the trading name).

## 3. Sign-off

- [ ] Sandbox purchase + refund both verified via the webhook.
- [ ] Live purchase + refund both verified.
- [ ] `/admin/billing` reflects the purchase (and the refund in the refund gauge).
- [ ] Only then: announce / open the paywall to real users.

> If you ever switch back to Stripe, `docs/first-purchase-qa.md` is the Stripe
> version of this script and `VITE_PAYMENT_PROVIDER=stripe` flips the client.
