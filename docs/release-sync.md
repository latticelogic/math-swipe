# Keeping web, Google Play and the App Store in sync

The short version: **there is one app — the deployed web app at
mathchallenge.app.** Google Play ships it inside a Trusted Web Activity
(Chrome rendering the live site); the future iOS app will be the same thin
shell. So for almost every change, "keeping the channels in sync" is not a
process — it's automatic, because the stores distribute a *shell*, not the
app.

## What happens on a normal update (99% of changes)

Merge to `master` → CI deploys to Cloudflare Pages. Then:

| Channel | How the update arrives | Lag |
|---|---|---|
| Web (browser) | Next page load; open sessions get the service-worker "v1.x · tap to update" chip (Me tab) | Instant–minutes |
| Web (installed PWA) | Same service-worker prompt flow | Instant–minutes |
| Google Play (TWA) | Identical — the TWA renders the same deployed site with the same service worker | Instant–minutes |
| iOS (future shell) | Identical, provided the shell stays thin (renders the live site) | Instant–minutes |

No Play/App Store submission, no review, no version bump. Content, gameplay,
copy, paywall UX, bug fixes, new topics/tricks — all of it reaches every
channel from the one deploy.

## What DOES require a store release (the shell)

Only changes to the wrapper itself:

- `android/twa-manifest.json`: app name, icons, theme colors, `startUrl`,
  orientation, `features` (e.g. playBilling), min/target SDK
- Signing/assetlinks changes (new keys)
- Google's periodic **target-SDK mandates** (~yearly; Play Console nags with a
  deadline — budget one shell release per year for this alone)
- Play Billing **product/price** config (Play Console, not code)
- Store listing assets/copy (Console only, no build at all)

Shell release procedure: bump `versionCode` via the `android-build` workflow
input → upload the `.aab` to Play Console → staged rollout. The web channel is
untouched. (iOS analogue later: bump build number, submit for review.)

## Versioning policy

- **Web version** (`package.json` → the "v1.0.4" chip in Me) is the real app
  version and moves with every release.
- **Android `versionCode`** is an independent monotonic counter bumped ONLY on
  shell releases. Set `versionName` to the web version current at build time —
  it's a support-triage label ("which shell is this user on"), nothing more.
- Entitlements/accounts sync across channels by design (`source`-agnostic
  `paidAt` + sign-in reconcile), so version skew never affects ownership.

## Invariants that make this work (do-not-break list)

1. **Never fork features by channel.** The ONLY permitted divergence is the
   payment path (`src/utils/channel.ts` + `checkout.ts` routing: web→Airwallex,
   TWA→Play Billing, Apple→TBD), and it's pinned by tests. Everything else
   renders identically everywhere.
2. **Stable shell-facing URLs.** The shell depends on
   `/manifest.json`, `/.well-known/assetlinks.json`, and the `/?src=twa`
   start_url. Moving or renaming any of these silently breaks installed
   Android apps (URL bar appears, channel detection fails). Same will apply to
   Apple's `apple-app-site-association` later.
3. **The domain is the app's identity.** `mathchallenge.app` is baked into the
   TWA (host + assetlinks). A domain change is a migration project with a
   mandatory shell release, not a config tweak.
4. **Keep the web deploy backward-compatible with old shells.** An installed
   TWA from months ago must still work against today's site — which it will,
   as long as (2) holds and the Digital Goods sku (`pro_lifetime`) keeps
   existing.
5. **Payments live server-side.** Price/product changes on Play are Console
   config; on web they're the Airwallex callable. Neither requires a shell
   release, but they must be changed TOGETHER (both channels present the same
   $3.14 promise — CLAUDE.md monetization rules apply everywhere).

## Rollback

- **App problem** (bad deploy): roll back the Cloudflare Pages deployment.
  This instantly fixes **all channels at once** — including every installed
  Android/iOS app — because they all render the deployment.
- **Shell problem** (rare): halt the staged rollout in Play Console / release
  a fixed `.aab`. Old shells keep working against the live site meanwhile.

## The one real sync risk to watch

Web-side code that assumes a NEW shell capability (e.g. a future shell adds a
share-target or push delegation) must feature-detect, never version-check —
Play rollouts take days and users update shells slowly. Feature-detection is
already the house pattern (`getDigitalGoodsService` probe in checkout.ts);
keep it that way and the channels can't drift.
