import { describe, it, expect } from 'vitest';
import { dailyStreakBonus, nextDailyMilestone, DAILY_STREAK_LADDER } from '../utils/dailyStreak';

describe('dailyStreakBonus', () => {
    it('pays nothing on non-milestone days', () => {
        expect(dailyStreakBonus(1)).toBe(0);
        expect(dailyStreakBonus(2)).toBe(0);
        expect(dailyStreakBonus(6)).toBe(0);
        expect(dailyStreakBonus(29)).toBe(0);
        expect(dailyStreakBonus(99)).toBe(0);
    });

    it('pays the exact rung amount on each fixed milestone', () => {
        for (const rung of DAILY_STREAK_LADDER) {
            expect(dailyStreakBonus(rung.day)).toBe(rung.xp);
        }
    });

    it('repeats every 50 days past the fixed ladder (eternal flame)', () => {
        expect(dailyStreakBonus(150)).toBe(250);
        expect(dailyStreakBonus(200)).toBe(250);
        expect(dailyStreakBonus(500)).toBe(250);
    });

    it('does not double-count between fixed ladder and repeat rule', () => {
        // 100 is a fixed rung (750), not the repeat amount (250)
        expect(dailyStreakBonus(100)).toBe(750);
        // 50 is a fixed... no it is not a rung; and <=100 so no repeat either
        expect(dailyStreakBonus(50)).toBe(0);
    });

    it('never pays on day 0 / negative', () => {
        expect(dailyStreakBonus(0)).toBe(0);
        expect(dailyStreakBonus(-3)).toBe(0);
    });
});

describe('nextDailyMilestone', () => {
    it('returns the next fixed rung within the ladder', () => {
        expect(nextDailyMilestone(0)).toBe(3);
        expect(nextDailyMilestone(3)).toBe(7);
        expect(nextDailyMilestone(10)).toBe(14);
        expect(nextDailyMilestone(59)).toBe(60);
        expect(nextDailyMilestone(99)).toBe(100);
    });

    it('returns the next 50-multiple past the fixed ladder', () => {
        expect(nextDailyMilestone(100)).toBe(150);
        expect(nextDailyMilestone(120)).toBe(150);
        expect(nextDailyMilestone(150)).toBe(200);
    });
});
