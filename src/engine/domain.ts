/**
 * engine/domain.ts
 *
 * Domain-agnostic types for the swipe game engine.
 * Any educational subject (math, spelling, geography…) implements these interfaces.
 * Subject-specific logic lives in src/domains/<subject>/.
 */

// ── Core data item ───────────────────────────────────────────────────────────

/**
 * A single question / challenge item presented to the player.
 * Replaces the math-specific `Problem` at the engine layer.
 * Subject generators produce `EngineItem`; the rest of the engine never
 * needs to know whether it's a math problem, a spelling word, or a flag.
 */
export interface EngineItem {
    id: string;
    /**
     * Primary display string, e.g. "9 × 8", "acompañar", "🇫🇷"
     * Optional so existing Problem (which uses `expression`) can be cast without error.
     */
    prompt?: string;
    /** Canonical correct answer value — used for equality check only */
    answer: number | string;
    /** Exactly 3 shuffled choices */
    options: (number | string)[];
    /** Optional display labels when options need pretty-printing (e.g. fractions) */
    optionLabels?: string[];
    /** Index into `options[]` that equals `answer` */
    correctIndex: number;
    /** Set by the engine when the item becomes active — do not set in generators */
    startTime?: number;
    /**
     * Optional rich metadata for subject-specific visuals.
     * e.g. math bonds: { visual: 'bond', bondTotal: 10, bondPart: 3 }
     * e.g. KaTeX:       { latex: '\\frac{1}{2} + \\frac{1}{3}' }
     * The game engine is entirely blind to this — only the subject's
     * `renderPrompt` / `renderVisual` renderers use it.
     */
    meta?: Record<string, unknown>;
}

// ── Swipe directions ─────────────────────────────────────────────────────────

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

/** Maps swipe direction to option index (engine responsibility) */
export const SWIPE_TO_INDEX: Record<Exclude<SwipeDirection, 'up'>, number> = {
    left: 0,
    down: 1,
    right: 2,
};

// ── Companion / mascot states ─────────────────────────────────────────────────

export type ChalkState =
    | 'idle'
    | 'success'
    | 'fail'
    | 'streak'
    | 'comeback'
    | 'struggling';

/**
 * 'near-miss' indicates a wrong answer that's within ~15% of the correct
 * value (or off-by-1 for small integers). UI treats it as wrong (streak
 * resets, no points) but uses softer color + gentler shake — the
 * "ohhh, close!" feel — so wrong answers don't read as pure failure.
 * Important for kids' confidence: most "almost right" mistakes are real
 * thinking, not random guesses.
 */
export type FeedbackFlash = 'none' | 'correct' | 'wrong' | 'near-miss';

// ── Engine configuration ──────────────────────────────────────────────────────

/**
 * All engine-level knobs in one object.
 * Pass to `useGameLoop` to override defaults.
 * Forks that want different timing / speedrun length just change this.
 */
export interface GameConfig {
    /** Pre-generated problem buffer (infinite mode only) */
    bufferSize: number;
    /** Number of correct answers to win a speedrun round */
    speedrunCount: number;
    /** Ms before advancing to next problem after a correct answer */
    autoAdvanceMs: number;
    /** Ms before advancing to next problem after a wrong answer */
    failPauseMs: number;
    /** Ms per question in timed mode (timer expires = auto-wrong) */
    timedModeMs: number;
    /** Streak thresholds → emoji displayed centre screen */
    milestones: Record<number, string>;
    /**
     * Question-type ID used for speedrun.
     * The generator for this type must be registered via generateItem.
     */
    speedrunTypeId: string;
    /** Question-type IDs that are "finite sets" (daily, challenge).
     *  The engine will not refill the buffer for these types. */
    finiteTypeIds: string[];
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
    bufferSize: 8,
    speedrunCount: 10,
    autoAdvanceMs: 150,
    failPauseMs: 400,
    timedModeMs: 10_000,
    // Milestone tiers — strings act as keys into the MilestoneBurst SVG
    // renderer (see src/components/MilestoneBurst.tsx). Each tier gets a
    // distinct visual: sparkle (gentle), flame (warm), bolt (electric),
    // crown (regal), trophy (legendary). Higher tier = larger animation,
    // longer duration, more particle elaboration.
    milestones: { 3: 'sparkle', 5: 'flame', 10: 'bolt', 25: 'crown', 50: 'trophy' },
    speedrunTypeId: 'speedrun',
    finiteTypeIds: ['daily', 'challenge'],
};
