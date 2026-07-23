package app.mathchallenge.twa

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewFeature
import com.google.firebase.messaging.FirebaseMessaging

/**
 * The native shell. A full-screen WebView renders the live PWA
 * (mathchallenge.app) — one web UI codebase across web, this Android app, and
 * the future iOS shell. The ONLY thing native about it is the Play Billing
 * bridge (see BillingBridge): we call com.android.billingclient:8 directly,
 * with no TWA / Digital Goods API / android-browser-helper dependency, so
 * purchasing never depends on the device Chrome version and PBL 8 is available
 * today. See docs/native-android-plan.md.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var billing: BillingBridge

    // Flips true when the WebView paints its first frame (or a safety timeout),
    // at which point the splash screen is allowed to dismiss.
    private var contentRendered = false

    // ?src=android-native lets the web app detect this channel and route
    // purchases through window.AndroidBilling (see src/utils/channel.ts).
    private val startUrl = "https://mathchallenge.app/?src=android-native"
    private val appHost = "mathchallenge.app"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Must be called before super.onCreate(). Shows the branded splash on
        // cold start; we hold it until the WebView paints so there's no white
        // flash and no blank WebView between the two.
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        splashScreen.setKeepOnScreenCondition { !contentRendered }

        // Draw edge-to-edge behind the transparent system bars. The web app is
        // built with viewport-fit=cover + env(safe-area-inset-*), so it insets
        // its own content correctly; solid native bars would double the padding.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            // Dark chalkboard background → light (white) status/nav-bar icons.
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Stop the system drawing its own scrim behind the transparent bars.
            window.isStatusBarContrastEnforced = false
            window.isNavigationBarContrastEnforced = false
        }

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true            // localStorage/IndexedDB for the PWA
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = true  // our sounds fire inside the swipe gesture
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            userAgentString = userAgentString + " MathChallengeNative"
        }

        // Service worker → offline PWA shell. Supported on API 24+ (our minSdk).
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            ServiceWorkerControllerCompat.getInstance().serviceWorkerWebSettings.apply {
                allowContentAccess = true
                cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            }
        }

        // Keep in-scope navigation inside the WebView; open anything else
        // (legal/external links, share targets) in the system browser.
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val scheme = url.scheme?.lowercase()
                // Non-web schemes (mailto:, tel:, market:, intent: …) must go to
                // the system — a WebView can't render them and would error out.
                if (scheme != null && scheme != "http" && scheme != "https") {
                    return try {
                        startActivity(Intent(Intent.ACTION_VIEW, url))
                        true
                    } catch (e: Exception) {
                        true // no handler installed — swallow rather than break the WebView
                    }
                }
                val host = url.host ?: return false
                if (host == appHost || host.endsWith(".$appHost")) return false
                startActivity(Intent(Intent.ACTION_VIEW, url))
                return true
            }

            // First real paint — release the splash.
            override fun onPageCommitVisible(view: WebView, url: String) {
                contentRendered = true
            }

            // Main-frame load failure (offline, DNS, connection refused) → show
            // the branded offline page bundled in assets, with a Retry that
            // reloads via the AndroidShell bridge. Sub-resource errors are
            // ignored (the PWA/service worker handles those).
            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) {
                    contentRendered = true // don't let the splash hang on a failed load
                    view.loadUrl("file:///android_asset/offline.html")
                }
            }
        }

        // The billing bridge. It needs the activity (to launch the flow) and a
        // way to call results back into JS (window.__mcOnPurchase / __mcOnPurchaseError).
        val postJs: (String) -> Unit = { script -> webView.post { webView.evaluateJavascript(script, null) } }
        billing = BillingBridge(activity = this, evaluateJs = postJs)
        webView.addJavascriptInterface(billing, "AndroidBilling")

        // Native Google Sign-In bridge (window.AndroidAuth) — Credential Manager
        // yields a Google ID token; the web app finishes via Firebase
        // signInWithCredential. Web OAuth client ID from BuildConfig (CI injects
        // it from the GOOGLE_WEB_CLIENT_ID repo variable).
        val auth = AuthBridge(
            activity = this,
            webClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID,
            evaluateJs = postJs,
        )
        webView.addJavascriptInterface(auth, "AndroidAuth")

        // Native FCM: ensure the reminders channel exists + cache the token so
        // the web push opt-in can register it into pushSubscriptions.
        PushService.ensureChannel(this)
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            getSharedPreferences(PushService.PREFS, MODE_PRIVATE).edit()
                .putString(PushService.KEY_TOKEN, token).apply()
        }
        webView.addJavascriptInterface(PushBridge(this), "AndroidPush")

        // Shell utilities (window.AndroidShell.reload) — used by the offline page.
        webView.addJavascriptInterface(ShellBridge(webView, startUrl), "AndroidShell")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        // Safety net: never let the splash outlive a usable app, even if
        // onPageCommitVisible somehow never fires (odd WebView builds).
        webView.postDelayed({ contentRendered = true }, 6000)

        if (savedInstanceState == null) webView.loadUrl(startUrl)
    }

    override fun onStart() {
        super.onStart()
        billing.connect()   // (re)connect BillingClient; retries internally
    }

    override fun onResume() {
        super.onResume()
        billing.refreshPurchases()  // catch out-of-app purchases / restores
    }

    override fun onDestroy() {
        billing.dispose()
        webView.destroy()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
