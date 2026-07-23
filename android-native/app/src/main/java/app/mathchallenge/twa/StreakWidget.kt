package app.mathchallenge.twa

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

/**
 * Home-screen widget: current streak + a one-tap route into today's Daily.
 * Retention surface a PWA can't reach.
 *
 * Data comes from the web app via window.AndroidShell.setStats(streak,
 * dailyDone), stashed in SharedPreferences; the app triggers a refresh whenever
 * those change. A 30-min periodic update is the backstop. The widget is fully
 * self-contained — if no data has been written yet it shows a friendly default,
 * and nothing here can affect the app itself.
 */
class StreakWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        for (id in ids) render(context, manager, id)
    }

    companion object {
        const val PREFS = "widget"
        const val KEY_STREAK = "streak"
        const val KEY_DAILY_DONE = "dailyDone"

        /** Re-render every placed widget. Called from ShellBridge when the web
         *  app pushes fresh stats. */
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, StreakWidget::class.java))
            for (id in ids) render(context, manager, id)
        }

        private fun render(context: Context, manager: AppWidgetManager, id: Int) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val streak = prefs.getInt(KEY_STREAK, 0)
            val dailyDone = prefs.getBoolean(KEY_DAILY_DONE, false)

            val views = RemoteViews(context.packageName, R.layout.widget_streak)
            views.setTextViewText(R.id.widget_streak, if (streak > 0) streak.toString() else "—")
            views.setTextViewText(
                R.id.widget_cta,
                context.getString(if (dailyDone) R.string.widget_cta_done else R.string.widget_cta_play),
            )

            // Tap → open today's Daily via the in-scope deep link.
            val intent = Intent(
                Intent.ACTION_VIEW,
                Uri.parse("https://mathchallenge.app/?src=android-native&daily=1"),
            ).setClass(context, MainActivity::class.java)
            val pi = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            manager.updateAppWidget(id, views)
        }
    }
}
