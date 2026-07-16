import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isSoundOn, setSoundOn, soundCorrect, soundWrong, soundMilestone, _setSuppressedForTests } from '../utils/sound';

/**
 * Sound is opt-in (default OFF) and a pure no-op where Web Audio is absent
 * (jsdom, older browsers) — the invariants that keep it from surprising a
 * player or crashing a test. Tone scheduling itself isn't asserted (no
 * AudioContext in jsdom); the suppress hook guarantees the calls are inert.
 */

beforeEach(() => {
    _setSuppressedForTests(true); // no AudioContext in jsdom regardless
    try { localStorage.removeItem('math-swipe-sound'); } catch { /* ignore */ }
});
afterEach(() => {
    _setSuppressedForTests(false);
    try { localStorage.removeItem('math-swipe-sound'); } catch { /* ignore */ }
});

describe('sound preference', () => {
    it('defaults OFF (respects the muted-in-80%-of-sessions insight)', () => {
        expect(isSoundOn()).toBe(false);
    });

    it('setSoundOn(true) persists as "on"; false persists as "off"', () => {
        setSoundOn(true);
        expect(isSoundOn()).toBe(true);
        expect(localStorage.getItem('math-swipe-sound')).toBe('on');
        setSoundOn(false);
        expect(isSoundOn()).toBe(false);
        expect(localStorage.getItem('math-swipe-sound')).toBe('off');
    });
});

describe('sound playback safety', () => {
    it('every sound is a no-op when disabled', () => {
        setSoundOn(false);
        expect(() => { soundCorrect(); soundWrong(); soundMilestone(); }).not.toThrow();
    });

    it('every sound is a no-op with no AudioContext, even when enabled', () => {
        setSoundOn(true); // suppressed → getCtx() returns null
        expect(() => { soundCorrect(); soundWrong(); soundMilestone(); }).not.toThrow();
    });
});
