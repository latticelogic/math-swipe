/**
 * Haptic feedback wrapper.
 *
 * Browsers on Android support `navigator.vibrate(pattern)`. iOS Safari does
 * not (Apple has held this back). On platforms without support every call is
 * a silent no-op — there is nothing to feature-detect at the call site.
 *
 * Patterns are intentionally short (≤30 ms) — anything longer reads as
 * intrusive on a phone in a pocket. Wrong-answer is a "pulse-pulse" doublet
 * to give it a clearly distinct feel from a correct answer's single tap.
 */

let suppressed = false;

/** Read the runtime preference. Users can disable haptics by setting
 *  `localStorage["math-swipe-haptics"]` to "off". */
function readPreference(): boolean {
    try {
        return localStorage.getItem('math-swipe-haptics') !== 'off';
    } catch {
        return true;
    }
}

/** The native Android shell exposes crisp platform haptics (predefined tick /
 *  click / heavy-click effects) via window.AndroidHaptics — far better than
 *  web `navigator.vibrate`, which is coarse and curtailed in some WebViews.
 *  Absent in the browser / iOS, where we fall back to vibrate. */
function nativeHaptics(): { impact(type: string): void } | null {
    try {
        const w = window as unknown as {
            AndroidHaptics?: { impact(t: string): void };
            AppleHaptics?: { impact(t: string): void };
        };
        const a = w.AndroidHaptics ?? w.AppleHaptics;   // same semantic types on both shells
        return a && typeof a.impact === 'function' ? a : null;
    } catch {
        return null;
    }
}

/** nativeType: the semantic effect for the native bridge ("light" | "medium" |
 *  "heavy" | "success" | "warning"); pattern: the web-vibrate fallback. */
function buzz(nativeType: string, pattern: number | number[]): void {
    if (suppressed) return;
    if (!readPreference()) return;
    const native = nativeHaptics();
    if (native) {
        try {
            native.impact(nativeType);
            return;
        } catch {
            // fall through to web vibrate
        }
    }
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
        navigator.vibrate(pattern);
    } catch {
        // Some browsers throw on certain patterns; treat as no-op
    }
}

/** Brief tap on a swipe / button press. */
export function hapticTap(): void {
    buzz('light', 5);
}

/** Confident "yes" pulse on a correct answer. */
export function hapticCorrect(): void {
    buzz('success', 15);
}

/** Sharp "no" doublet on a wrong answer. */
export function hapticWrong(): void {
    buzz('warning', [20, 60, 20]);
}

/** Celebration burst — used on streak milestones. */
export function hapticMilestone(): void {
    buzz('heavy', [15, 40, 15, 40, 30]);
}

/** Test hook so vitest doesn't try to vibrate jsdom into the abyss. */
export function _setSuppressedForTests(value: boolean): void {
    suppressed = value;
}
