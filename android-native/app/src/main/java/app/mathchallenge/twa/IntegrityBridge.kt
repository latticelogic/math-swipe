package app.mathchallenge.twa

import android.content.Context
import android.webkit.JavascriptInterface
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import org.json.JSONObject

/**
 * window.AndroidIntegrity — Play Integrity token requests.
 *
 * The web app calls requestToken(nonce, callbackId) around a purchase; we mint a
 * Play Integrity token bound to that nonce and hand it back via
 * window.__mcOnIntegrityToken(callbackId, token|null). The server decodes it and
 * logs the device/app verdict (log-only — never blocks a purchase yet).
 *
 * Failures resolve to null (the web side treats a missing token as "no integrity
 * signal" and proceeds): integrity must never stand between a real buyer and
 * their purchase.
 */
class IntegrityBridge(
    private val context: Context,
    private val evaluateJs: (String) -> Unit,
) {
    // math-swipe-prod project number (matches functions + the linked Play app).
    private val cloudProjectNumber = 122552558583L

    @JavascriptInterface
    fun requestToken(nonce: String, callbackId: String) {
        try {
            val manager = IntegrityManagerFactory.create(context.applicationContext)
            manager.requestIntegrityToken(
                IntegrityTokenRequest.builder()
                    .setNonce(nonce)
                    .setCloudProjectNumber(cloudProjectNumber)
                    .build(),
            ).addOnSuccessListener { response ->
                reply(callbackId, response.token())
            }.addOnFailureListener {
                reply(callbackId, null)
            }
        } catch (e: Exception) {
            reply(callbackId, null)
        }
    }

    private fun reply(callbackId: String, token: String?) {
        val cb = JSONObject.quote(callbackId)
        val tk = if (token == null) "null" else JSONObject.quote(token)
        evaluateJs("window.__mcOnIntegrityToken && window.__mcOnIntegrityToken($cb, $tk)")
    }
}
