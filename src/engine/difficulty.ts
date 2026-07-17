/**
 * engine/difficulty.ts — the adaptive-difficulty adjuster (pure logic).
 *
 * The 1–5 `difficulty` dial that the generators consume (see
 * docs/difficulty-curves.md) is moved by response-time + correctness
 * signals. The React hook (`hooks/useDifficulty.ts`) is a thin wrapper
 * around this module so the rules are unit-testable.
 *
 * Tuning rationale (2026-07-17 pass — supersedes the original flat rules):
 *
 *  1. WRONG ANSWERS DESCEND. The old rules only lowered the level on
 *     slow-but-correct answers, so a player missing repeatedly (fast
 *     guesses included) was stuck at a level that was beating them.
 *     Misses are the strongest "too hard" signal there is. Wrong answers
 *     and slow-correct answers now feed one shared "struggle" counter:
 *     two in a row (in any mix) → level down. Confidence-first: get a
 *     struggling kid back to winnable problems within two answers.
 *
 *  2. THRESHOLDS SCALE WITH LEVEL. A flat <1.5s "fast" bar made level
 *     4→5 unreachable on real topics (47×8 is legitimately not a 1.5s
 *     problem) while a flat >4s "slow" bar made level 5 unstable once
 *     reached (4s is a NORMAL solve time up there). Both bars now widen
 *     as the level rises, so "fast for this level" is what climbs and
 *     "slow for this level" is what descends.
 *
 *  3. THE LEVEL PERSISTS ACROSS SESSIONS (hook-side, via localStorage),
 *     resumed with a warm-up cap of 4 so no session ever OPENS at max
 *     difficulty. A struggling player who left at 1 resumes at 1 — they
 *     are not arbitrarily bumped back to 2.
 */

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 5;
export const DEFAULT_LEVEL = 2;

/** Sessions never START above this — the first problems of a session are
 *  a warm-up even for a player who left at max. */
export const RESUME_CAP = 4;

const FAST_BASE_MS = 1500;
const FAST_PER_LEVEL_MS = 300;
const SLOW_BASE_MS = 4000;
const SLOW_PER_LEVEL_MS = 750;

const FAST_STREAK_TO_LEVEL_UP = 3;
const STRUGGLES_TO_LEVEL_DOWN = 2;

/** "Fast for this level" — the climb bar. L1 1.5s → L5 2.7s. */
export function fastThresholdMs(level: number): number {
    return FAST_BASE_MS + (level - MIN_LEVEL) * FAST_PER_LEVEL_MS;
}

/** "Slow for this level" — the descend bar. L1 4.0s → L5 7.0s. */
export function slowThresholdMs(level: number): number {
    return SLOW_BASE_MS + (level - MIN_LEVEL) * SLOW_PER_LEVEL_MS;
}

export interface DifficultyState {
    level: number;
    /** Consecutive fast-correct answers toward a level-up. */
    fastCount: number;
    /** Consecutive struggle signals (wrong OR slow-correct) toward a level-down. */
    struggleCount: number;
}

export function initialDifficultyState(level: number = DEFAULT_LEVEL): DifficultyState {
    return { level: clampLevel(level), fastCount: 0, struggleCount: 0 };
}

/** Clamp a (possibly persisted/garbage) level into the valid range. */
export function clampLevel(level: number): number {
    if (!Number.isFinite(level)) return DEFAULT_LEVEL;
    return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.round(level)));
}

/** The level a NEW SESSION resumes at, given the persisted one. */
export function resumeLevel(persisted: number | null): number {
    if (persisted === null || !Number.isFinite(persisted)) return DEFAULT_LEVEL;
    return Math.min(RESUME_CAP, clampLevel(persisted));
}

/** Advance the adjuster by one answer. Pure — returns the next state. */
export function stepDifficulty(s: DifficultyState, ttsMs: number, correct: boolean): DifficultyState {
    // Struggle signal: a wrong answer (any speed — fast guessing is not
    // mastery) or a correct-but-slow-for-this-level answer.
    if (!correct || ttsMs > slowThresholdMs(s.level)) {
        const struggles = s.struggleCount + 1;
        if (struggles >= STRUGGLES_TO_LEVEL_DOWN) {
            return { level: Math.max(s.level - 1, MIN_LEVEL), fastCount: 0, struggleCount: 0 };
        }
        return { ...s, fastCount: 0, struggleCount: struggles };
    }

    // Correct and fast-for-this-level: progress toward a level-up.
    if (ttsMs < fastThresholdMs(s.level)) {
        const fast = s.fastCount + 1;
        if (fast >= FAST_STREAK_TO_LEVEL_UP) {
            return { level: Math.min(s.level + 1, MAX_LEVEL), fastCount: 0, struggleCount: 0 };
        }
        return { ...s, fastCount: fast, struggleCount: 0 };
    }

    // Flow zone (correct, neither fast nor slow for this level): the level is
    // right — reset both counters so only CONSECUTIVE signals move it.
    return { ...s, fastCount: 0, struggleCount: 0 };
}
