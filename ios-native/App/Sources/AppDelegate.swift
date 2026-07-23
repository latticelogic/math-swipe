import UIKit
import FirebaseCore
import FirebaseMessaging
import UserNotifications

/// The iOS native shell — the sibling of android-native/'s MainActivity world.
/// One web codebase (mathchallenge.app) rendered in a WKWebView; native code
/// exists ONLY for what a WebView cannot do on iOS:
///   - StoreKit 2 payments (App Store policy requires IAP — the analogue of
///     Play Billing; external payment links are not allowed in-app)
///   - Sign in with Apple (OAuth-in-WebView is blocked/dead-ended, same as
///     Android; native ASAuthorization gives the branded system sheet)
///   - Push (web push does not exist inside WKWebView → native FCM/APNs)
///   - Crisp haptics (UIFeedbackGenerator)
/// See docs/ios-native-plan.md.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?
    static let fcmTokenDefaultsKey = "mc.fcmToken"

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().delegate = self
        // Registering for remote notifications is silent (no permission prompt)
        // — APNs token plumbing only. The visible permission ask happens when
        // the web opt-in calls ApplePush.requestNotificationPermission().
        application.registerForRemoteNotifications()

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = MainViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

    // ── FCM token cache (read synchronously by the ApplePush bridge shim) ──
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        UserDefaults.standard.set(fcmToken ?? "", forKey: Self.fcmTokenDefaultsKey)
        (window?.rootViewController as? MainViewController)?.pushBridgeStateToWeb()
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }

    // Foreground notifications: show them (banner + sound), matching the
    // Android channel behavior — the app is a game, a reminder arriving while
    // it's open is rare and harmless.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}
