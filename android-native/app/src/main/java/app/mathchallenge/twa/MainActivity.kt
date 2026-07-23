package app.mathchallenge.twa

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.net.toUri
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebViewFeature

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

    // ?src=android-native lets the web app detect this channel and route
    // purchases through window.AndroidBilling (see src/utils/channel.ts).
    private val startUrl = "https://mathchallenge.app/?src=android-native"
    private val appHost = "mathchallenge.app"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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
                val host = request.url.host ?: return false
                if (host == appHost || host.endsWith(".$appHost")) return false
                startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, request.url))
                return true
            }
        }

        // The billing bridge. It needs the activity (to launch the flow) and a
        // way to call results back into JS (window.__mcOnPurchase / __mcOnPurchaseError).
        billing = BillingBridge(
            activity = this,
            evaluateJs = { script -> webView.post { webView.evaluateJavascript(script, null) } },
        )
        webView.addJavascriptInterface(billing, "AndroidBilling")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })

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
