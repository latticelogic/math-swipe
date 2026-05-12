# Pre-launch billing safety checklist

This is the runbook for the steps that have to happen *outside* the
codebase before any paid user touches the app. None of these are
optional — they're the downside-mitigation list from the monetization
decision memo (see `~/.claude/projects/.../memory/monetization_model.md`).

The principle: **the worst case is a runaway bill from a botnet or a
mis-tuned function loop while you're asleep.** Every item here exists
to put a hard ceiling on what that can cost.

## Status — fill this in as you complete each step

| # | Item | Done? | When | Notes |
|---|------|:-:|---|---|
| 1 | Firebase Blaze plan upgrade (required for Stripe webhook to work) | ☐ | | |
| 2 | Budget alert at $50/mo on `math-swipe-prod` | ☐ | | |
| 3 | Hard quota cap at $100/mo (App Engine + Functions) | ☐ | | |
| 4 | Second payment method on Cloud Billing | ☐ | | |
| 5 | Stripe account fully verified (identity + bank) | ☐ | | |
| 6 | Stripe Test mode flow exercised end-to-end with `4242 4242 4242 4242` | ☐ | | |
| 7 | Refund policy posted on the site footer or paywall ("14-day no-questions") | ☐ | | |
| 8 | Support email `help@latticelogic.app` configured + tested | ☐ | | |
| 9 | Beta with 5-10 friends, qualitative feedback on the trial UX warmth | ☐ | | |
| 10 | App Check enabled on Firestore (deters botnet-style abuse) | ☐ | | |

---

## Step-by-step

### 1. Upgrade Firebase to Blaze

Required because the Stripe webhook function makes outbound HTTPS calls
(Stripe API), which the free Spark plan blocks.

```
firebase login --account tim@latticelogic.app
firebase projects:list
# In the Firebase console, open math-swipe-prod settings → Usage and
# billing → Modify plan → Blaze pay-as-you-go. Card on file required.
```

There's no free-tier change — Blaze just adds the *option* to pay for
overages. You won't be charged anything unless you exceed the free
quotas (and items 2 + 3 below cap that risk).

### 2. Budget alert at $50/mo

In the Google Cloud Console (this is a billing console step, not Firebase):

1. Console → Billing → Budgets & alerts → Create budget
2. Scope: project `math-swipe-prod`
3. Amount: $50 USD/month
4. Thresholds: 50%, 90%, 100% — emails to `tim@latticelogic.app`
5. Save

You'll get an email the first time the project costs $25 in a month.
At current scale that means something is dramatically wrong — the
expected steady-state for the first 1000 users is ~$0.50/mo.

### 3. Hard quota cap at $100/mo

The budget alert is informational only — it doesn't *stop* spending.
For the hard ceiling, set per-resource quotas in Cloud Console → IAM
& admin → Quotas. Most impactful caps for this codebase:

- **Cloud Functions invocations**: cap at 100K/day
  (current usage: probably <1K/day; cap means runaway is bounded)
- **Firestore document reads**: cap at 1M/day
  (free tier is 50K/day; the cap leaves headroom for legitimate growth)
- **Firestore document writes**: cap at 200K/day
- **Outbound networking from Functions**: cap at 1GB/day

When a quota hits its cap the service returns 429 errors instead of
charging. Users see degraded behavior; you don't see a four-figure bill.

### 4. Second payment method

Cloud Console → Billing → Payment methods → Add a backup card. If the
primary card declines (expiration, fraud flag, bank glitch), the
project gets *suspended* — auth, Firestore, push, everything — and
you may not notice for hours. A second card prevents this.

Bonus: set Cloud Billing notifications to email you when a charge
fails on the primary, so you can rotate to the backup proactively.

### 5. Stripe account verification

Stripe holds funds for up to 21 days when an account isn't fully
verified. Get the verification done **before** the first sale so the
first $3.14 actually deposits into Lattice Logic's bank within 2-3
business days.

Required from the Stripe dashboard:
- Tax ID (EIN for Lattice Logic)
- Bank account for deposits
- Identity verification on the responsible person
- Public website URL (math-swipe-c7k.pages.dev for now)

