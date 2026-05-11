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

function buzz(pattern: number | number[]): void {
    if (suppressed) return;
    if (!readPreference()) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
        navigator.vibrate(pattern);
    } catch {
        // Some browsers throw on certain patterns; treat as no-op
    }
}

/** Brief tap on a swipe / button press. */
export function hapticTap(): void {
    buzz(5);
}

/** Confident "yes" pulse on a correct answer. */
export function hapticCorrect(): void {
    buzz(15);
}

/** Sharp "no" doublet on a wrong answer. */
export function hapticWrong(): void {
    buzz([20, 60, 20]);
}

/** Celebration burst — used on streak milestones. */
export function hapticMilestone(): void {
    buzz([15, 40, 15, 40, 30]);
}

/** Test hook so vitest doesn't try to vibrate jsdom into the abyss. */
export function _setSuppressedForTests(value: boolean): void {
    suppressed = value;
}
