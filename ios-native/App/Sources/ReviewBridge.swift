import StoreKit
import UIKit

/// In-app App Store review prompt — the iOS analogue of android-native's
/// ReviewBridge (Play In-App Review). The web app calls AppleReview.request()
/// at a genuine peak moment (a perfect session, a milestone); StoreKit shows
/// the rating sheet WITHOUT leaving the app.
///
/// Like Play, the SYSTEM decides whether to actually show it (heavily
/// rate-limited per user/per year), and the API never reports the outcome — so
/// we never gate behaviour on it. Calling on every good moment is safe.
enum ReviewBridge {
    static func request() {
        DispatchQueue.main.async {
            if #available(iOS 14.0, *) {
                let scene = UIApplication.shared.connectedScenes
                    .first { $0.activationState == .foregroundActive } as? UIWindowScene
                if let scene {
                    SKStoreReviewController.requestReview(in: scene)
                    return
                }
            }
            SKStoreReviewController.requestReview()
        }
    }
}
