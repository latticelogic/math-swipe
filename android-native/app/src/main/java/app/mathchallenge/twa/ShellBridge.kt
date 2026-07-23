package app.mathchallenge.twa

import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * window.AndroidShell — small utility bridge for shell-level actions the web
 * app (or the bundled offline page) may need. Kept separate from the feature
 * bridges (billing / auth / push) so its surface stays obvious.
 *
 *   reload() — reload the app's start URL. Used by the offline page's retry
 *              button and any "something went wrong, start over" web affordance.
 */
class ShellBridge(
    private val webView: WebView,
    private val startUrl: String,
) {
    @JavascriptInterface
    fun reload() {
        webView.post { webView.loadUrl(startUrl) }
    }
}
