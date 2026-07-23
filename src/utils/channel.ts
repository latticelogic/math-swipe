/**
 * utils/channel.ts
 *
 * Distribution-channel detection: is this session the plain web app, or the
 * Android app (our PWA wrapped in a Trusted Web Activity from Google Play)?
 *
 * Why it matters: Google Play policy forbids selling digital goods in the
 * Android app through anything but Play Billing (doubly so under the Families
 * program, which this kids' app is in). So the paywall must route purchases
 * per channel — Airwallex hosted checkout on the web, the Digital Goods API
 * (Play Billing) inside the TWA — and never show an external payment path in
 * the Android app. See utils/checkout.ts for the routing.
 *
 * Detection signals (either marks the session as 'twa'):
 *   1. `document.referrer` starting with `android-app://` — Chrome sets this
 *      on the FIRST navigation of a TWA launch.
 *   2. `?src=twa` on the URL — baked into the TWA's start_url in
 *      twa-manifest.json, so it survives referrer edge cases.
 *
 * Stickiness is per-session (sessionStorage), NOT localStorage: a TWA shares
 * its origin storage with the user's regular Chrome, so a persistent flag
 * written in the Android app would leak into later browser-tab visits and
 * wrongly suppress the web purchase path there.
 *
 * Call `detectChannel()` once at module load (App.tsx does), before anything
 * rewrites the URL.
 */

const CHANNEL_KEY = 'mc-session-channel';

export type Channel = 'web' | 'twa';

export function detectChannel(): Channel {
    try {
        if (sessionStorage.getItem(CHANNEL_KEY) === 'twa') return 'twa';
        const fromReferrer = typeof document !== 'undefined'
            && document.referrer.startsWith('android-app://');
        const fromParam = typeof window !== 'undefined'
            && new URLSearchParams(window.location.search).get('src') === 'twa';
        if (fromReferrer || fromParam) {
            sessionStorage.setItem(CHANNEL_KEY, 'twa');
            return 'twa';
        }
    } catch { /* storage unavailable → treat as web */ }
    return 'web';
}

/** True when running inside the Google Play (TWA) Android app. */
export function isAndroidApp(): boolean {
    return detectChannel() === 'twa';
}

/**
 * True when running inside the NATIVE Android shell (WebView + native Play
 * Billing — docs/native-android-plan.md). The shell loads the PWA with
 * `?src=android-native`. Kept separate from `isAndroidApp()` (which is TWA-
 * specific) so the purchase router can tell "native shell, use the billing
 * bridge" from "legacy TWA, use Digital Goods". Critically, when we're in the
 * native shell we must NEVER fall back to the web/Airwallex path — Google Play
 * policy forbids external payment inside the app.
 */
export function isNativeAndroid(): boolean {
    try {
        if (sessionStorage.getItem(CHANNEL_KEY) === 'native') return true;
        const fromParam = typeof window !== 'undefined'
            && new URLSearchParams(window.location.search).get('src') === 'android-native';
        if (fromParam) {
            sessionStorage.setItem(CHANNEL_KEY, 'native');
            return true;
        }
    } catch { /* storage unavailable → not native */ }
    return false;
}
