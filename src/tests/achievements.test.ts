import { describe, it, expect } from 'vitest';
import { checkAchievements } from '../utils/achievements';
import { EVERY_MATH_ACHIEVEMENT, type MathAchievementStats } from '../domains/math/mathAchievements';

// Convenience wrapper matching the old 2-arg API used in all these tests
function checkMathAchievements(stats: MathAchievementStats, unlocked: Set<string>): string[] {
    return checkAchievements(EVERY_MATH_ACHIEVEMENT, stats, unlocked);
}

describe('achievements.ts', () => {

    const baseStats: MathAchievementStats = {
        totalCorrect: 0,
        totalSolved: 0,
        totalXP: 0,
        bestStreak: 0,
        dayStreak: 0,
        sessionsPlayed: 1,
        byType: {} as Record<string, { solved: number; correct: number }>,
        hardModeSolved: 0,
        hardModeCorrect: 0,
        hardModeBestStreak: 0,
        hardModeSessions: 0,
        hardModePerfects: 0,
        timedModeSolved: 0,
        timedModeCorrect: 0,
        timedModeBestStreak: 0,
        timedModeSessions: 0,
        timedModePerfects: 0,
        ultimateSolved: 0,
        ultimateCorrect: 0,
        ultimateBestStreak: 0,
        ultimateSessions: 0,
        ultimatePerfects: 0,
        sharesSent: 0,
    };

    it('awards streak-20 when best streak hits 20', () => {
        const stats: MathAchievementStats = { ...baseStats, bestStreak: 20 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('streak-20');
        expect(unlocked).toContain('streak-5'); // Also checks off previous milestones
    });

    it('awards sharphooter badge (90%+ over 50 questions)', () => {
        const stats: MathAchievementStats = { ...baseStats, totalSolved: 50, totalCorrect: 50 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('sharpshooter');
    });

    it('does not recursively award already unlocked badges', () => {
        const stats: MathAchievementStats = { ...baseStats, bestStreak: 10 };
        const prevUnlocked = new Set(['streak-10', 'streak-5']);
        const newlyUnlocked = checkMathAchievements(stats, prevUnlocked);
        expect(newlyUnlocked).toHaveLength(0); // Should be empty because it was already unlocked
    });

    it('awards dedicated badge for 7 days played', () => {
        const stats: MathAchievementStats = { ...baseStats, dayStreak: 7 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('dedicated');
    });

    it('awards spread-the-word on first share', () => {
        const stats: MathAchievementStats = { ...baseStats, sharesSent: 1 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('spread-the-word');
    });
});
