package app.mathchallenge.twa

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * window.AndroidShell — small utility bridge for shell-level actions the web
 * app (or the bundled offline page) may need. Kept separate from the feature
 * bridges (billing / auth / push) so its surface stays obvious.
 *
 *   reload()                 — reload the app's start URL (offline-page retry,
 *                              any "start over" affordance).
 *   setStats(streak, done)   — push the current streak + today's-Daily state so
 *                              the home-screen widget can render them.
 */
class ShellBridge(
    private val webView: WebView,
    private val startUrl: String,
) {
    @JavascriptInterface
    fun reload() {
        webView.post { webView.loadUrl(startUrl) }
    }

    @JavascriptInterface
    fun setStats(streak: Int, dailyDone: Boolean) {
        val context = webView.context.applicationContext
        context.getSharedPreferences(StreakWidget.PREFS, Context.MODE_PRIVATE).edit()
            .putInt(StreakWidget.KEY_STREAK, streak)
            .putBoolean(StreakWidget.KEY_DAILY_DONE, dailyDone)
            .apply()
        StreakWidget.updateAll(context)
    }
}
