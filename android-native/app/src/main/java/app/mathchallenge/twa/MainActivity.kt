package app.mathchallenge.twa

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
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
    private lateinit var updater: ShellUpdater

    // Flips true when the WebView paints its first frame (or a safety timeout),
    // at which point the splash screen is allowed to dismiss.
    private var contentRendered = false

    // Result sink for the Play flexible-update consent dialog (result ignored —
    // the flow completes via ShellUpdater's install-state listener).
    private val updateLauncher =
        registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { }

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

        // NOT edge-to-edge: the theme's solid chalkboard system bars let Android
        // inset the WebView content below the status bar, so the app header /
        // achievement toast never ride up into it. (Android WebView doesn't feed
        // env(safe-area-inset-top) reliably, so drawing behind the bars caused
        // collisions; the uniform dark bg means a solid bar looks identical.)

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

        // Play In-App Review (window.AndroidReview.requestReview()).
        webView.addJavascriptInterface(ReviewBridge(this), "AndroidReview")

        // Native haptics (window.AndroidHaptics.impact(type)) for the swipe.
        webView.addJavascriptInterface(HapticsBridge(this), "AndroidHaptics")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

        // Play In-App Updates — quietly download a newer shell in the background;
        // it installs at the next launch. Inert when no update is available.
        updater = ShellUpdater(this)
        updater.start(updateLauncher)

        // Safety net: never let the splash outlive a usable app, even if
        // onPageCommitVisible somehow never fires (odd WebView builds).
        webView.postDelayed({ contentRendered = true }, 6000)

        // Cold start: honour an incoming App Link (e.g. a shared /?r= invite or
        // /u/<slug> profile) so it opens in-app; otherwise the default start URL.
        if (savedInstanceState == null) webView.loadUrl(resolveStartUrl(intent))
    }

    override fun onStart() {
        super.onStart()
        billing.connect()   // (re)connect BillingClient; retries internally
    }

    override fun onResume() {
        super.onResume()
        billing.refreshPurchases()  // catch out-of-app purchases / restores
    }

    // A new App Link arrived while we're already running (singleTask). Navigate
    // the WebView to it so a tapped invite/profile link lands in-app.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.data != null) webView.loadUrl(resolveStartUrl(intent))
    }

    /** The URL to load: an in-scope App Link if the intent carries one (with the
     *  native channel param preserved), otherwise the default start URL. */
    private fun resolveStartUrl(intent: Intent?): String {
        val data = intent?.data ?: return startUrl
        val host = data.host ?: return startUrl
        if (host != appHost && !host.endsWith(".$appHost")) return startUrl
        // Preserve the deep-linked path + query; ensure the channel param so the
        // web app knows it's the native shell.
        val builder = data.buildUpon()
        if (data.getQueryParameter("src") == null) builder.appendQueryParameter("src", "android-native")
        return builder.build().toString()
    }

    override fun onDestroy() {
        updater.dispose()
        billing.dispose()
        webView.destroy()
        super.onDestroy()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }
}
