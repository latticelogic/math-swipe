package app.mathchallenge.twa

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.webkit.JavascriptInterface
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat

/**
 * Native push bridge (window.AndroidPush). The web app's push opt-in, when
 * running in the native shell, calls requestNotificationPermission() then reads
 * getFcmToken() and writes it into pushSubscriptions/{uid} (platform 'android')
 * — reusing the web's opt-in + uid logic and the server's existing send path.
 */
class PushBridge(private val activity: ComponentActivity) {

    /** The cached FCM token (may be "" briefly on first launch before the
     *  async fetch in MainActivity completes; the web side retries). */
    @JavascriptInterface
    fun getFcmToken(): String =
        activity.getSharedPreferences(PushService.PREFS, Context.MODE_PRIVATE)
            .getString(PushService.KEY_TOKEN, "") ?: ""

    /** Prompt for POST_NOTIFICATIONS on Android 13+ (no-op below that / if
     *  already granted). Called from the web opt-in toggle. */
    @JavascriptInterface
    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            activity, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            activity.runOnUiThread {
                @Suppress("DEPRECATION")
                activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }
    }
}
