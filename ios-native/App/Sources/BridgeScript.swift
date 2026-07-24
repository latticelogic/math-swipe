import WebKit

/// The JS shim injected at document start. WKWebView has no synchronous
/// `addJavascriptInterface` equivalent, so this script defines the bridge
/// objects the web app expects (`window.AppleBilling` / `AppleAuth` /
/// `ApplePush` / `AppleHaptics` / `AppleShell`) as thin wrappers around
/// `webkit.messageHandlers.mc.postMessage`, plus a state blob (`__mcIOS`)
/// the native side keeps fresh so the two synchronous reads (billing
/// readiness, cached FCM token) work without a round-trip.
///
/// The RESULT callbacks are the exact same globals the Android shell uses
/// (`__mcOnPurchase`, `__mcOnPurchaseError`, …) so the web-side await logic
/// (checkout.ts / useFirebaseAuth.ts) is shared verbatim across platforms.
enum BridgeScript {
    static let source = """
    (function () {
      if (window.AppleBilling) { return; }
      window.__mcIOS = { billingReady: false, fcmToken: '' };
      var post = function (api, cmd, args) {
        try { window.webkit.messageHandlers.mc.postMessage({ api: api, cmd: cmd, args: args || {} }); } catch (e) {}
      };
      window.AppleBilling = {
        isReady: function () { return !!window.__mcIOS.billingReady; },
        buy: function (sku) { post('billing', 'buy', { sku: sku }); },
        restore: function (sku) { post('billing', 'restore', { sku: sku }); },
        finish: function (transactionId) { post('billing', 'finish', { transactionId: String(transactionId || '') }); }
      };
      window.AppleAuth = {
        signInWithApple: function () { post('auth', 'apple'); }
      };
      window.ApplePush = {
        getFcmToken: function () { return window.__mcIOS.fcmToken || ''; },
        requestNotificationPermission: function () { post('push', 'request'); }
      };
      window.AppleHaptics = {
        impact: function (type) { post('haptics', 'impact', { type: String(type || 'medium') }); }
      };
      window.AppleReview = {
        request: function () { post('review', 'request'); }
      };
      window.AppleShell = {
        reload: function () { post('shell', 'reload'); }
      };
    })();
    """

    static func userScript() -> WKUserScript {
        WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }
}
