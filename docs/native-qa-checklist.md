# Native Android — device QA checklist

A single-pass manual QA script for the native Android shell (`android-native/`).
Testing capacity is the bottleneck, so every native release should be validated
in **one sitting** against this list rather than piecemeal.

The shell is a WebView loading the live PWA (`mathchallenge.app/?src=android-native`),
so the app always serves the latest web build — only the native binary (billing /
sign-in / push / splash / widget bridges) changes between versionCodes. A build
reaches the tester via the **Internal testing** track (CI auto-uploads there;
see `google-play-launch.md`).

## Before you start

1. Update **Math Challenge** on the **Internal testing** track to the target
   versionCode (CI logs print `committed versionCode NNNN to the internal track`).
2. Fully close and reopen the app.

## Native feel (Tier 1)

- [ ] **Splash** — fully close, reopen → chalkboard splash with the mark shows
      instantly (no white screen), then the app. No blank WebView between.
- [ ] **Offline** — airplane mode on → force-close → reopen → branded
      "You're offline / Try again" page. Network back on → **Try again** loads
      the app.
- [ ] **Edge-to-edge** — status/nav bars transparent over the chalkboard, icons
      legible, no content hidden behind the bars.
- [ ] **External links** — support email / off-site legal link opens in the
      browser or mail app (doesn't strand the WebView).

## Capabilities (Tier 2 / 3)

- [ ] **App Links** — a `https://mathchallenge.app/?r=<uid>` link tapped from
      another app opens **in the app** (an "open with" chooser the first time is
      fine; verified links skip it). App Links verify only for Play-installed
      builds, not sideloads.
- [ ] **Shortcut** — long-press the launcher icon → **Daily Challenge** → opens
      straight into today's Daily.
- [ ] **Widget** — add the Math Challenge widget (long-press home → Widgets).
      Shows **day streak + Today's Daily / Daily done**; tapping it opens the
      Daily. Play a session first so there's a streak to show.
- [ ] **Haptics** — with haptics on (Settings): crisp tick on a correct swipe,
      distinct double-buzz on a wrong one.
- [ ] **In-App Review / In-App Updates** — won't reliably fire in a single pass
      (review is Play-quota + ~45-day throttled; updates need a versionCode newer
      than the installed one). Nothing to force — just note if a rating card ever
      appears after a strong session.

## Regression — the shell changed, confirm these still work

- [ ] **Sign-in** — Google sign-in works; the account picker shows
      **auth.mathchallenge.app** (not `…firebaseapp.com`). If it errors, the
      app's signing SHA-1 likely needs adding to the Firebase Android app.
- [ ] **Billing** — purchase opens the Google Play sheet and completing it
      unlocks Pro; **no "Purchases aren't available."** Price ~$3.14 (or ~$3.99
      with FOREX currency conversion — expected, not a bug).
- [ ] **Push** — opt into daily reminders after a session → permission prompt →
      a test push arrives.
- [ ] **General** — a full session with no white screens and no crashes.

## Deferred native follow-ups (not yet built)

Tracked here so they aren't forgotten; neither blocks launch.

- **APK web-shell bundling (offline-first instant launch).** Bundle the built
  web app into the APK (e.g. `WebViewAssetLoader`) so the very first launch is
  instant and works fully offline before the service worker populates. Deferred:
  needs a CI-pipeline step to sync `dist/` into assets plus a real
  staleness-vs-live-site strategy, and a bad version can break the app. The
  splash + the PWA service-worker cache already deliver most of the perceived
  benefit.
- **Play Integrity (harden purchase → grant).** Mint a Play Integrity token
  natively and **verify it server-side** in the purchase-grant path. Deferred:
  value is entirely in the server-side verification + Play Console config; a
  client-only token adds no protection. App Check already covers the web path.
