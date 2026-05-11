import { describe, it, expect } from 'vitest';
import { scoreCorrect, scorePenalty, FAST_ANSWER_MS } from '../engine/scoring';

describe('engine/scoring', () => {
    describe('scoreCorrect', () => {
        it('awards 10 points for a non-streak, non-fast answer', () => {
            expect(scoreCorrect(1, false)).toBe(10);
            expect(scoreCorrect(4, false)).toBe(10);
        });

        it('adds a 5-point bonus per 5-streak threshold', () => {
            expect(scoreCorrect(5, false)).toBe(10 + 5);
            expect(scoreCorrect(10, false)).toBe(10 + 10);
            expect(scoreCorrect(20, false)).toBe(10 + 20);
        });

        it('adds 2 points for a fast answer', () => {
            expect(scoreCorrect(1, true)).toBe(12);
            expect(scoreCorrect(5, true)).toBe(17);
        });

        it('handles a 0-streak (first answer) gracefully', () => {
            expect(scoreCorrect(0, false)).toBe(10);
            expect(scoreCorrect(0, true)).toBe(12);
        });

        it('is monotonic in streak (never decreases)', () => {
            let prev = -1;
            for (let s = 0; s <= 100; s++) {
                const v = scoreCorrect(s, false);
                expect(v).toBeGreaterThanOrEqual(prev);
                prev = v;
            }
        });
    });

    describe('scorePenalty', () => {
        it('subtracts 5 from the current score', () => {
            expect(scorePenalty(20)).toBe(15);
            expect(scorePenalty(5)).toBe(0);
        });

        it('clamps at 0 (never goes negative)', () => {
            expect(scorePenalty(0)).toBe(0);
            expect(scorePenalty(3)).toBe(0);
        });
    });

    describe('FAST_ANSWER_MS', () => {
        it('is a positive number', () => {
            expect(FAST_ANSWER_MS).toBeGreaterThan(0);
        });
    });
});
