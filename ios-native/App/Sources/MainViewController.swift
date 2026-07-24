import UIKit
import WebKit
import FirebaseMessaging
import UserNotifications

/// The whole app: a full-screen WKWebView rendering the live PWA, plus the
/// native bridges. Mirrors android-native/MainActivity.
///
///   - Loads https://mathchallenge.app/?src=ios-native (the channel param the
///     web app keys on — see src/utils/channel.ts isNativeIOS()).
///   - In-scope hosts stay in the WebView; external links/schemes hand off to
///     the system (Safari / Mail) — never strand the user in the shell.
///   - Main-frame load failure → bundled offline.html (branded, with retry via
///     AppleShell.reload) instead of the default error page.
///   - NOT edge-to-edge chrome games: the chalkboard background + the web
///     app's own safe-area handling (viewport-fit=cover) cover iOS notches
///     natively via WKWebView's default inset behavior.
final class MainViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {

    private let startURL = URL(string: "https://mathchallenge.app/?src=ios-native")!
    private let appHost = "mathchallenge.app"

    private var webView: WKWebView!
    private var billing: BillingBridge!
    private var auth: AuthBridge!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 27/255, green: 27/255, blue: 27/255, alpha: 1)

        let config = WKWebViewConfiguration()
        config.userContentController.addUserScript(BridgeScript.userScript())
        config.userContentController.add(self, name: "mc")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []   // sounds fire inside the swipe gesture
        config.websiteDataStore = .default()                   // persistent localStorage/IndexedDB

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never  // web app owns safe areas (viewport-fit=cover)
        webView.allowsBackForwardNavigationGestures = true
        // Marker appended to the UA (parallels " MathChallengeNative" on Android).
        webView.customUserAgent = nil
        webView.evaluateJavaScript("navigator.userAgent") { [weak self] result, _ in
            if let ua = result as? String { self?.webView.customUserAgent = ua + " MathChallengeNativeiOS" }
        }

        view.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])

        let emit: (String) -> Void = { [weak self] js in
            DispatchQueue.main.async { self?.webView.evaluateJavaScript(js, completionHandler: nil) }
        }
        billing = BillingBridge(emitJs: emit) { [weak self] in self?.pushBridgeStateToWeb() }
        billing.start()
        auth = AuthBridge(window: view.window ?? UIApplication.shared.windows.first, emitJs: emit)

        webView.load(URLRequest(url: startURL))
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    /// Keep the shim's synchronous state (billing readiness + cached FCM token)
    /// fresh. Called on billing readiness changes and FCM token refresh.
    func pushBridgeStateToWeb() {
        let token = UserDefaults.standard.string(forKey: AppDelegate.fcmTokenDefaultsKey) ?? ""
        let js = "window.__mcIOS = Object.assign(window.__mcIOS || {}, { billingReady: \(billing?.isReady == true), fcmToken: \(BillingBridge.jsString(token)) })"
        DispatchQueue.main.async { [weak self] in self?.webView?.evaluateJavaScript(js, completionHandler: nil) }
    }

    // ── WKScriptMessageHandler — dispatch {api, cmd, args} from the shim ──
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "mc",
              let body = message.body as? [String: Any],
              let api = body["api"] as? String,
              let cmd = body["cmd"] as? String else { return }
        let args = body["args"] as? [String: Any] ?? [:]

        switch (api, cmd) {
        case ("billing", "buy"):
            billing.buy()
        case ("billing", "restore"):
            billing.restore()
        case ("billing", "finish"):
            billing.finish(transactionId: args["transactionId"] as? String ?? "")
        case ("auth", "apple"):
            auth.signInWithApple()
        case ("push", "request"):
            requestNotificationPermission()
        case ("haptics", "impact"):
            HapticsBridge.impact(type: args["type"] as? String ?? "medium")
        case ("review", "request"):
            ReviewBridge.request()
        case ("shell", "reload"):
            webView.load(URLRequest(url: startURL))
        default:
            break
        }
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
                if granted {
                    // Token may mint only after permission on some setups —
                    // refresh the cache then update the shim state.
                    Messaging.messaging().token { [weak self] token, _ in
                        if let token { UserDefaults.standard.set(token, forKey: AppDelegate.fcmTokenDefaultsKey) }
                        self?.pushBridgeStateToWeb()
                    }
                }
            }
        }
    }

    // ── WKNavigationDelegate ──

    /// In-scope hosts stay in the WebView; everything else (external https,
    /// mailto:, tel:, itms-apps:) hands off to the system. Mirrors Android's
    /// shouldOverrideUrlLoading.
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme != "http" && scheme != "https" && scheme != "about" && scheme != "file" {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            decisionHandler(.cancel)
            return
        }
        if let host = url.host, scheme.hasPrefix("http"),
           host != appHost, !host.hasSuffix(".\(appHost)") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    /// Main-frame load failure (offline, DNS, refused) → branded offline page.
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        loadOfflinePage()
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        let nsError = error as NSError
        // Ignore benign cancellations (e.g. a handed-off external link).
        if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorCancelled { return }
        loadOfflinePage()
    }

    private func loadOfflinePage() {
        guard let offlineURL = Bundle.main.url(forResource: "offline", withExtension: "html") else { return }
        webView.loadFileURL(offlineURL, allowingReadAccessTo: offlineURL.deletingLastPathComponent())
    }
}
