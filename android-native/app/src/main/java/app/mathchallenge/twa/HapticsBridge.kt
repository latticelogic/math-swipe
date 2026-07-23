package app.mathchallenge.twa

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface

/**
 * window.AndroidHaptics — richer, reliable haptics for the core swipe.
 *
 * Web `navigator.vibrate` is coarse (fixed duration, no texture) and is being
 * curtailed in some WebView contexts. The native Vibrator gives crisp
 * predefined effects (tick / click / heavy-click / double-click) on API 29+,
 * with a graceful one-shot fallback below that. The web app calls impact(type)
 * inside the swipe gesture and falls back to navigator.vibrate when the bridge
 * isn't present (browser / iOS).
 */
class HapticsBridge(private val context: Context) {

    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    /** type: "light" | "medium" | "heavy" | "success" | "warning". */
    @JavascriptInterface
    fun impact(type: String) {
        val v = vibrator ?: return
        if (!v.hasVibrator()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val effectId = when (type) {
                "light" -> VibrationEffect.EFFECT_TICK
                "heavy" -> VibrationEffect.EFFECT_HEAVY_CLICK
                "warning" -> VibrationEffect.EFFECT_DOUBLE_CLICK
                else -> VibrationEffect.EFFECT_CLICK // medium / success / default
            }
            try {
                v.vibrate(VibrationEffect.createPredefined(effectId))
                return
            } catch (e: Exception) {
                // Device without predefined effects — fall through to one-shot.
            }
        }

        val ms = when (type) {
            "light" -> 10L
            "heavy" -> 40L
            "warning" -> 60L
            else -> 20L
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(ms)
        }
    }
}
