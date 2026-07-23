# android-native/ — native WebView + Play Billing 8 shell

Replaces the Bubblewrap TWA (`../android/`). Full rationale + design:
[`../docs/native-android-plan.md`](../docs/native-android-plan.md).

Why: the TWA's `android-browser-helper`/Digital-Goods dependency blocks Play
Billing Library 8 (upstream pinned at 7.1.1) and gates purchasing on the device
Chrome version. This project calls `com.android.billingclient:8` **directly** —
no dependency, no Chrome gate, PBL 8 today. The web UI stays one codebase (the
shell just loads `mathchallenge.app`); only billing goes native.

## Status: SCAFFOLD IN PROGRESS (2026-07-23)

**Done (this slice):**
- Gradle config: `settings.gradle`, `build.gradle`, `gradle.properties`,
  `app/build.gradle` (compile/target SDK 36, minSdk 24, BillingClient 8,
  androidx.webkit, firebase-messaging, env-based release signing).
- `AndroidManifest.xml` (INTERNET / POST_NOTIFICATIONS / BILLING, MainActivity,
  PushService, FCM channel).
- `MainActivity.kt` — full-screen WebView loading `?src=android-native`,
  service-worker/offline config, in-scope nav kept in-app + external links to
  Chrome, back-button, wires the billing bridge.
- `BillingBridge.kt` — `window.AndroidBilling` (isReady/buy/restore) over
  BillingClient 8; results via `window.__mcOnPurchase` / `__mcOnPurchaseError`;
  **no client-side acknowledge** (server acks via verifyPlayPurchase).
- Web side already merged (#170): `checkout.ts` `'android-native'` channel +
  bridge routing → existing `verifyPlayPurchase` (`source:'google'`).

**Remaining to first green CI build:**
- `PushService.kt` — native FCM: register token into `pushSubscriptions`
  (reuse existing server send-logic + throttles), display daily reminders.
- Resources: `res/values/themes.xml` + `strings.xml`, `res/mipmap` launcher
  icons (reuse `store-assets/icon-512-play.png` source), splash `#1b1b1b`.
- `google-services.json` — written by CI from a secret (FCM).
- `.github/workflows/android-native-build.yml` — Gradle `.aab`, monotonic
  versionCode (run_number), keyless WIF upload to the internal track (reuse the
  `play-publisher` SA); no committed Gradle wrapper (CI provisions Gradle).
- Validate PBL-8 API signatures against the compiler (esp.
  `queryProductDetailsAsync` result shape — see note in `BillingBridge.kt`).

**Then:** device QA (WebView runs the PWA: play/sounds/offline/back) + the
purchase→verify→entitlement→refund→revoke loop the TWA never confirmed → switch
production to native, retire the TWA. Package id stays `app.mathchallenge.twa`
(same Play app; must sign with the current app-signing key so Play accepts the
update).