### 6. Test the Checkout flow end-to-end

Before configuring live Stripe keys, exercise the entire flow in test
mode:

```
# Set test-mode secrets in Firebase
firebase functions:secrets:set STRIPE_SECRET_KEY  # sk_test_...
firebase functions:secrets:set STRIPE_PRICE_ID    # test-mode price id
firebase functions:secrets:set PUBLIC_ORIGIN      # https://math-swipe-c7k.pages.dev
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook
```

Register the webhook URL in the Stripe dashboard:
- Endpoints → Add endpoint → `https://us-central1-math-swipe-prod.cloudfunctions.net/stripeWebhook`
- Events to listen to: `checkout.session.completed`
- Copy the webhook signing secret (whsec_...) into:

```
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

Re-deploy after each secret rotation.

Test the flow: open the app, use the dev `mockBackdateTrial(14)` to
force the paywall, click "Unlock for $3.14", complete checkout with
`4242 4242 4242 4242` / any future date / any 3-digit CVC, verify:
- Redirect lands on `?paywall=ok&session_id=...`
- entitlement doc for your uid has `paidAt`, `source='stripe'`,
  `originalTransactionId=cs_test_...`
- Paywall closes
- Refreshing keeps the unlock state

Then switch the secrets to live keys and re-test with a real card
(small real charge — refund yourself afterward).

### 7. Refund policy

Either add a small footer link on the paywall component OR a
plain-text page at `/refunds`. The body:

> 14-day no-questions refunds. Email help@latticelogic.app with your
> Stripe receipt and we'll process within 24 hours.

Why visible: it shows up in chargeback disputes and Apple/Play store
review. "We have a stated refund policy and they didn't ask for one"
reads better to a bank than silence.

### 8. Support email

`help@latticelogic.app` should:
- Forward to a real inbox you check daily
- Auto-respond with "we'll get back to you within 24 hours"

Without this, the first refund request becomes a chargeback (cost: $15
in dispute fees) instead of a friendly reply (cost: $0).

### 9. Beta with 5-10 friends

Before any public launch, ship the trial flow to friends and ask:

1. Did you feel warned about the day-15 paywall before it appeared?
2. When you saw the paywall, did the tone feel fair or coercive?
3. Did you actually try to pay? (Doesn't matter if they don't —
   the *consideration* is the signal.)
4. Anything confusing or surprising about how the trial ended?

The dev-only `mockBackdateTrial` lets a beta tester jump to day 13 or
day 15 without waiting. Use that to accelerate the test, then have
them go through one real fresh-install run to see the natural pacing.

### 10. App Check (Firestore botnet protection)

App Check token-gates writes to Firestore so a script outside the app
can't pretend to be a user. Without it, someone could:
- Spin up anonymous accounts and burn your Firestore quota
- Spoof entitlements/{uid} writes (limited by existing rules, but
  belt-and-braces)

Setup in Firebase Console → App Check → Web → reCAPTCHA v3 provider.
Add the site key to `.env`:

```
VITE_RECAPTCHA_SITE_KEY=6Lc...
```

Then in `src/utils/firebase.ts`, after `initializeApp`:

```ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY!),
  isTokenAutoRefreshEnabled: true,
});
```

App Check is free and the only meaningful cost is the ~10kb SDK
addition to the bundle. Worth it.

---

## After launch

Once items 1-10 are checked, the day-1 launch checklist is:

- ☐ Switch Stripe secrets from test to live mode
- ☐ Verify webhook endpoint shows "Healthy" in Stripe dashboard
- ☐ Make one real $3.14 purchase yourself end-to-end; refund yourself
- ☐ Soft launch: do NOT push acquisition spend. Wait for first 50
  organic users + 2 weeks of clean data before any marketing push.
- ☐ Watch refund rate: >5% means the paywall is mis-tuned, pause and
  fix before scaling.
- ☐ Watch conversion rate: <0.1% means the value prop isn't landing,
  consider beta feedback loop before scaling.
