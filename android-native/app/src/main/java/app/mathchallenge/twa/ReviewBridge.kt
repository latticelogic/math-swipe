package app.mathchallenge.twa

import android.app.Activity
import android.webkit.JavascriptInterface
import com.google.android.play.core.review.ReviewManagerFactory

/**
 * window.AndroidReview — Play In-App Review.
 *
 * The web app calls requestReview() at a genuine peak moment (a perfect
 * session, a milestone), and the Play in-app review card appears WITHOUT
 * leaving the app. This is a native-only capability — a PWA cannot ask for a
 * Play rating in-context, and review volume + rating are a real ASO lever.
 *
 * Play itself heavily quota-limits how often the card actually shows (per user,
 * per period), so calling this on every good moment is safe: Play silently
 * no-ops when it's not appropriate. We never gate app behaviour on the result —
 * the flow completes the same whether or not a card was shown or a review left
 * (by design, the API never tells us).
 */
class ReviewBridge(private val activity: Activity) {

    @JavascriptInterface
    fun requestReview() {
        activity.runOnUiThread {
            val manager = ReviewManagerFactory.create(activity)
            manager.requestReviewFlow().addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    // Launch is best-effort; ignore failures (nothing the user
                    // should ever see as an error).
                    manager.launchReviewFlow(activity, task.result)
                }
            }
        }
    }
}
