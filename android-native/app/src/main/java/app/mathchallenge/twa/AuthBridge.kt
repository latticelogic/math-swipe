package app.mathchallenge.twa

import android.webkit.JavascriptInterface
import androidx.activity.ComponentActivity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.lifecycle.lifecycleScope
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

/**
 * Native Google Sign-In, exposed to the web app as `window.AndroidAuth`.
 *
 * Google BLOCKS OAuth inside embedded WebViews (anti-phishing), so the web
 * Firebase Google-sign-in dead-ends in the shell. Instead we run the native
 * Credential Manager flow (system account picker → Google ID token), hand the
 * ID token to the web app via a callback, and the web side finishes with
 * Firebase `signInWithCredential(GoogleAuthProvider.credential(idToken))`.
 * Correct branding, no WebView OAuth. See docs/native-android-plan.md §5.
 *
 * Contract (src/hooks/useFirebaseAuth.ts):
 *   signInWithGoogle() → window.__mcOnGoogleToken(idToken) on success,
 *                        window.__mcOnGoogleError(message) on cancel/failure.
 */
class AuthBridge(
    private val activity: ComponentActivity,
    private val webClientId: String,
    private val evaluateJs: (String) -> Unit,
) {
    private val credentialManager = CredentialManager.create(activity)

    @JavascriptInterface
    fun signInWithGoogle() {
        if (webClientId.isEmpty()) { onError("Google sign-in not configured"); return }
        activity.lifecycleScope.launch {
            try {
                val option = GetGoogleIdOption.Builder()
                    .setServerClientId(webClientId)
                    // Show all accounts (not just previously-authorized) so a
                    // first-time signer sees the full picker.
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
                val result = credentialManager.getCredential(activity, request)
                val cred = result.credential
                if (cred is CustomCredential &&
                    cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val idToken = GoogleIdTokenCredential.createFrom(cred.data).idToken
                    if (idToken.isNotEmpty()) onToken(idToken) else onError("No ID token returned")
                } else {
                    onError("Unexpected credential type")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Google sign-in failed")
            }
        }
    }

    private fun onToken(token: String) =
        evaluateJs("window.__mcOnGoogleToken && window.__mcOnGoogleToken(${jsString(token)})")

    private fun onError(message: String) =
        evaluateJs("window.__mcOnGoogleError && window.__mcOnGoogleError(${jsString(message)})")

    private fun jsString(s: String): String =
        "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""
}
