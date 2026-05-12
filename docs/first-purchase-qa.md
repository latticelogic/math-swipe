# First real $3.14 purchase — QA playbook

A 30-minute end-to-end test for the **first paid user on the system**.
Run this AFTER you've completed the operational steps in
[`docs/billing-safety.md`](billing-safety.md) and have live Stripe
keys deployed.

The goal is not just "did the purchase work" — it's to verify that
every adjacent system (entitlement write, webhook idempotency, paywall
auto-close, refund handling, dashboard rendering) works against real
money. Test-mode coverage is in `docs/paywall-e2e.md`; THIS doc is
the live-keys gate.

## Why this is a separate doc from billing-safety.md

`docs/billing-safety.md` is the *setup* runbook — what to configure
before any user touches the app. This is the *first-purchase smoke
test* — what to verify the very first time real money flows. Both
need to pass; they cover different surface area.

---

## Prerequisites — ALL must be done before starting

- [ ] Live Stripe secret keys set via `firebase functions:secrets:set`:
      `STRIPE_SECRET_KEY` (sk_live_…), `STRIPE_WEBHOOK_SECRET` (whsec_…),
      `STRIPE_PRICE_ID` (the live $3.14 price), `PUBLIC_ORIGIN`
- [ ] Webhook endpoint registered in Stripe (live mode) pointing to
      `https://us-central1-math-swipe-prod.cloudfunctions.net/stripeWebhook`
      listening for **both** `checkout.session.completed` AND
      `charge.refunded`
- [ ] Stripe account verification COMPLETE (charges_enabled = true,
      payouts_enabled = true — check with `stripe accounts retrieve`)
- [ ] You have a real payment method ready (your own card; refund
      yourself afterward)
- [ ] Your Firebase Auth user has the `isAdmin` custom claim so you can
      check `/admin/billing` afterward (set via `firebase auth:set-custom-user-claims`)
- [ ] You've notified yourself it's safe to charge — small chance of a
      bug means a real charge that needs manual unwinding

## Section 1 — Force trial expiry for your test account

The fastest path: directly write to Firestore via gcloud as the
admin SDK. Your client account's trial isn't normally expired, so
backdate manually.

```bash
# Get your uid (the one you'll buy from) — easiest from the app's
# DevTools localStorage: math-swipe-displayName lookup, or Firebase
# console → Authentication.
export TEST_UID="abc123…"

# Backdate trial 15 days so paywall fires
gcloud firestore documents update \
  "projects/math-swipe-prod/databases/(default)/documents/entitlements/${TEST_UID}" \
  --update-mask=trialStartedAt,paidAt,source,originalTransactionId,updatedAt \
  --json-data='{
    "trialStartedAt": {"integerValue": "'$(($(date +%s%3N) - 15 * 86400000))'"},
    "paidAt": {"nullValue": null},
    "source": {"nullValue": null},
    "originalTransactionId": {"nullValue": null},
    "updatedAt": {"timestampValue": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }'
```

Verify the write:

```bash
gcloud firestore documents read \
  "projects/math-swipe-prod/databases/(default)/documents/entitlements/${TEST_UID}"
```

Should show `paidAt: NULL_VALUE` and `trialStartedAt` ~15 days ago.

## Section 2 — Reach the paywall

- [ ] Open the production app at https://math-swipe-c7k.pages.dev in a
      private browser window
- [ ] Sign in with the same account whose uid you just backdated (Google
      or email-link — anonymous won't carry the entitlement across the
      private window)
- [ ] Open the Me tab — countdown chip should be GONE (status is now expired)
- [ ] Navigate back to Let's Go — tap any non-daily topic
- [ ] Answer ONE problem
- [ ] Paywall fires immediately after the answer animation completes
- [ ] Paywall shows your real stats (totalSolved, bestStreak, etc.)
- [ ] Headline: "Two weeks of Math Swipe"
- [ ] CTA button: "Keep playing"
- [ ] Legal footer: Refund · Privacy · Terms

## Section 3 — Make the purchase

- [ ] Tap "Keep playing"
- [ ] Button changes to "Just a sec…" briefly
- [ ] Browser redirects to Stripe Checkout (checkout.stripe.com)
- [ ] Verify the line item shows the live price ($3.14)
- [ ] Enter your real card details
- [ ] Submit
- [ ] Stripe confirmation page briefly appears
- [ ] App redirects back to `?paywall=ok&session_id=cs_live_…`
- [ ] URL query params get stripped (history.replaceState)
- [ ] Paywall closes automatically within ~1 second

## Section 4 — Verify entitlement state

Open a separate terminal:

```bash
# Should now show paidAt set, source='stripe', originalTransactionId=cs_live_...
gcloud firestore documents read \
  "projects/math-swipe-prod/databases/(default)/documents/entitlements/${TEST_UID}"

# Cross-check the Stripe side
stripe checkout_sessions retrieve cs_live_xxxxx
```

- [ ] `paidAt` is set (timestamp within last ~30 seconds)
- [ ] `source` = "stripe"
- [ ] `originalTransactionId` = the Stripe checkout session id
- [ ] Stripe-side `payment_status` = "paid"
- [ ] Webhook delivery log in Stripe dashboard shows "succeeded"

## Section 5 — Verify dashboard

- [ ] Navigate to `/admin/billing` in the app
- [ ] Dashboard renders (your isAdmin claim works)
- [ ] "Paid" counter shows 1 (you)
- [ ] Conversion rate is non-`—` (calculated against trial+expired+refunded)
- [ ] Recent Purchases table shows your row with current timestamp, source=stripe, partial transaction id

