/**
 * domains/math/mathAchievements.ts
 *
 * Math-specific achievement definitions and stats snapshot type.
 * Moved from src/utils/achievements.ts — keeps subject logic in the domain.
 */
import type { Achievement } from '../../utils/achievements';
import type { QuestionType } from './mathCategories';

// ── Stats snapshot ────────────────────────────────────────────────────────────

/** Stats snapshot used for math achievement checks */
export interface MathAchievementStats {
    totalXP: number;
    totalSolved: number;
    totalCorrect: number;
    bestStreak: number;
    dayStreak: number;
    sessionsPlayed: number;
    byType: Record<QuestionType, { solved: number; correct: number }>;
    // Hard mode
    hardModeSolved: number;
    hardModeCorrect: number;
    hardModeBestStreak: number;
    hardModeSessions: number;
    hardModePerfects: number;
    // Timed mode
    timedModeSolved: number;
    timedModeCorrect: number;
    timedModeBestStreak: number;
    timedModeSessions: number;
    timedModePerfects: number;
    // Ultimate (hard + timed)
    ultimateSolved: number;
    ultimateCorrect: number;
    ultimateBestStreak: number;
    ultimateSessions: number;
    ultimatePerfects: number;
    // Social
    sharesSent: number;
}

// ── Achievement lists ─────────────────────────────────────────────────────────

// Achievement descriptions read in two places: the locked-state card (where
// they hint at the unlock criteria) and the post-unlock celebration. So
// they need to be specific enough to tell you HOW to unlock, but framed as
// an invitation, not a checklist.

const CORE_ACHIEVEMENTS: Achievement<MathAchievementStats>[] = [
    {
        id: 'first-steps',
        name: 'First Steps',
        desc: 'Solve your very first problem.',
        check: s => s.totalSolved >= 1,
    },
    {
        id: 'streak-5',
        name: 'On Fire',
        desc: 'Five correct in a row, no slipups.',
        check: s => s.bestStreak >= 5,
    },
    {
        id: 'streak-20',
        name: 'Unstoppable',
        desc: 'Twenty in a row. Pure focus.',
        check: s => s.bestStreak >= 20,
    },
    {
        id: 'century',
        name: 'Century Club',
        desc: '100 problems solved.',
        check: s => s.totalSolved >= 100,
    },
    {
        id: 'math-machine',
        name: 'Math Machine',
        desc: '500 problems. That\'s real volume.',
        check: s => s.totalSolved >= 500,
    },
    {
        id: 'sharpshooter',
        name: 'Sharpshooter',
        desc: '90%+ accuracy across 50+ problems.',
        check: s => s.totalSolved >= 50 && (s.totalCorrect / s.totalSolved) >= 0.9,
    },
    {
        id: 'dedicated',
        name: 'Dedicated',
        desc: 'Seven days in a row. A real habit.',
        check: s => s.dayStreak >= 7,
    },
    {
        id: 'all-rounder',
        name: 'All-Rounder',
        desc: 'Ten of every topic. No weak spots.',
        check: s => {
            const META: string[] = ['daily', 'challenge', 'mix-basic', 'mix-all', 'speedrun', 'ghost'];
            const validEntries = Object.entries(s.byType).filter(([k]) => !META.includes(k));
            if (validEntries.length < 10) return false;
            return validEntries.every(([, t]) => t.solved >= 10);
        },
    },
    {
        id: 'spread-the-word',
        name: 'Spread the Word',
        desc: 'Shared your first score. Nice — pass it on.',
        check: s => s.sharesSent >= 1,
    },
];

const HARD_MODE_ACHIEVEMENTS: Achievement<MathAchievementStats>[] = [
    { id: 'skull-initiate', name: 'Skull Initiate', desc: 'You took on hard mode. Welcome to the deep end.', check: s => s.hardModeSessions >= 1 },
    { id: 'skull-warrior', name: 'Skull Warrior', desc: '50 problems in hard mode. Steady hands.', check: s => s.hardModeSolved >= 50 },
    { id: 'skull-legend', name: 'Skull Legend', desc: '200 in hard mode. Veteran territory.', check: s => s.hardModeSolved >= 200 },
    { id: 'skull-streak', name: 'Deathstreak', desc: 'Ten in a row — in hard mode. Wow.', check: s => s.hardModeBestStreak >= 10 },
    { id: 'skull-sharp', name: 'Skull Sniper', desc: '90%+ accuracy in hard mode (30+ solved).', check: s => s.hardModeSolved >= 30 && (s.hardModeCorrect / s.hardModeSolved) >= 0.9 },
    { id: 'skull-perfect', name: 'Flawless Victor', desc: 'A perfect hard-mode session. Untouchable.', check: s => s.hardModePerfects >= 1 },
];

const TIMED_MODE_ACHIEVEMENTS: Achievement<MathAchievementStats>[] = [
    { id: 'speed-demon', name: 'Speed Demon', desc: 'First timed session under your belt.', check: s => s.timedModeSessions >= 1 },
    { id: 'blitz-master', name: 'Blitz Master', desc: '50 solved against the clock.', check: s => s.timedModeSolved >= 50 },
    { id: 'lightning', name: 'Lightning Reflexes', desc: '5 in a row with the timer running.', check: s => s.timedModeBestStreak >= 5 },
    { id: 'time-lord', name: 'Time Lord', desc: 'Ace a full timed session — every problem.', check: s => s.timedModePerfects >= 1 },
];

const ULTIMATE_ACHIEVEMENTS: Achievement<MathAchievementStats>[] = [
    { id: 'ultimate-ascend', name: 'Ascended', desc: 'You ran ultimate mode — hard and timed at once.', check: s => s.ultimateSessions >= 1 },
    { id: 'ultimate-streak', name: 'Omega Streak', desc: 'Five in a row under ultimate conditions.', check: s => s.ultimateBestStreak >= 5 },
    { id: 'ultimate-perfect', name: 'Transcendence', desc: 'A perfect ultimate session. Few will see this.', check: s => s.ultimatePerfects >= 1 },
];

/** All math achievements across every tier — single source of truth */
export const EVERY_MATH_ACHIEVEMENT: Achievement<MathAchievementStats>[] = [
    ...CORE_ACHIEVEMENTS,
    ...HARD_MODE_ACHIEVEMENTS,
    ...TIMED_MODE_ACHIEVEMENTS,
    ...ULTIMATE_ACHIEVEMENTS,
];
