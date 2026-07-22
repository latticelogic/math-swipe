/**
 * domains/math/mathAchievements.ts
 *
 * Math-specific achievement definitions and stats snapshot type.
 * Moved from src/utils/achievements.ts — keeps subject logic in the domain.
 */
import { t, type MsgKey } from '../../i18n';
import type { Achievement } from '../../utils/achievements';
import type { QuestionType } from './mathCategories';
import { getMastery } from './ranks';

// ── Stats snapshot ────────────────────────────────────────────────────────────

/** Stats snapshot used for math achievement checks */
export interface MathAchievementStats {
    totalXP: number;
    totalSolved: number;
    totalCorrect: number;
    bestStreak: number;
    dayStreak: number;
    /** Consecutive-day Daily Challenge streak (see utils/dailyStreak.ts). */
    dailyStreak: number;
    bestDailyStreak: number;
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
    /** Players this user has successfully invited (server-verified). */
    referralCount: number;
}

// ── Achievement lists ─────────────────────────────────────────────────────────

// Achievement descriptions read in two places: the locked-state card (where
// they hint at the unlock criteria) and the post-unlock celebration. So
// they need to be specific enough to tell you HOW to unlock, but framed as
// an invitation, not a checklist.

const CORE_ACHIEVEMENTS: Achievement<MathAchievementStats>[] = [
    // ── First-week ladder ──
    // Each rung is reachable by a casual player in their 7-day trial.
    // Designed so a player who plays a handful of problems most days of
    // the trial earns 5+ of these, building visible momentum before the
    // paywall lands. See monetization_model.md for the habit-formation
    // rationale.
    {
        id: 'first-steps',
        name: 'First Steps',
        desc: 'Solve your very first problem.',
        check: s => s.totalSolved >= 1,
    },
    {
        id: 'streak-3',
        name: 'Warming Up',
        desc: 'Three correct in a row. The shape of a streak.',
        check: s => s.bestStreak >= 3,
    },
    {
        id: 'streak-5',
        name: 'On Fire',
        desc: 'Five correct in a row, no slipups.',
        check: s => s.bestStreak >= 5,
    },
    {
        id: 'daily-1',
        name: 'First Daily',
        desc: 'Finish a full Daily Challenge. Same set as everyone else today.',
        check: s => (s.byType.daily?.solved ?? 0) >= 10,
    },
    {
        id: 'topic-explorer',
        name: 'Curious Mind',
        desc: 'Try three different topics. Variety beats grinding one thing.',
        check: s => {
            const META: string[] = ['daily', 'challenge', 'mix-basic', 'mix-all', 'speedrun', 'ghost'];
            const counted = Object.entries(s.byType).filter(([k, t]) => !META.includes(k) && t.solved >= 5);
            return counted.length >= 3;
        },
    },
    {
        id: 'three-day',
        name: 'Three in a Row',
        desc: 'Three days playing in a row. Real habits start here.',
        check: s => s.dayStreak >= 3,
    },
    {
        id: 'accuracy-early',
        name: 'Sharp Eye',
        desc: '90%+ accuracy across your first 20 problems.',
        check: s => s.totalSolved >= 20 && (s.totalCorrect / s.totalSolved) >= 0.9,
    },
    {
        id: 'quick-fifty',
        name: 'Quick Fifty',
        desc: 'Fifty problems already. You\'re in.',
        check: s => s.totalSolved >= 50,
    },

    // ── Mid-game ladder ──
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
    // ── Referrals — a friend actually joined and played ──
    {
        id: 'brought-a-friend',
        name: 'Brought a Friend',
        desc: 'Someone joined from your invite and started playing. That is the good stuff.',
        check: s => s.referralCount >= 1,
    },
    {
        id: 'connector',
        name: 'Connector',
        desc: 'Three friends in, all playing. You have a following now.',
        check: s => s.referralCount >= 3,
    },
    {
        id: 'ambassador',
        name: 'Ambassador',
        desc: 'Five players owe their streak to you.',
        check: s => s.referralCount >= 5,
    },
];

