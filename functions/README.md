# Math Swipe — Cloud Functions

Four functions across two concerns: push notifications and Stripe
checkout. All live in `src/`; deployed together via `firebase deploy
--only functions`.

**Push notifications** (`src/index.ts`):

- **`dailyReminder`** — runs once a day, sends a streak-reminder push to
  every user who opted in and hasn't played in 18+ hours.
- **`notifyBeaten`** — Firestore-triggered on `users/{uid}` updates; when
  someone improves their speedrun and bumps another user down, the bumped
  player gets a "you got beaten" push.

**Stripe checkout** (`src/stripe.ts`):

- **`createCheckoutSession`** — callable (HTTPS) the client invokes to
  get a Stripe Checkout URL for the $3.14 lifetime SKU. Authenticated
  via the Firebase ID token; uid is embedded in session metadata so
  the webhook knows which entitlement doc to write.
- **`stripeWebhook`** — raw HTTPS endpoint Stripe POSTs payment events
  to. Verifies signature, ignores everything except
  `checkout.session.completed`, then writes
  `paidAt`/`source='stripe'`/`originalTransactionId` to
  `entitlements/{uid}` idempotently.

## One-time setup

You'll need:

- The Firebase CLI (`npm i -g firebase-tools`)
- A Firebase project with **Cloud Functions enabled** (Blaze plan required)
- A Web Push **VAPID key pair**

### 1. Generate the VAPID key pair

```bash
cd functions
npx web-push generate-vapid-keys --json
```

Copy the `publicKey` and `privateKey` fields out.

### 2. Set the runtime config

```bash
cd functions   # if not already
firebase functions:config:set \
  vapid.public="<your_publicKey>" \
  vapid.private="<your_privateKey>" \
  vapid.subject="mailto:you@example.com"
```

(For 2nd-gen functions you may instead use `firebase functions:secrets:set` —
follow the CLI prompt.)

### 3. Wire the public key into the web app

In the **app root** `.env`:

```
VITE_VAPID_PUBLIC_KEY=<your_publicKey>
```

Without this, the Me-tab opt-in shows a "coming soon" hint and never asks
for permission. The web app and the Cloud Function MUST use the same key.

### 4. Install + deploy

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 5. Stripe secrets (for createCheckoutSession + stripeWebhook)

The two Stripe functions need four secrets, set via `firebase functions:secrets:set` (one prompt per command):

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY      # sk_live_… or sk_test_…
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET  # whsec_… from the dashboard
firebase functions:secrets:set STRIPE_PRICE_ID        # price_… for the $3.14 SKU
firebase functions:secrets:set PUBLIC_ORIGIN          # https://math-swipe-c7k.pages.dev
firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook
```

Register the webhook endpoint in the Stripe dashboard (or via CLI):

```bash
stripe webhook_endpoints create \
  --url=https://us-central1-math-swipe-prod.cloudfunctions.net/stripeWebhook \
  --enabled-events=checkout.session.completed
```

Copy the resulting `whsec_…` into `STRIPE_WEBHOOK_SECRET` above. The
full first-purchase QA flow is documented in `../docs/first-purchase-qa.md`.

## What gets created

After a successful deploy:

- 2 functions in your Firebase project
- A Pub/Sub schedule (auto-created by `onSchedule`) for the daily reminder
- A new Firestore collection `pushSubscriptions/{uid}` holding tokens + prefs
  (the web app writes these; this Cloud Function reads them)

## Local development

You can run the functions emulator while iterating:

```bash
cd functions
npm run build
firebase emulators:start --only functions,firestore
```

## Security rules

The companion Firestore rule for `pushSubscriptions/{uid}` is already in
the root `firestore.rules` file — owners can read/write their own row, and
the Cloud Function (which runs as admin) bypasses rules entirely.

## What's NOT included

- No analytics on push delivery rates
- No A/B testing of message copy
- No web push for desktop browsers behind enterprise VPNs (those tend to
  block the FCM endpoint)

If push fails with a `404 / 410` status, the Cloud Function automatically
deletes the stale subscription doc — users will need to re-opt-in if their
browser unsubscribes them silently (which Chrome does after long inactivity).
