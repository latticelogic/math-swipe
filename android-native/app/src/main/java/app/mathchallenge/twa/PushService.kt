package app.mathchallenge.twa

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Native FCM. Web push doesn't work in a WebView, so the native shell handles
 * notifications itself. onNewToken caches the FCM token (SharedPreferences) so
 * MainActivity/PushBridge can hand it to the web app, which registers it into
 * pushSubscriptions/{uid} — the SAME collection the web uses, so the server's
 * daily-reminder / beaten-ping send-logic is unchanged.
 */
class PushService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_TOKEN, token).apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val n = message.notification ?: return
        ensureChannel(this)
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(n.title ?: getString(R.string.app_name))
            .setContentText(n.body ?: "")
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        // notify() is a no-op without POST_NOTIFICATIONS (Android 13+); harmless.
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, builder.build())
    }

    companion object {
        const val PREFS = "mc_push"
        const val KEY_TOKEN = "fcm_token"
        const val CHANNEL_ID = "daily_reminders"
        private const val NOTIFICATION_ID = 1

        /** Soft-toned reminders channel (see the push copy rules in CLAUDE.md). */
        fun ensureChannel(ctx: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val mgr = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
                mgr.createNotificationChannel(
                    NotificationChannel(CHANNEL_ID, "Reminders", NotificationManager.IMPORTANCE_DEFAULT)
                )
            }
        }
    }
}
