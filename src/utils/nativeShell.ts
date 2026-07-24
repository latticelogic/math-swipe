/**
 * utils/nativeShell.ts
 *
 * Optional bridges exposed by the native Android shell (android-native/). Each
 * function feature-detects its bridge and no-ops in the browser / iOS, so the
 * ONE web build runs unchanged everywhere. This is the web half of the
 * window.Android* interfaces injected by MainActivity.
 */

const REVIEW_ASKED_KEY = 'mc-native-review-asked';
const REVIEW_MIN_INTERVAL_MS = 45 * 86_400_000; // ~45 days between asks, our side

/**
 * Ask for a Play in-app review at a genuine peak moment (native shell only).
 *
 * Two throttles protect the user: ours (at most ~once / 45 days) and Play's own
 * per-user quota (it silently declines to show the card when inappropriate).
 * We never gate app behaviour on this — it's fire-and-forget. No-op when `good`
 * is false or the bridge is absent (browser / iOS / TWA).
 */
export function maybeRequestReview(good: boolean): void {
    if (!good) return;
    try {
        const w = window as unknown as {
            AndroidReview?: { requestReview(): void };
            AppleReview?: { request(): void };
        };
        // Fire whichever native shell we're in (Android Play In-App Review or
        // iOS StoreKit review). Both are system-rate-limited; we still throttle
        // our own ask to be polite.
        const fire = w.AndroidReview?.requestReview
            ? () => w.AndroidReview!.requestReview()
            : w.AppleReview?.request
            ? () => w.AppleReview!.request()
            : null;
        if (!fire) return;
        const last = Number(localStorage.getItem(REVIEW_ASKED_KEY) || 0);
        if (Date.now() - last < REVIEW_MIN_INTERVAL_MS) return;
        localStorage.setItem(REVIEW_ASKED_KEY, String(Date.now()));
        fire();
    } catch {
        /* no-op */
    }
}

/**
 * Push the current day-streak + today's-Daily state to the native home-screen
 * widget. No-op outside the native shell.
 */
export function pushWidgetStats(dayStreak: number, dailyDone: boolean): void {
    try {
        const shell = (window as unknown as { AndroidShell?: { setStats(s: number, d: boolean): void } }).AndroidShell;
        if (!shell || typeof shell.setStats !== 'function') return;
        shell.setStats(Math.max(0, Math.floor(dayStreak)), !!dailyDone);
    } catch {
        /* no-op */
    }
}
