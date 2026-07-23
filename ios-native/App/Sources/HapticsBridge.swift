import UIKit

/// Crisp system haptics for the swipe — the iOS analogue of android-native's
/// HapticsBridge (which uses VibrationEffect). The web side calls
/// AppleHaptics.impact(type) from utils/haptics.ts; types mirror the shared
/// semantic vocabulary: light | medium | heavy | success | warning.
enum HapticsBridge {
    static func impact(type: String) {
        DispatchQueue.main.async {
            switch type {
            case "light":
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            case "heavy":
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            case "success":
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            case "warning":
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
            default:
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            }
        }
    }
}