// ── Long-haul ladders ──
// These exist to extend the reward runway for the committed player. The base
// list front-loads almost everything into the first two weeks; without these,
// a daily player runs out of things to unlock by ~week 3. Each rung here is
// reachable only with sustained play (volume, day-streaks, Daily-streaks, or
// mastery levels past the top rank), so there is always a next thing.
const LONGHAUL_ACHIEVEMENTS: Achievement<MathAchievementStats>[] = [
    // Volume — continues quick-fifty(50) / century(100) / math-machine(500)
    { id: 'kilo', name: 'Kilo Club', desc: 'A thousand problems. Four figures now.', check: s => s.totalSolved >= 1000 },
    { id: 'iron-mind', name: 'Iron Mind', desc: '2,500 solved. That is discipline, plain and simple.', check: s => s.totalSolved >= 2500 },
    { id: 'marathoner', name: 'Marathoner', desc: '5,000 problems. Genuinely rare air.', check: s => s.totalSolved >= 5000 },
    { id: 'ten-thousand', name: 'Ten Thousand', desc: '10,000 solved. Almost nobody gets here. You did.', check: s => s.totalSolved >= 10000 },
    // Day-streak — continues three-day(3) / dedicated(7)
    { id: 'fortnight', name: 'Fortnight', desc: 'Fourteen days straight. It is a routine now.', check: s => s.dayStreak >= 14 },
    { id: 'month-of-days', name: 'A Month of Days', desc: 'Thirty days in a row. This is just who you are.', check: s => s.dayStreak >= 30 },
    { id: 'hundred-days', name: 'Hundred Days', desc: 'A hundred consecutive days. Remarkable, honestly.', check: s => s.dayStreak >= 100 },
    // Daily-Challenge streak — the appointment loop, rewarded
    { id: 'daily-regular', name: 'Daily Regular', desc: 'A week of Daily Challenges, no gaps.', check: s => s.dailyStreak >= 7 },
    { id: 'daily-devotee', name: 'Daily Devotee', desc: 'Thirty Dailies running. The set is a ritual.', check: s => s.dailyStreak >= 30 },
    { id: 'daily-centurion', name: 'Daily Centurion', desc: 'A hundred Dailies in a row. The flame does not go out.', check: s => s.dailyStreak >= 100 },
    // Mastery — the infinite track past max rank
    { id: 'mastery-1', name: 'Past the Peak', desc: 'You passed the top rank. Mastery begins here.', check: s => (getMastery(s.totalXP)?.level ?? 0) >= 1 },
    { id: 'mastery-5', name: 'Mastery Five', desc: 'Five mastery levels beyond Transcendent.', check: s => (getMastery(s.totalXP)?.level ?? 0) >= 5 },
    { id: 'mastery-10', name: 'Mastery Ten', desc: 'Ten levels deep into mastery. The long game.', check: s => (getMastery(s.totalXP)?.level ?? 0) >= 10 },
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
    ...LONGHAUL_ACHIEVEMENTS,
    ...HARD_MODE_ACHIEVEMENTS,
    ...TIMED_MODE_ACHIEVEMENTS,
    ...ULTIMATE_ACHIEVEMENTS,
];

// ── Localized display helpers ─────────────────────────────────────────────────
// The English `name`/`desc` fields above stay as fallback data (and drive the
// `check` logic's neighbourhood). These helpers return the localized string the
// user actually sees, keyed by the stable achievement id, falling back to the
// English field if a catalog key is somehow missing.

const ACH_MAP = new Map(EVERY_MATH_ACHIEVEMENT.map(a => [a.id, a]));

/** Localized achievement name by id (English `name` as fallback). */
export function achName(id: string): string {
    const label = t(`ach.${id}.name` as MsgKey);
    return label || ACH_MAP.get(id)?.name || id;
}

/** Localized achievement description by id (English `desc` as fallback). */
export function achDesc(id: string): string {
    const label = t(`ach.${id}.desc` as MsgKey);
    return label || ACH_MAP.get(id)?.desc || '';
}
