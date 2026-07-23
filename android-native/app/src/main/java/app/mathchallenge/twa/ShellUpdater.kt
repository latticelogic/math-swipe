package app.mathchallenge.twa

import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability

/**
 * Play In-App Updates (flexible). The new native binary downloads in the
 * background and installs at the next natural launch boundary — never a forced
 * mid-session restart, and never a trip to the Play Store listing.
 *
 * This is the proper native answer to "why did I have to update on Google
 * Play": for the rare shell update, the download happens quietly and applies
 * when the app is next reopened. It only ever engages when Play actually has a
 * newer versionCode than what's installed, so it's inert during a single test.
 */
class ShellUpdater(private val activity: android.app.Activity) {

    private val manager = AppUpdateManagerFactory.create(activity)

    private val listener = InstallStateUpdatedListener { state ->
        if (state.installStatus() == InstallStatus.DOWNLOADED) {
            // Downloaded while the app was open — finish at the next foreground
            // (completeUpdate restarts to install; a launch/return is the least
            // disruptive moment).
            manager.completeUpdate()
        }
    }

    fun start(launcher: ActivityResultLauncher<IntentSenderRequest>) {
        manager.registerListener(listener)
        manager.appUpdateInfo.addOnSuccessListener { info ->
            when {
                // A prior background download is ready → install it now (launch).
                info.installStatus() == InstallStatus.DOWNLOADED -> manager.completeUpdate()
                // A new version exists → start a quiet flexible download.
                info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
                    info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE) -> {
                    runCatching {
                        manager.startUpdateFlowForResult(
                            info,
                            launcher,
                            AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                        )
                    }
                }
            }
        }
    }

    fun dispose() {
        runCatching { manager.unregisterListener(listener) }
    }
}
