# Math Challenge — Cloud Functions

Firebase Cloud Functions (v2). All live under `src/`; deployed together via
`firebase deploy --only functions --project math-swipe-prod --account tim@latticelogic.app`.

## Push notifications (`src/index.ts`)

- **`dailyReminder`** — scheduled; sends a soft streak reminder to opted-in
  users who haven't played in 18+ hours (timezone-aware, throttled).
- **`notifyBeaten`** — Firestore-triggered on `users/{uid}`; when someone
  beats another player's speedrun and bumps them down, the bumped player
  gets a "you got beaten" push (throttled to 1 per 30 min).

## Payments — web (`src/airwallex.ts`)

Airwallex is the sole web payment provider (Stripe was removed 2026-07-15).

- **`createAirwallexPayment`** — callable; auth via the Firebase ID token,
  embeds uid in metadata + merchant_order_id, returns a hosted payment URL.
- **`airwallexWebhook`** — raw HTTPS endpoint; verifies the HMAC signature
  (+ anti-replay timestamp), writes `paidAt`/`source='airwallex'` on a
  successful payment and clears `paidAt` on a refund (source-gated).

See `docs/airwallex.md` for the `TODO(airwallex)` go-live confirmations.

## Payments — Google Play (`src/playBilling.ts`)

- **`verifyPlayPurchase`** — callable; verifies the purchase token against the
  Android Publisher API, guards against cross-account token replay, grants
  with `source='google'`, and acknowledges the purchase (mandatory).
- **`playRtdn`** — Pub/Sub handler for Play Real-Time Developer Notifications;
  revokes `paidAt` on voided/refunded purchases (source-gated).

See the `TODO(play)` markers + `docs/google-play-launch.md` for the one-time
Play Console setup (service-account grant, product, RTDN topic).

## Other

- **`rebuildLeaderboardCache`** (`src/leaderboard.ts`) — 60s cron that
  pre-aggregates the top-20 score + top-10 speedrun cache docs the client
  reads instead of running N live user-doc listeners.
- **`claimReferral`** (`src/referral.ts`) — callable; records who invited a
  new player and bumps the referrer's server-verified referral count.
- **`reconcileAccount`** (`src/reconcile.ts`) — callable; merges an anonymous
  account's entitlement + stats into the account it signs into, proven by the
  source ID token (closes the sign-in data-loss / paywall-bypass hole).

## Secrets

Set via `firebase functions:secrets:set <NAME> --project math-swipe-prod`.
Airwallex: `AIRWALLEX_CLIENT_ID`, `AIRWALLEX_API_KEY`,
`AIRWALLEX_WEBHOOK_SECRET`, `PUBLIC_ORIGIN`. Push: VAPID keys (see
`.env.example`). Play Billing uses no secret — it runs as the project
service account once granted in Play Console.
