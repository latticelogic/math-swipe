import { describe, it, expect } from 'vitest';
import { getRank, getMastery, MAX_RANK_XP, RANKS } from '../domains/math/ranks';

describe('getRank', () => {
    it('is Beginner at 0 XP with Learner next', () => {
        const r = getRank(0);
        expect(r.rank.name).toBe('Beginner');
        expect(r.nextRank?.name).toBe('Learner');
        expect(r.progress).toBe(0);
    });

    it('reports fractional progress toward the next rank', () => {
        const r = getRank(150); // between Learner(100) and Thinker(300)
        expect(r.rank.name).toBe('Learner');
        expect(r.nextRank?.name).toBe('Thinker');
        expect(r.progress).toBeCloseTo((150 - 100) / (300 - 100), 5);
    });

    it('caps at the top rank with no next and full progress', () => {
        const r = getRank(MAX_RANK_XP);
        expect(r.rank.name).toBe('Transcendent');
        expect(r.nextRank).toBeNull();
        expect(r.progress).toBe(1);
        // Above the cap it stays maxed.
        expect(getRank(999999).rank.name).toBe('Transcendent');
    });

    it('MAX_RANK_XP tracks the last rung so they never drift', () => {
        expect(MAX_RANK_XP).toBe(RANKS[RANKS.length - 1].xp);
    });
});

describe('getMastery', () => {
    it('is null below max rank', () => {
        expect(getMastery(0)).toBeNull();
        expect(getMastery(MAX_RANK_XP - 1)).toBeNull();
    });

    it('starts at level 1 exactly at max rank', () => {
        const m = getMastery(MAX_RANK_XP);
        expect(m).not.toBeNull();
        expect(m!.level).toBe(1);
        expect(m!.progress).toBe(0);
        expect(m!.xpForNext).toBe(MAX_RANK_XP + 25000); // 45,000
    });

    it('advances a level when a rung is fully paid (25k, then +10k each)', () => {
        // ML1 costs 25k (20k→45k). At 45k we are level 2 with 0 progress.
        const m2 = getMastery(45000);
        expect(m2!.level).toBe(2);
        expect(m2!.progress).toBe(0);
        expect(m2!.xpForNext).toBe(80000); // 45k + 35k

        // ML2 costs 35k (45k→80k). At 80k we are level 3.
        const m3 = getMastery(80000);
        expect(m3!.level).toBe(3);
        expect(m3!.xpForNext).toBe(125000); // 80k + 45k
    });

    it('reports mid-level progress', () => {
        const m = getMastery(MAX_RANK_XP + 12500); // halfway through the 25k first rung
        expect(m!.level).toBe(1);
        expect(m!.progress).toBeCloseTo(0.5, 5);
    });
});
