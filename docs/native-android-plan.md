# Native Android (WebView + native Play Billing bridge) — plan

**Type:** decision record + build plan · **Status:** APPROVED 2026-07-23 (owner), building
**Supersedes for Android:** the Bubblewrap TWA (`android/`) — kept as fallback until the native build is device-proven.

## Why we're doing this

Two problems, one root cause — both come from depending on Google's TWA billing
wrapper (`android-browser-helper` → Digital Goods API):

1. **Play Billing Library 8 is blocked upstream.** `android-browser-helper`'s
   latest release + `main` still pin `com.android.billingclient:billing 7.1.1`.
   Google requires **8.0.0 by Aug 31 2026** (Nov 1 with extension) or updates
   are rejected. We cannot ship 8 through the TWA until Google bumps their lib.
2. **Purchasing depends on the device Chrome version.** The Digital Goods API
   (the only way a TWA can bill) needs Chrome ≥101 and a live billing-service
   connection; when it's absent the user sees "Purchases aren't available" — a
   dead-end at the moment of intent. Violates the user-first gate ("every
   reachable user can pay"; see CLAUDE.md).

**A native WebView shell with a native billing bridge kills both:** it calls
`com.android.billingclient:billing:8` **directly** (no upstream dependency, no
Chrome-version gate). The web UI stays a single codebase (web + iOS shell +
Android WebView all load the same PWA); only the billing *mechanism* changes.

## The key architecture decision: WebView, not TWA

| | TWA (current) | WebView (this plan) |
|---|---|---|
| Renders in | User's Chrome (separate process) | Android System WebView (in-process) |
| Native JS bridge (`addJavascriptInterface`) | **Impossible** (trust boundary) | **Yes** — this is the whole point |
| Billing | Digital Goods API (Chrome-gated, PBL 7.1.1) | Native `BillingClient` 8 via bridge |
| URL bar | Hidden via Digital Asset Links | None (WebView has no chrome) |
| assetlinks needed | Yes | **No** |
| Engine currency | Chrome (auto-updates) | System WebView (auto-updates via Play) |

WebView is a fully supported, in-process browser component. On modern devices
the System WebView is current (Play-updated) and runs our PWA fine (service
workers supported since API 24 via `ServiceWorkerController`; IndexedDB, DOM
storage, WebGL, media all supported). We lose the "it is literally Chrome"
guarantee, but gain the native bridge — the trade that solves both problems.

## Components

### 1. Native shell (Kotlin)
- `MainActivity` — full-screen `WebView` loading
  `https://mathchallenge.app/?src=android-native`. Config: `javaScriptEnabled`,
  `domStorageEnabled`, `ServiceWorkerController` enabled, media autoplay allowed
  (our sounds fire in a gesture so autoplay policy is fine), hardware back →
  `webView.goBack()` (fall through to finish at root), external `target=_blank`
  / non-`mathchallenge.app` links → open in Chrome (`CustomTabsIntent`), file
  downloads N/A. Splash matches `#1b1b1b`.
- Edge cases: offline (WebView serves the PWA's cached shell via its service
  worker — verify), pull-to-refresh disabled, long-press context menu disabled.

### 2. Billing bridge (Kotlin) — `com.android.billingclient:billing:8.x`
- `BillingBridge` registered via `addJavascriptInterface(bridge, "AndroidBilling")`.
- Lifecycle: connect `BillingClient` on activity start, retry with backoff,
  `queryProductDetailsAsync` for `pro_lifetime`, `launchBillingFlow`, listen on
  `PurchasesUpdatedListener`, `queryPurchasesAsync` on resume for restores.
- **JS-facing surface** (mirrors what `checkout.ts` needs today):
  - `AndroidBilling.isReady(): boolean` — billing connected + product loaded.
  - `AndroidBilling.buy()` → launches the flow; on success calls back into JS
    with the `purchaseToken` (via `webView.evaluateJavascript` or a
    `window.__onAndroidPurchase(token)` hook).
  - `AndroidBilling.restore()` → same callback for an existing purchase.
- **Server + entitlement UNCHANGED:** the bridge hands the `purchaseToken` to
  the existing `verifyPlayPurchase` callable, which writes `source:'google'`.
  Acknowledge on the server (as today) so Play doesn't auto-refund. The whole
  source-agnostic entitlement model is untouched — this is why the swap is
  contained.

### 3. Web side (`src/utils/checkout.ts`, `channel.ts`)
- New channel signal: `?src=android-native` + `typeof window.AndroidBilling !== 'undefined'`.
- `PurchaseChannel` gains `'android-native'`; `getPurchaseChannel()` returns it
  when the bridge is present. `startCheckout()` routes `'android-native'` →
  `window.AndroidBilling.buy()` → await token → `verifyPlayPurchase`.
- The TWA/Digital-Goods path (`'play'`) stays for now (fallback build); web
  (`'airwallex'`) unchanged. Keep the diagnostic until native is proven.

### 4. Push notifications — moves to native FCM (added scope, flagged)
Web push (FCM via service worker) does **not** work in a WebView (no browser to
present background notifications). To keep the opt-in daily reminder + "you got
beaten" ping, add native FCM: `firebase-messaging` in the shell, request POST_
NOTIFICATIONS (Android 13+), register the FCM token through a bridge into the
existing `pushSubscriptions` collection. **Server send-logic and the existing
throttles/soft-copy rules are unchanged** — only token registration + display
move native. If we want to stage: launch native without push, add the FCM
bridge as a fast-follow (push is opt-in, not core) — but that's a regression
for Android users, so prefer shipping it together.

## Build / CI
- New Gradle project at `android-native/` (kept separate from `android/` so the
  working TWA keeps building until native is proven — don't break what works).
- Standard signed `.aab` via Gradle + the existing upload keystore secrets.
- New workflow `android-native-build.yml` (or a mode flag): reuse the monotonic
  `versionCode` scheme (run_number + offset) and the **keyless WIF upload** to
  the internal track (`play-publisher` SA — already provisioned). No Bubblewrap,
  no `expect` dance, no self-managed SDK — a normal Android build (simpler CI).
- `targetSdk 36` set directly in `build.gradle` (no post-patch needed).

## Migration / rollout (evidence-gated per user-first)
1. Build `android-native/`, upload to **internal** as a new versionCode.
2. Device QA: install, confirm the PWA runs in WebView (play, sounds, offline,
   back button), then the **purchase→verify→entitlement→refund→revoke** loop on
   a license-tester account — the loop the TWA never confirmed.
3. Only when billing is device-proven working: promote native to production and
   retire the TWA build. Until then the TWA stays the shipping artifact.
4. Package id stays `app.mathchallenge.twa` (same Play app, seamless update) —
   confirm the WebView build signs with the same key so Play accepts it as an
   update.

## Risks + mitigations
- **WebView engine parity** — modern System WebView runs the PWA fine; test
  service worker + IndexedDB + offline explicitly. Set a minimum WebView
  version check; if absurdly old, prompt a Play update (compliant recovery).
- **Push regression** — mitigated by the native FCM bridge (above).
- **Package-signing continuity** — must match the current app-signing key or
  Play rejects the update; verify against the App Signing cert before upload.
- **Effort** — realistic: shell 1–2d, billing bridge 2–3d, FCM bridge 1–2d, CI
  1d, device QA. Days-to-weeks, not months; far less than a rewrite.

## What does NOT change
The entire web app, the server (`verifyPlayPurchase`, RTDN, entitlement), the
`source:'google'` model, Airwallex web checkout, the iOS shell plan, pricing,
and all product/content. This is a **billing-transport swap on Android**, not a
rewrite.
