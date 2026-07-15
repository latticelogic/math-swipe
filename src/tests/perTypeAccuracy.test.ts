import { describe, it, expect } from 'vitest';
import { generateProblem } from '../utils/mathGenerator';
import { generateDailyChallenge } from '../utils/dailyChallenge';

/**
 * Per-operation accuracy: every generated problem is stamped with the concrete
 * operation it tests (`.type`), and daily/mixed modes resolve to a real
 * operation rather than a 'daily'/'mix' bucket. This is what lets the "by type"
 * grid attribute daily and mixed answers to the right operation.
 *
 * The recordSession merge is not exported, so — as with statsIntegration.test —
 * its additive byType-delta logic is mirrored here and tested directly.
 */

const MODE_LABELS = ['daily', 'challenge', 'mix-basic', 'mix-all', 'speedrun'];

describe('problem.type tagging', () => {
    it('stamps a concrete single-topic problem with its own type', () => {
        for (const t of ['multiply', 'add', 'subtract', 'divide', 'square'] as const) {
            const p = generateProblem(3, t, false);
            expect(p.type).toBe(t);
        }
    });

    it('resolves mixed/daily modes to a concrete operation, never the mode label', () => {
        for (const mode of ['mix-basic', 'mix-all', 'daily'] as const) {
            for (let i = 0; i < 40; i++) {
                const p = generateProblem(3, mode, false);
                expect(p.type).toBeDefined();
                expect(MODE_LABELS).not.toContain(p.type);
            }
        }
    });

    it('resolves mix-basic only to the four basic operations', () => {
        const basics = new Set(['add', 'subtract', 'multiply', 'divide']);
        for (let i = 0; i < 60; i++) {
            expect(basics.has(generateProblem(3, 'mix-basic', false).type as string)).toBe(true);
        }
    });
});

describe('daily challenge items carry a concrete type', () => {
    it('every daily problem is tagged with a real operation', () => {
        const { problems } = generateDailyChallenge();
        expect(problems.length).toBeGreaterThan(0);
        for (const p of problems) {
            expect(p.type).toBeDefined();
            expect(MODE_LABELS).not.toContain(p.type);
        }
    });

    it('a single daily set spans more than one operation (so the grid gets real spread)', () => {
        const { problems } = generateDailyChallenge();
        const distinct = new Set(problems.map(p => p.type));
        expect(distinct.size).toBeGreaterThan(1);
    });
});

// ── Mirror of recordSession's additive byType-delta merge ──────────────────────
type TypeStat = { solved: number; correct: number };
function mergeByTypeDelta(
    prev: Record<string, TypeStat>,
    delta: Record<string, TypeStat> | undefined,
    questionType: string,
    answered: number,
    correct: number,
): Record<string, TypeStat> {
    const entries = delta ? Object.entries(delta) : [];
    if (entries.length > 0) {
        return entries.reduce((acc, [key, d]) => {
            const base = acc[key] || { solved: 0, correct: 0 };
            acc[key] = { solved: base.solved + d.solved, correct: base.correct + d.correct };
            return acc;
        }, { ...prev });
    }
    const pt = prev[questionType] || { solved: 0, correct: 0 };
    return { ...prev, [questionType]: { solved: pt.solved + answered, correct: pt.correct + correct } };
}

describe('recordSession byType merge', () => {
    it('falls back to the single mode bucket when no delta is given (legacy path)', () => {
        const next = mergeByTypeDelta({}, undefined, 'multiply', 10, 8);
        expect(next.multiply).toEqual({ solved: 10, correct: 8 });
    });

    it('merges a per-operation delta into the right buckets', () => {
        const prev = { multiply: { solved: 5, correct: 5 } };
        const delta = { multiply: { solved: 3, correct: 2 }, add: { solved: 4, correct: 4 } };
        const next = mergeByTypeDelta(prev, delta, 'daily', 7, 6);
        expect(next.multiply).toEqual({ solved: 8, correct: 7 });
        expect(next.add).toEqual({ solved: 4, correct: 4 });
    });

    it('keeps the daily mode bucket alongside the per-operation buckets (daily achievement stays intact)', () => {
        // A full 10-problem daily: each answer credits its operation AND 'daily'.
        const delta = {
            add: { solved: 4, correct: 4 },
            multiply: { solved: 6, correct: 5 },
            daily: { solved: 10, correct: 9 },
        };
        const next = mergeByTypeDelta({}, delta, 'daily', 10, 9);
        expect(next.daily.solved).toBe(10); // daily-1 achievement checks >= 10
        expect(next.add.solved + next.multiply.solved).toBe(10);
    });

    it('does not double-count: op buckets sum to the answered total', () => {
        const delta = { add: { solved: 3, correct: 3 }, subtract: { solved: 2, correct: 1 } };
        const next = mergeByTypeDelta({}, delta, 'mix-basic', 5, 4);
        const opSolved = (next.add?.solved ?? 0) + (next.subtract?.solved ?? 0);
        expect(opSolved).toBe(5);
    });
});
