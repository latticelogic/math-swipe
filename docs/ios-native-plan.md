# iOS native shell — architecture + launch checklist

Built 2026-07-23/24 (autonomously, ahead of Apple enrollment clearing — the
org enrollment is submitted, ID 325P468S9U). The sibling of `android-native/`:
**one web codebase** (mathchallenge.app) rendered in a WKWebView, with native
code only for what a WebView cannot do on iOS. Nothing here blocks web/Android;
all web-side iOS paths are inert until the shell's bridges exist.

## Architecture (mirrors Android 1:1)

| Piece | iOS | Android equivalent |
|---|---|---|
| Shell | `WKWebView` → `https://mathchallenge.app/?src=ios-native` | WebView + `?src=android-native` |
| Payments | **StoreKit 2** (`BillingBridge.swift`) → signed-transaction JWS → `verifyAppleTransaction` callable verifies Apple's x5c chain server-side → grant `source:'apple'` → client `finish()`es ONLY after grant (unfinished = re-delivered = retried, the "no client ack" principle) | BillingClient 8 → `verifyPlayPurchase` (server acks) |
| Sign-in | **Sign in with Apple** (`AuthBridge.swift`, ASAuthorization + Firebase nonce pattern) → `__mcOnAppleToken(idToken, rawNonce)` → web `OAuthProvider('apple.com').credential` | Credential Manager Google → `__mcOnGoogleToken` |
| Push | Native **FCM over APNs** (`AppDelegate` + `ApplePush` shim; same `pushSubscriptions` doc + server send path) | Native FCM (`PushBridge.kt`) |
| Haptics | `UIFeedbackGenerator` (`HapticsBridge.swift`) | `VibrationEffect` |
| Bridge transport | `WKUserScript` shim (`BridgeScript.swift`) defines `window.AppleBilling/AppleAuth/ApplePush/AppleHaptics/AppleShell` over `webkit.messageHandlers`; native replies via the **same `__mcOn*` globals as Android**, so checkout.ts/useFirebaseAuth.ts await-logic is shared verbatim. Synchronous reads (`isReady`, `getFcmToken`) come from a native-maintained `window.__mcIOS` state blob. | `addJavascriptInterface` |
| Splash | `LaunchScreen.storyboard` chalkboard (#1b1b1b), no white flash | SplashScreen API |
| Offline | `didFailProvisionalNavigation` → bundled `offline.html` (retry via `AppleShell.reload`) | `onReceivedError` → offline.html |
| External links | non-app hosts + `mailto:`/`tel:` → `UIApplication.open` | `shouldOverrideUrlLoading` |
| Project | **XcodeGen** `project.yml` (authorable from Windows; `.xcodeproj` generated, never committed) | Gradle |
| CI | `ios-native-build.yml` (macOS, manual dispatch, unsigned compile check) | `android-native-build.yml` |

**Bundle id: `app.mathchallenge.ios`** — registered as a Firebase iOS app
(`1:122552558583:ios:86de9ea53a7a0a92cfc4f2`, GoogleService-Info.plist committed,
same class of client config as google-services.json). Must match the App Store
Connect app record when created.

## Server (already deployed-ready)

`functions/src/appleBilling.ts`:
- `verifyAppleTransaction` — callable; **offline JWS verification** against
  Apple's public root CAs (`functions/certs/*.cer`, checked in) via the official
  `@apple/app-store-server-library`. No API key needed for verification. Replay
  guard `applePurchases/{originalTransactionId}`; grant mirrors Play/Airwallex;
  referral conversion credited. Returns `transactionId` for the client `finish()`.
- `appleNotifications` — App Store Server Notifications V2 endpoint (refund →
  revoke, source-gated like playRtdn). Self-verifying payloads; no shared secret.
- **Fail-closed notes:** production-environment verification requires
  `APP_APPLE_ID` (the numeric app id, assigned by App Store Connect) — until
  it's filled in, production JWS fail closed while **sandbox (TestFlight/App
  Review) verifies fine**. Nothing can be granted for a non-existent app.

## Web glue (live, inert outside the shell)

- `channel.ts isNativeIOS()` (bridge-presence detection, strip-proof)
- `checkout.ts` `'ios-native'` channel: buy → JWS → verify → finish; restore at
  boot; **never** falls back to web/Airwallex in the shell (App Store policy)
- `useFirebaseAuth.ts` native Apple block (link / collision-merge / reconcile —
  same flow as native Google)
- `MePage` — Apple button appears when the bridge exists; Google hidden in the
  iOS shell (WebView OAuth dead-ends); email kept
- `haptics.ts` / `push.ts` accept the Apple bridges; funnel platform label
  `ios-native`

## Gated on Apple enrollment clearing — the launch checklist

1. **Agree agreements** in App Store Connect; create the **app record**
   (bundle `app.mathchallenge.ios`) → note the numeric **Apple ID** → set
   `APP_APPLE_ID` in `appleBilling.ts` + redeploy functions.
2. **IAP product** `pro_lifetime` (non-consumable, $3.14 tier) + screenshot/review notes.
3. **App Store Server Notifications V2** → point at the `appleNotifications`
   function URL (both prod + sandbox URLs in ASC).
4. **Signing**: create the distribution cert + profile; set `DEVELOPMENT_TEAM`
   in project.yml; extend CI with an archive + TestFlight upload lane (App
   Store Connect API key as repo secrets — mirror the WIF keyless spirit:
   ASC keys are scoped, revocable).
5. **Push**: APNs key (.p8) uploaded to **Firebase console → project settings →
   Cloud Messaging → Apple app** (one-time; needed before FCM can deliver).
6. **Sign in with Apple**: enable the capability for the App ID in the
   developer portal; enable the Apple provider in **Firebase Auth** (Services ID
   + key for web later; the native flow needs only the provider enabled).
7. **Associated domains** (universal links / referral deep links) — follow-up,
   not launch-blocking: `applinks:mathchallenge.app` + AASA file.
8. TestFlight device QA — reuse `docs/native-qa-checklist.md` (billing loop in
   sandbox, Apple sign-in, push delivery, offline, haptics).
9. App Store listing (reuse store-assets/ + the localized copy) + App Review.
   Review runs in **sandbox** — which verifies TODAY, pre-`APP_APPLE_ID`.

## Known follow-ups (non-blocking)

- App icon asset catalog (needed for archive validation, not compile).
- SKStoreReviewController bridge (iOS analogue of the Play in-app review nudge).
- Universal links (step 7) + widget/App-Shortcuts analogues if wanted.
- `TARGETED_DEVICE_FAMILY` is iPhone-only v1 (same as Android mobile-only call).
