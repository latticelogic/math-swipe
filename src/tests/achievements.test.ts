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
        // All sub-thresholds that fire at bestStreak >= 10 must be pre-marked.
        const prevUnlocked = new Set(['streak-3', 'streak-5']);
        const newlyUnlocked = checkMathAchievements(stats, prevUnlocked);
        expect(newlyUnlocked).toHaveLength(0);
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

    // ── Early-trial ladder (added 2026-05-12 for habit-formation push) ──

    it('awards streak-3 (Warming Up) at first 3-streak', () => {
        const stats: MathAchievementStats = { ...baseStats, bestStreak: 3 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('streak-3');
    });

    it('awards daily-1 after completing one full Daily Challenge', () => {
        const stats: MathAchievementStats = {
            ...baseStats,
            byType: { daily: { solved: 10, correct: 9 } } as Record<string, { solved: number; correct: number }>,
        };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('daily-1');
    });

    it('does NOT award daily-1 for a partial daily (under 10 solved)', () => {
        const stats: MathAchievementStats = {
            ...baseStats,
            byType: { daily: { solved: 5, correct: 5 } } as Record<string, { solved: number; correct: number }>,
        };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).not.toContain('daily-1');
    });

    it('awards topic-explorer once 3+ non-meta topics each have ≥5 solved', () => {
        const stats: MathAchievementStats = {
            ...baseStats,
            byType: {
                add: { solved: 5, correct: 5 },
                multiply: { solved: 6, correct: 5 },
                compare: { solved: 5, correct: 4 },
            } as Record<string, { solved: number; correct: number }>,
        };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('topic-explorer');
    });

    it('does NOT award topic-explorer if only 2 topics have ≥5 solved', () => {
        const stats: MathAchievementStats = {
            ...baseStats,
            byType: {
                add: { solved: 50, correct: 50 },
                multiply: { solved: 50, correct: 50 },
                compare: { solved: 3, correct: 3 }, // under threshold
            } as Record<string, { solved: number; correct: number }>,
        };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).not.toContain('topic-explorer');
    });

    it('topic-explorer ignores meta types (daily, mix, speedrun, challenge)', () => {
        const stats: MathAchievementStats = {
            ...baseStats,
            byType: {
                daily: { solved: 100, correct: 100 },
                'mix-all': { solved: 100, correct: 100 },
                speedrun: { solved: 100, correct: 100 },
                add: { solved: 5, correct: 5 }, // only 1 real topic
            } as Record<string, { solved: number; correct: number }>,
        };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).not.toContain('topic-explorer');
    });

    it('awards three-day at 3-day streak', () => {
        const stats: MathAchievementStats = { ...baseStats, dayStreak: 3 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('three-day');
    });

    it('awards accuracy-early at 20 solved with 90%+ accuracy', () => {
        const stats: MathAchievementStats = { ...baseStats, totalSolved: 20, totalCorrect: 18 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('accuracy-early');
    });

    it('does NOT award accuracy-early under 20 solved', () => {
        const stats: MathAchievementStats = { ...baseStats, totalSolved: 19, totalCorrect: 19 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).not.toContain('accuracy-early');
    });

    it('awards quick-fifty at 50 solved', () => {
        const stats: MathAchievementStats = { ...baseStats, totalSolved: 50, totalCorrect: 40 };
        const unlocked = checkMathAchievements(stats, new Set());
        expect(unlocked).toContain('quick-fifty');
    });

    it('a casual 14-day-trial player earns 5+ achievements (regression guard)', () => {
        // Simulates a user who played ~5 problems/day for 10 of 14 days,
        // tried 3 topics, completed one daily, hit a few short streaks,
        // ~85% accuracy. This is the median trial-period engagement
        // profile we're optimising for — they should feel like the app
        // is actually rewarding them, not silent.
        const stats: MathAchievementStats = {
            ...baseStats,
            totalSolved: 52,
            totalCorrect: 44, // ~85% accuracy
            bestStreak: 6,
            dayStreak: 4,
            byType: {
                add: { solved: 12, correct: 11 },
                multiply: { solved: 10, correct: 8 },
                compare: { solved: 8, correct: 7 },
                daily: { solved: 10, correct: 8 },
                'mix-all': { solved: 12, correct: 10 },
            } as Record<string, { solved: number; correct: number }>,
        };
        const unlocked = checkMathAchievements(stats, new Set());
        // Must include the early-trial wins; this is the conversion lever
        expect(unlocked.length).toBeGreaterThanOrEqual(5);
        expect(unlocked).toContain('first-steps');
        expect(unlocked).toContain('streak-3');
        expect(unlocked).toContain('streak-5');
        expect(unlocked).toContain('daily-1');
        expect(unlocked).toContain('topic-explorer');
        expect(unlocked).toContain('three-day');
        expect(unlocked).toContain('quick-fifty');
    });
});
