import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateDailyChallenge, generateChallenge } from '../utils/dailyChallenge';
import { DAILY_COUNT } from '../domains/math/mathDailyConfig';

describe('dailyChallenge', () => {
    describe('generateDailyChallenge', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            // Pin "today" so the snapshot is stable across CI machines
            vi.setSystemTime(new Date(2026, 4, 15, 12, 0, 0));
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns DAILY_COUNT problems', () => {
            const { problems } = generateDailyChallenge();
            expect(problems).toHaveLength(DAILY_COUNT);
        });

        it('is fully deterministic for the same day (every problem identical)', () => {
            const a = generateDailyChallenge();
            const b = generateDailyChallenge();
            expect(a.problems.length).toBe(b.problems.length);
            for (let i = 0; i < a.problems.length; i++) {
                expect(a.problems[i].expression).toBe(b.problems[i].expression);
                expect(a.problems[i].answer).toBe(b.problems[i].answer);
                expect(a.problems[i].options).toEqual(b.problems[i].options);
            }
        });

        it('every problem has a valid options array with the answer present', () => {
            const { problems } = generateDailyChallenge();
            for (const p of problems) {
                expect(p.options).toHaveLength(3);
                expect(p.options[p.correctIndex]).toBe(p.answer);
                // Options must be unique
                expect(new Set(p.options).size).toBe(3);
            }
        });

        it('produces a different problem set on a different day', () => {
            const today = generateDailyChallenge();
            vi.setSystemTime(new Date(2026, 4, 16, 12, 0, 0));
            const tomorrow = generateDailyChallenge();
            // At least *some* expressions must differ (otherwise seeding is broken)
            const allSame = today.problems.every((p, i) =>
                p.expression === tomorrow.problems[i].expression);
            expect(allSame).toBe(false);
        });

        it('formats dateLabel as a short month/day string', () => {
            const { dateLabel } = generateDailyChallenge();
            expect(dateLabel).toMatch(/[A-Z][a-z]{2,} \d+/); // e.g. "May 15"
        });

        it('assigns deterministic, predictable IDs', () => {
            const { problems } = generateDailyChallenge();
            for (let i = 0; i < problems.length; i++) {
                expect(problems[i].id).toMatch(new RegExp(`^daily-.+-${i}$`));
            }
        });
    });

    describe('generateChallenge', () => {
        it('produces the same problems for the same challenge ID', () => {
            const a = generateChallenge('abc-123');
            const b = generateChallenge('abc-123');
            for (let i = 0; i < a.length; i++) {
                expect(a[i].expression).toBe(b[i].expression);
                expect(a[i].answer).toBe(b[i].answer);
                expect(a[i].options).toEqual(b[i].options);
            }
        });

        it('produces different problems for different IDs', () => {
            const a = generateChallenge('seed-A');
            const b = generateChallenge('seed-B');
            const someDiffer = a.some((p, i) => p.expression !== b[i].expression);
            expect(someDiffer).toBe(true);
        });

        it('returns DAILY_COUNT problems', () => {
            expect(generateChallenge('test')).toHaveLength(DAILY_COUNT);
        });

        it('every problem has a valid answer-in-options invariant', () => {
            const problems = generateChallenge('valid-answers-test');
            for (const p of problems) {
                expect(p.options[p.correctIndex]).toBe(p.answer);
                expect(new Set(p.options).size).toBe(3);
            }
        });

        it('does not throw on edge-case challenge IDs', () => {
            expect(() => generateChallenge('')).not.toThrow();
            expect(() => generateChallenge('🎮')).not.toThrow();
            expect(() => generateChallenge('a'.repeat(1000))).not.toThrow();
        });
    });
});
