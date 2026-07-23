import { describe, it, expect, beforeEach, vi } from 'vitest';
import { maybeRequestReview, pushWidgetStats } from '../utils/nativeShell';

/**
 * The optional native-shell bridges (utils/nativeShell.ts). Two invariants:
 *   1. Everything is a SILENT NO-OP outside the shell — the same web build runs
 *      in plain browsers, so a missing bridge must never throw or log errors.
 *   2. The in-app review ask is throttled hard (once per ~45 days) — Play also
 *      quota-limits it, but our side must not even ask.
 */

type ShellWindow = Window & {
    AndroidReview?: { requestReview: () => void };
    AndroidShell?: { setStats: (s: number, d: boolean) => void };
};

beforeEach(() => {
    localStorage.clear();
    delete (window as ShellWindow).AndroidReview;
    delete (window as ShellWindow).AndroidShell;
});

describe('maybeRequestReview', () => {
    it('no bridge → silent no-op', () => {
        expect(() => maybeRequestReview(true)).not.toThrow();
    });

    it('asks once at a good moment, then throttles', () => {
        const spy = vi.fn();
        (window as ShellWindow).AndroidReview = { requestReview: spy };
        maybeRequestReview(true);
        expect(spy).toHaveBeenCalledTimes(1);
        // Immediately again — throttled (45-day window)
        maybeRequestReview(true);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('never asks when the session was not good', () => {
        const spy = vi.fn();
        (window as ShellWindow).AndroidReview = { requestReview: spy };
        maybeRequestReview(false);
        expect(spy).not.toHaveBeenCalled();
    });

    it('asks again once the throttle window has passed', () => {
        const spy = vi.fn();
        (window as ShellWindow).AndroidReview = { requestReview: spy };
        // Simulate a 46-day-old previous ask
        localStorage.setItem('mc-native-review-asked', String(Date.now() - 46 * 86_400_000));
        maybeRequestReview(true);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});

describe('pushWidgetStats', () => {
    it('no bridge → silent no-op', () => {
        expect(() => pushWidgetStats(5, true)).not.toThrow();
    });

    it('forwards floored, non-negative values to the widget', () => {
        const spy = vi.fn();
        (window as ShellWindow).AndroidShell = { setStats: spy };
        pushWidgetStats(3.9, true);
        expect(spy).toHaveBeenCalledWith(3, true);
        pushWidgetStats(-2, false);
        expect(spy).toHaveBeenCalledWith(0, false);
    });

    it('a throwing bridge never propagates', () => {
        (window as ShellWindow).AndroidShell = { setStats: () => { throw new Error('boom'); } };
        expect(() => pushWidgetStats(1, false)).not.toThrow();
    });
});
