/**
 * Sound feedback — the audio companion to haptics.ts.
 *
 * Revisits the v1 "no audio" decision (CLAUDE.md): mobile games with audio get
 * muted in >80% of sessions, so sound is **opt-in, default OFF**, toggled in
 * Settings. What tips the balance to shipping it now: (1) it's the #1 tester
 * ask after haptics, and (2) tones are SYNTHESIZED via the Web Audio API — no
 * asset files, no loading cost, nothing to precache on a kid's data plan.
 *
 * Autoplay policy is satisfied for free: every sound fires from an answer,
 * i.e. inside the swipe gesture, so the AudioContext is created/resumed within
 * a user activation. On browsers without Web Audio (or in jsdom) every call is
 * a silent no-op — nothing to feature-detect at the call site, exactly like
 * haptics.
 *
 * Tone design mirrors the haptic language: correct = a bright two-note rise,
 * wrong = a soft low thud (gentle, never harsh — kids' confidence), milestone
 * = a short ascending arpeggio. Quiet by default (gain ~0.14).
 */

const PREF_KEY = 'math-swipe-sound';
let suppressed = false;
let ctx: AudioContext | null = null;

/** Opt-in, default OFF. */
function enabled(): boolean {
    try {
        return localStorage.getItem(PREF_KEY) === 'on';
    } catch {
        return false;
    }
}

export function isSoundOn(): boolean {
    return enabled();
}

export function setSoundOn(on: boolean): void {
    try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch { /* private mode */ }
    // Warm the context on the enabling tap (a user gesture) so the first real
    // sound isn't swallowed by a suspended context.
    if (on) getCtx()?.resume?.().catch(() => { /* ignore */ });
}

function getCtx(): AudioContext | null {
    if (suppressed) return null;
    if (ctx) return ctx;
    try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx = new Ctor();
        return ctx;
    } catch {
        return null;
    }
}

/** Play one shaped sine tone. `at` is an offset in seconds for sequencing. */
function tone(freq: number, start: number, dur: number, peak: number, type: OscillatorType = 'sine'): void {
    const ac = getCtx();
    if (!ac) return;
    const t0 = ac.currentTime + start;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    // Fast attack, exponential decay — a soft "blip", not a beep.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
}

/** Gate + resume before playing anything. */
function play(fn: () => void): void {
    if (!enabled()) return;
    const ac = getCtx();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => { /* ignore */ });
    try { fn(); } catch { /* audio scheduling can throw on some engines */ }
}

const V = 0.14; // master-ish peak gain

/** Bright two-note rise on a correct answer. */
export function soundCorrect(): void {
    play(() => {
        tone(523.25, 0, 0.12, V);      // C5
        tone(783.99, 0.06, 0.16, V);   // G5
    });
}

/** Soft low thud on a wrong answer — deliberately gentle. */
export function soundWrong(): void {
    play(() => {
        tone(196.0, 0, 0.18, V * 0.9, 'sine');   // G3
        tone(155.56, 0.02, 0.22, V * 0.7, 'sine'); // D#3
    });
}

/** Short ascending arpeggio on a streak milestone. */
export function soundMilestone(): void {
    play(() => {
        tone(523.25, 0, 0.12, V);      // C5
        tone(659.25, 0.09, 0.12, V);   // E5
        tone(783.99, 0.18, 0.14, V);   // G5
        tone(1046.5, 0.27, 0.2, V);    // C6
    });
}

/** Test hook — jsdom has no Web Audio; keep vitest silent + deterministic. */
export function _setSuppressedForTests(value: boolean): void {
    suppressed = value;
}
