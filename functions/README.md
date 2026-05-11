# Math Swipe — Cloud Functions

Two scheduled / triggered functions that push notifications to subscribed
users:

- **`dailyReminder`** — runs once a day, sends a streak-reminder push to
  every user who opted in and hasn't played in 18+ hours.
- **`notifyBeaten`** — Firestore-triggered on `users/{uid}` updates; when
  someone improves their speedrun and bumps another user down, the bumped
  player gets a "you got beaten" push.

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
