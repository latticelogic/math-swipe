# Pre-launch billing safety checklist (CLI-first)

This is the runbook for what has to happen *outside* the codebase
before any paid user touches the app. None of these are optional —
they're the downside-mitigation list from the monetization decision
memo (see `~/.claude/projects/.../memory/monetization_model.md`).

**Per the project conventions in CLAUDE.md, every step uses the CLI
where possible.** A handful of steps genuinely require the web
console (Blaze plan upgrades, KYC verification, payment method
entry) — those are called out explicitly and are the *only*
exceptions.

The principle: **the worst case is a runaway bill from a botnet or a
mis-tuned function loop while you're asleep.** Every item here exists
to put a hard ceiling on what that can cost.

## Status — fill this in as you complete each step

| # | Item | Done? | When | Notes |
|---|------|:-:|---|---|
| 1 | Firebase Blaze plan upgrade | ✅ | 2026-05-12 | `math-swipe-prod` is on Blaze (confirmed via console badge) |
| 2 | Budget alert at $50/mo on `math-swipe-prod` | ☐ | | gcloud |
| 3 | Hard quota caps on Functions + Firestore | ☐ | | gcloud |
| 4 | Second payment method on Cloud Billing | ☐ | | **web only** |
| 5 | Stripe account verified (identity + bank) | ☐ | | **web only** |
| 6 | Stripe Test mode flow exercised end-to-end | ☐ | | stripe CLI + firebase CLI |
| 7 | Refund policy visible in app | ✅ | 2026-05-12 | `LegalFooterRow` renders Refund / Privacy / Terms in Paywall + Me tab footer (PR #44, #46) |
| 8 | `help@latticelogic.app` support inbox tested | ☐ | | mail provider |
| 9 | Beta with 5-10 friends on the trial UX | ☐ | | human |
| 10 | App Check enabled on Firestore | ☐ | | firebase CLI |

---

## Prerequisites

You'll need three CLIs authenticated as `tim@latticelogic.app`:

```bash
gcloud auth login tim@latticelogic.app
gcloud config set project math-swipe-prod

firebase login --reauth          # if needed
firebase use math-swipe-prod --account tim@latticelogic.app

# Stripe CLI for step 6 — installs via winget/scoop on Windows
winget install stripe.stripe-cli
stripe login                      # opens browser once for OAuth
```

---

## 1. Upgrade Firebase to Blaze plan — ✅ DONE 2026-05-12

`math-swipe-prod` is on the Blaze plan (confirmed via the "Blaze plan"
badge in the Firebase console project header).

Background, kept for future fork reference: Blaze is required because
Cloud Functions making outbound HTTPS calls (eg the Stripe webhook to
api.stripe.com) are blocked on the free Spark plan. Plan changes have
to go through the Firebase console — Google gates billing changes on
human consent. There is no CLI command for this step. URL for
reference if the plan ever needs re-confirming:
https://console.firebase.google.com/project/math-swipe-prod/usage/details

No free-tier change — Blaze just adds the *option* to pay for
overages. You won't be charged anything until you exceed free quotas,
and items 2 + 3 below cap that risk.

## 2. Budget alert at $50/mo — via gcloud

```bash
# First find your billing account id
gcloud billing accounts list

# Then create the budget — replace 0X0X0X-0X0X0X-0X0X0X with the id above
gcloud billing budgets create \
  --billing-account=0X0X0X-0X0X0X-0X0X0X \
  --display-name="math-swipe-prod monthly cap alert" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100 \
  --filter-projects=projects/math-swipe-prod \
  --notifications-rule-monitoring-notification-channels=$(gcloud alpha monitoring channels list --filter="type=email AND labels.email_address=tim@latticelogic.app" --format="value(name)")
```

You'll get an email when the project hits 50%, 90%, and 100% of $50
in any calendar month. At current scale that means something is
dramatically wrong — the expected steady-state for the first 1000
users is well under $0.50/mo.

If `gcloud alpha monitoring channels list` returns empty, create the
email notification channel first:

```bash
gcloud alpha monitoring channels create \
  --display-name="Tim email" \
  --type=email \
  --channel-labels=email_address=tim@latticelogic.app
```

## 3. Hard quota caps — via gcloud

The budget alert is informational only — it doesn't *stop* spending.
For the hard ceiling, set per-service quotas. The most expensive
runaway risks for this codebase are Functions invocations and
Firestore reads.

```bash
# Cap Cloud Functions invocations at 100K/day across the project
gcloud alpha services quota update \
  --service=cloudfunctions.googleapis.com \
  --consumer=projects/math-swipe-prod \
  --metric=cloudfunctions.googleapis.com/function_invocations \
  --unit=1/d/{project} \
  --value=100000

# Cap Firestore reads at 1M/day (free tier is 50K/day; cap leaves
# 20× headroom while bounding worst-case)
gcloud alpha services quota update \
  --service=firestore.googleapis.com \
  --consumer=projects/math-swipe-prod \
  --metric=firestore.googleapis.com/document_read_count \
  --unit=1/d/{project} \
  --value=1000000

# Cap Firestore writes at 200K/day
gcloud alpha services quota update \
  --service=firestore.googleapis.com \
  --consumer=projects/math-swipe-prod \
  --metric=firestore.googleapis.com/document_write_count \
  --unit=1/d/{project} \
  --value=200000
```

When a quota hits its cap the service returns 429 errors instead of
charging. Users see degraded behavior; you don't see a four-figure bill.

If `gcloud alpha services quota update` is unavailable in your CLI
version, the same operation is exposed as a REST PATCH to
`serviceusage.googleapis.com/v1beta1/{name}/consumerQuotaMetrics/.../limits/.../adminOverrides`
— more annoying to wire by hand, easier to just `gcloud components update`
to get the alpha surface.

## 4. Second payment method — *web only, PCI prevents CLI entry*

Google won't accept raw card numbers over the CLI for PCI compliance.
But you *can* set the priority of existing methods via CLI:

```bash
gcloud billing accounts describe 0X0X0X-0X0X0X-0X0X0X
```

Adding the second card itself: open
https://console.cloud.google.com/billing/0X0X0X-0X0X0X-0X0X0X/payment
→ Add a backup card.

Bonus: set Cloud Billing failure notifications via CLI:

```bash
gcloud alpha monitoring channels create \
  --display-name="Billing payment failure" \
  --type=email \
  --channel-labels=email_address=tim@latticelogic.app
```

## 5. Stripe account verification — *web only, KYC*

Bank verification, tax ID submission, and identity checks require
the Stripe dashboard — these are regulator-mandated and not on the
Stripe CLI surface. Open https://dashboard.stripe.com/account and
work through the verification banner at the top.

You can *check status* via CLI:

```bash
stripe accounts retrieve
# Look for `charges_enabled: true` and `payouts_enabled: true`
```

Stripe holds funds for up to 21 days when an account isn't fully
verified. Get this done **before** the first sale.

## 6. Test the Checkout flow end-to-end — via stripe + firebase CLIs

Before configuring live keys, exercise the entire flow in Stripe
test mode.

```bash
# (a) Set test-mode secrets in Firebase. The CLI accepts piped input;
# get the test-mode keys from https://dashboard.stripe.com/test/apikeys
echo "sk_test_..." | firebase functions:secrets:set STRIPE_SECRET_KEY --data-file -

# (b) Create the test-mode price for the $3.14 lifetime SKU
stripe prices create \
  --unit-amount=314 \
  --currency=usd \
  --product-data[name]="Math Swipe — Lifetime Unlock"
# Copy the returned price id (price_test_...) into the next secret:
echo "price_test_..." | firebase functions:secrets:set STRIPE_PRICE_ID --data-file -

echo "https://math-swipe-c7k.pages.dev" | firebase functions:secrets:set PUBLIC_ORIGIN --data-file -

# (c) Deploy the functions so the new secrets land in the runtime env
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook \
  --account tim@latticelogic.app

# (d) Register the webhook URL with Stripe via CLI. Production webhook:
stripe webhook_endpoints create \
  --url=https://us-central1-math-swipe-prod.cloudfunctions.net/stripeWebhook \
  --enabled-events=checkout.session.completed
# Copy the returned signing secret (whsec_test_...) into:
echo "whsec_test_..." | firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --data-file -

# (e) Redeploy so the new webhook secret is live
firebase deploy --only functions:stripeWebhook --account tim@latticelogic.app

# (f) Forward webhook events to your dev machine and watch the logs.
# In one terminal:
stripe listen --forward-to=https://us-central1-math-swipe-prod.cloudfunctions.net/stripeWebhook \
  --print-secret
# This prints whsec_... for your local-listen tunnel (different from
# the production webhook secret above). Useful if you want to test
# against a local function emulator.

# In another terminal:
firebase functions:log --account tim@latticelogic.app
```

Then in the app:
1. Use `mockBackdateTrial(14)` (DEV button on the paywall) to force
   the gate.
2. Click "Unlock for $3.14".
3. In Stripe Checkout, pay with `4242 4242 4242 4242`, any future
   expiry, any 3-digit CVC.
4. You land on `?paywall=ok&session_id=cs_test_...`.
5. Verify the write:

```bash
# Get your uid from the app's localStorage or Firebase Auth console,
# then check entitlements via CLI:
gcloud firestore documents read \
  "projects/math-swipe-prod/databases/(default)/documents/entitlements/<YOUR_UID>"
```

Should show `paidAt`, `source: 'stripe'`, `originalTransactionId: cs_test_...`.

When all green, swap test keys for live keys:

```bash
echo "sk_live_..." | firebase functions:secrets:set STRIPE_SECRET_KEY --data-file -
echo "price_..." | firebase functions:secrets:set STRIPE_PRICE_ID --data-file -
echo "whsec_..." | firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --data-file -
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook \
  --account tim@latticelogic.app
```

Re-test in live mode with a real card on yourself; refund yourself
via `stripe refunds create --charge=ch_...` afterward.

## 7. Refund policy visible in app — ✅ DONE 2026-05-12

`LegalFooterRow` renders **Refund · Privacy · Terms** in two places:
the Paywall footer (the moment of payment) and the Me-tab footer
(always-discoverable). Component at `src/components/LegalPages.tsx`.

The Refund page (`/refund`) currently displays a 14-day no-questions
refund commitment routed to `help@latticelogic.app`. Body is a DRAFT
under the yellow banner — replace with lawyer-reviewed copy before
launch (see "Lawyer-reviewed legal copy" in CLAUDE.md's pre-launch
state section).

Why this matters in payment-processing terms: a stated refund policy
visible to the customer reduces chargeback rates and helps in Stripe
dispute resolution. \"We have a stated policy and they didn't ask for
a refund\" reads materially better than silence when a bank reviews
the case.

## 8. Support email `help@latticelogic.app` — mail provider CLI

Lattice Logic uses Google Workspace per CLAUDE.md. Add the alias via
`gcloud` if you've enabled the Workspace Admin SDK, otherwise
through the Workspace admin console. Quickest path:

```bash
# Check current aliases on tim@latticelogic.app
gcloud admin users get tim@latticelogic.app --format="value(aliases)" 2>/dev/null \
  || echo "Use admin.google.com → Users → tim → Aliases → Add help@"
```

Test the inbox after creation:

```bash
echo "Hello from CLI" | mail -s "Test" help@latticelogic.app
# (or send via your usual mail client)
```

Without this, the first refund request becomes a chargeback (cost: $15
in dispute fees) instead of a friendly reply (cost: $0).

## 9. Beta with 5-10 friends

This is a human step — no CLI for "ask your friends to use the app".

The dev-only `mockBackdateTrial` lets a beta tester jump to day 13 or
day 15 without waiting. Use that to accelerate the test, then have
them go through one real fresh-install run to see the natural pacing.

Things to ask after they've tested:
1. Did you feel warned about the day-15 paywall before it appeared?
2. When you saw the paywall, did the tone feel fair or coercive?
3. Did you actually try to pay? (The *consideration* is the signal.)
4. Anything confusing or surprising about how the trial ended?

## 10. App Check on Firestore — via firebase CLI

App Check token-gates writes to Firestore so a script outside the
app can't pretend to be a user. Without it, someone could spin up
anonymous accounts and burn your Firestore quota.

```bash
# Enable the reCAPTCHA v3 provider
firebase apps:list --account tim@latticelogic.app
# Get the WEB app id (looks like 1:NNN:web:hash)

firebase appcheck:apps:register WEB \
  --app-id=1:NNN:web:hash \
  --account tim@latticelogic.app

# Get the site key for client wiring
firebase appcheck:apps:get \
  --app-id=1:NNN:web:hash \
  --account tim@latticelogic.app
```

Add the site key to `.env`:

```bash
echo "VITE_RECAPTCHA_SITE_KEY=6Lc..." >> .env
```

Then in `src/utils/firebase.ts`, after `initializeApp`:

```ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY!),
  isTokenAutoRefreshEnabled: true,
});
```

Toggle enforcement on per-service basis (start in monitoring mode,
then flip to enforced after a week of clean logs):

```bash
firebase appcheck:enforcement:enable firestore \
  --account tim@latticelogic.app
```

---

## After launch — CLI-friendly health checks

Once items 1-10 are checked and live keys are in place:

```bash
# Verify webhook is healthy
stripe webhook_endpoints list

# Sanity-check the function is receiving traffic
firebase functions:log --only stripeWebhook --account tim@latticelogic.app

# Watch for refund-rate spikes (any > 5% = paywall mistuned)
stripe charges list --limit=100 --created.gte=$(date -d '7 days ago' +%s) \
  | jq '[.data[] | select(.refunded)] | length'

# Watch entitlement write rate (sanity check the conversion rate)
gcloud firestore documents list \
  "projects/math-swipe-prod/databases/(default)/documents/entitlements" \
  --filter="fields.paidAt:*" --limit=100
```

Soft-launch posture:
- ☐ Switch Stripe secrets from test to live mode (commands above)
- ☐ Verify `stripe webhook_endpoints list` shows "enabled"
- ☐ Make one real $3.14 purchase yourself end-to-end; `stripe refunds create` afterward
- ☐ Do NOT push acquisition spend. Wait for first 50 organic users +
   2 weeks of clean data before any marketing push.
- ☐ Watch refund rate: >5% means the paywall is mis-tuned, pause and fix
- ☐ Watch conversion rate: <0.1% means the value prop isn't landing
