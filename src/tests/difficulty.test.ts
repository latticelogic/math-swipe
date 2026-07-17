import { describe, it, expect } from 'vitest';
import {
    initialDifficultyState, stepDifficulty, resumeLevel, clampLevel,
    fastThresholdMs, slowThresholdMs,
    MIN_LEVEL, MAX_LEVEL, DEFAULT_LEVEL, RESUME_CAP,
    type DifficultyState,
} from '../engine/difficulty';

/** Feed a sequence of (ttsMs, correct) answers through the adjuster. */
function run(s: DifficultyState, answers: Array<[number, boolean]>): DifficultyState {
    return answers.reduce((acc, [tts, ok]) => stepDifficulty(acc, tts, ok), s);
}

describe('stepDifficulty — climbing', () => {
    it('levels up after 3 consecutive fast-correct answers', () => {
        const s = run(initialDifficultyState(2), [[1000, true], [1000, true], [1000, true]]);
        expect(s.level).toBe(3);
        expect(s.fastCount).toBe(0); // counter consumed
    });

    it('a flow-zone answer wipes climb progress (signals must be consecutive)', () => {
        const s = run(initialDifficultyState(2), [[1000, true], [1000, true], [3000, true], [1000, true]]);
        expect(s.level).toBe(2);
        expect(s.fastCount).toBe(1);
    });

    it('clamps at MAX_LEVEL', () => {
        const s = run(initialDifficultyState(MAX_LEVEL), [[1000, true], [1000, true], [1000, true]]);
        expect(s.level).toBe(MAX_LEVEL);
    });
});

describe('stepDifficulty — descending (the struggle counter)', () => {
    it('levels down after 2 consecutive slow-correct answers', () => {
        const s = run(initialDifficultyState(3), [[8000, true], [8000, true]]);
        expect(s.level).toBe(2);
    });

    it('levels down after 2 consecutive WRONG answers (fast guessing is not mastery)', () => {
        const s = run(initialDifficultyState(3), [[500, false], [500, false]]);
        expect(s.level).toBe(2);
    });

    it('levels down on a MIX of wrong + slow (one shared struggle counter)', () => {
        const s = run(initialDifficultyState(3), [[500, false], [8000, true]]);
        expect(s.level).toBe(2);
    });

    it('a single wrong answer does NOT move the level (but wipes climb progress)', () => {
        const s = run(initialDifficultyState(3), [[1000, true], [1000, true], [500, false]]);
        expect(s.level).toBe(3);
        expect(s.fastCount).toBe(0);
        expect(s.struggleCount).toBe(1);
    });

    it('a fast-correct answer clears accumulated struggle', () => {
        const s = run(initialDifficultyState(3), [[500, false], [1000, true], [500, false]]);
        expect(s.level).toBe(3); // struggle never reached 2 in a row
        expect(s.struggleCount).toBe(1);
    });

    it('clamps at MIN_LEVEL', () => {
        const s = run(initialDifficultyState(MIN_LEVEL), [[500, false], [500, false], [500, false], [500, false]]);
        expect(s.level).toBe(MIN_LEVEL);
    });
});

describe('level-scaled thresholds', () => {
    it('widens both bars as the level rises', () => {
        expect(fastThresholdMs(1)).toBe(1500);
        expect(fastThresholdMs(5)).toBe(2700);
        expect(slowThresholdMs(1)).toBe(4000);
        expect(slowThresholdMs(5)).toBe(7000);
    });

    it('a 2.3s answer is FAST at level 4 (climbs) but flow at level 1 (does not)', () => {
        const atL4 = run(initialDifficultyState(4), [[2300, true], [2300, true], [2300, true]]);
        expect(atL4.level).toBe(5);
        const atL1 = run(initialDifficultyState(1), [[2300, true], [2300, true], [2300, true]]);
        expect(atL1.level).toBe(1);
    });

    it('a 5s answer is SLOW at level 1 (descends) but flow at level 5 (stable)', () => {
        const atL2 = run(initialDifficultyState(2), [[5000, true], [5000, true]]);
        expect(atL2.level).toBe(1);
        const atL5 = run(initialDifficultyState(5), [[5000, true], [5000, true]]);
        expect(atL5.level).toBe(5); // 5s is a normal solve time at max level
    });
});

describe('session resume', () => {
    it('fresh user (nothing persisted) starts at the default', () => {
        expect(resumeLevel(null)).toBe(DEFAULT_LEVEL);
        expect(resumeLevel(NaN)).toBe(DEFAULT_LEVEL);
    });

    it('resumes at the persisted level, warm-up-capped below max', () => {
        expect(resumeLevel(3)).toBe(3);
        expect(resumeLevel(MAX_LEVEL)).toBe(RESUME_CAP); // never OPEN a session at max
    });

    it('a struggling player who left at 1 resumes at 1 (no arbitrary bump)', () => {
        expect(resumeLevel(1)).toBe(1);
    });

    it('clamps garbage', () => {
        expect(clampLevel(99)).toBe(MAX_LEVEL);
        expect(clampLevel(-3)).toBe(MIN_LEVEL);
        expect(clampLevel(Infinity)).toBe(DEFAULT_LEVEL);
    });
});