## Section 6 — Test idempotency

Manually trigger a webhook re-delivery to confirm the handler is idempotent:

```bash
# Find the event id from Stripe dashboard (or via CLI)
stripe events list --limit 5 --types checkout.session.completed

# Re-deliver
stripe events resend evt_xxxxx
```

- [ ] Webhook handler logs (`firebase functions:log --only stripeWebhook --account tim@latticelogic.app`)
      show "already paid, skipping" on the redelivery
- [ ] Firestore doc's `updatedAt` did NOT change (the merge:true write
      was short-circuited because paidAt already set)
- [ ] No duplicate charge on the Stripe side (verify in dashboard)

## Section 7 — Verify "Maybe later" doesn't double-charge

- [ ] In an incognito window, sign in as a SECOND test account (different uid)
- [ ] Backdate its trial 15 days (same gcloud command, different TEST_UID)
- [ ] Reach paywall, tap "Keep playing"
- [ ] On Stripe Checkout, click the X / browser back button to cancel
- [ ] Verify redirect to `?paywall=cancelled` (NOT `?paywall=ok`)
- [ ] Entitlement doc still shows `paidAt: null` (no charge, no entitlement)
- [ ] Paywall is still open in the app

## Section 8 — Test refund flow

Refund the test purchase via CLI:

```bash
# Find your charge id
stripe charges list --limit 1 --customer cus_xxxxx  # or by session id
# Or: stripe checkout_sessions retrieve cs_live_xxxxx → look up payment_intent

stripe refunds create --payment-intent pi_xxxxx
```

The `charge.refunded` event triggers `stripeWebhook` in
`functions/src/stripe.ts`, which clears `paidAt` automatically. After
the refund:

- [ ] Stripe dashboard shows the refund went through
- [ ] Firebase Functions log shows
      `[stripeWebhook] revoked access for <uid> (charge ... refunded $3.14)`
- [ ] Entitlement doc in Firestore: `paidAt` is now `null`,
      `originalTransactionId` and `source: 'stripe'` are preserved
      (audit trail — these are what the admin dashboard reads to detect
      the row as a refunded purchase rather than a never-paid trial)
- [ ] Refresh the app — paywall fires again on the next non-daily
      problem since `entitlement.status` is now back to `'expired'`
- [ ] `/admin/billing` refund-rate gauge increments (the row matches
      `paidAt === null && originalTransactionId !== null`)

Verify idempotency by re-delivering the same refund event:

```bash
# Find the event id
stripe events list --limit 5 --types charge.refunded

# Re-deliver
stripe events resend evt_xxxxx
```

- [ ] Functions log shows `refund for <uid> but already cleared`
- [ ] No duplicate Firestore writes — `updatedAt` doesn't change on the
      redelivery (the short-circuit fires)

## Section 9 — Cleanup

- [ ] Refund your own real $3.14 charge (you did this in Section 8 — verify
      Stripe shows "refunded" not "succeeded")
- [ ] `paidAt` is automatically cleared by the `charge.refunded` webhook —
      no manual action needed (was a manual step in earlier doc versions
      before the handler shipped)
- [ ] Restore your trial state to active if you want to keep playing:

```bash
gcloud firestore documents update \
  "projects/math-swipe-prod/databases/(default)/documents/entitlements/${TEST_UID}" \
  --update-mask=trialStartedAt,paidAt,source,originalTransactionId,updatedAt \
  --json-data='{
    "trialStartedAt": {"integerValue": "'$(date +%s%3N)'"},
    "paidAt": {"nullValue": null},
    "source": {"nullValue": null},
    "originalTransactionId": {"nullValue": null},
    "updatedAt": {"timestampValue": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }'
```

## Section 10 — If anything failed

Each failure mode has a different recovery path:

| Symptom | Likely cause | Fix |
|---|---|---|
| Stripe Checkout 404 | Webhook URL wrong or Functions not deployed | Re-run `firebase deploy --only functions:createCheckoutSession` |
| Redirect lands on `?paywall=cancelled` after paying | Checkout completed but Stripe's success URL wasn't built | Check `success_url` in `functions/src/stripe.ts:88` is using the right origin |
| Webhook signature failure | `STRIPE_WEBHOOK_SECRET` doesn't match the registered endpoint | Re-register webhook, copy the new whsec_…, redeploy |
| `paidAt` never written to Firestore | Webhook didn't fire, OR fired but uid metadata missing | Check Stripe webhook delivery log; if delivered but failed, check Functions logs |
| Paywall doesn't close after `?paywall=ok` | `entitlement.refresh()` not called or failed | Check console errors; manual workaround is to refresh the page |
| `/admin/billing` empty | Either no entitlements exist, or isAdmin claim missing | Check token: `firebase auth:get-token`; check claim: console → user → custom claims |

If a failure is in production (real users seeing it), the priorities are:
1. **Disable the paywall trigger** — push a one-line edit setting `shouldFirePaywall` to always return `false`. Stops new users from hitting a broken flow.
2. **Investigate at leisure** with the trigger off
3. **Re-enable** once root cause is fixed

---

## Sign-off

When all sections pass:

```
[ ] First-purchase QA — PASSED on YYYY-MM-DD by <name>
    Live Stripe price id: price_xxxx
    Webhook endpoint: ...
    Refund flow: automatic via charge.refunded webhook handler
```

Add this checkbox to the project's launch tracker.
