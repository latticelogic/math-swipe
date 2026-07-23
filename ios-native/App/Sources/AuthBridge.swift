import AuthenticationServices
import CryptoKit
import UIKit

/// Native Sign in with Apple — the iOS analogue of android-native's AuthBridge
/// (which does Google via Credential Manager). OAuth inside a WebView is a
/// dead end on iOS too, so the shell runs the native ASAuthorization sheet and
/// hands the identity token to the web app, which finishes with Firebase
/// `OAuthProvider('apple.com').credential({ idToken, rawNonce })`.
///
/// Contract (src/hooks/useFirebaseAuth.ts):
///   signInWithApple() → window.__mcOnAppleToken(idToken, rawNonce) on success,
///                       window.__mcOnAppleError(message) on cancel/failure.
///
/// The nonce pattern is Firebase's requirement: a random nonce is hashed
/// (SHA-256) into the Apple request; Apple embeds the hash in the returned
/// identity token; Firebase verifies token-hash == sha256(rawNonce) so the
/// token can't be replayed from elsewhere.
final class AuthBridge: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    private let emitJs: (String) -> Void
    private weak var presentationWindow: UIWindow?
    private var currentNonce: String?

    init(window: UIWindow?, emitJs: @escaping (String) -> Void) {
        self.presentationWindow = window
        self.emitJs = emitJs
    }

    func signInWithApple() {
        let nonce = Self.randomNonce()
        currentNonce = nonce

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email, .fullName]
        request.nonce = Self.sha256(nonce)

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    // ── ASAuthorizationControllerDelegate ──
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let idToken = String(data: tokenData, encoding: .utf8),
            let nonce = currentNonce
        else {
            emitError("No identity token returned")
            return
        }
        currentNonce = nil
        emitJs("window.__mcOnAppleToken && window.__mcOnAppleToken(\(BillingBridge.jsString(idToken)), \(BillingBridge.jsString(nonce)))")
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        currentNonce = nil
        let asError = error as? ASAuthorizationError
        emitError(asError?.code == .canceled ? "cancelled" : error.localizedDescription)
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        presentationWindow ?? ASPresentationAnchor()
    }

    private func emitError(_ message: String) {
        emitJs("window.__mcOnAppleError && window.__mcOnAppleError(\(BillingBridge.jsString(message)))")
    }

    // ── Nonce helpers (Firebase's documented pattern) ──
    private static func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var random: UInt8 = 0
            let status = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
            if status != errSecSuccess { continue }
            if random < charset.count {
                result.append(charset[Int(random)])
                remaining -= 1
            }
        }
        return result
    }

    private static func sha256(_ input: String) -> String {
        let hash = SHA256.hash(data: Data(input.utf8))
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}
