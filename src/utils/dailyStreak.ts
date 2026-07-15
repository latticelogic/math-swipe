/**
 * utils/dailyStreak.ts
 *
 * The Daily-Challenge streak: consecutive calendar days on which the player
 * completed the Daily. Distinct from `dayStreak` (which counts *any* session).
 *
 * Before this, playing the Daily 30 days running paid exactly the same as
 * playing it once — the single best appointment surface in the app rewarded
 * nothing for consistency. This ladder fixes that: reaching a milestone day
 * grants a one-time XP bonus, and past the last fixed rung a repeating
 * milestone keeps the payoff coming so a long streak never stops meaning
 * something (the "eternal flame").
 *
 * Pure functions, no React/Firestore — unit-tested in dailyStreak.test.ts and
 * consumed by useStats.recordSession.
 */

export interface DailyStreakReward {
    /** Streak length, in days, that unlocks this bonus. */
    day: number;
    /** One-time XP granted for reaching that day. */
    xp: number;
}

/** Fixed reward rungs. Spaced to keep a committed player earning for months. */
export const DAILY_STREAK_LADDER: readonly DailyStreakReward[] = [
    { day: 3, xp: 25 },
    { day: 7, xp: 60 },
    { day: 14, xp: 120 },
    { day: 30, xp: 250 },
    { day: 60, xp: 400 },
    { day: 100, xp: 750 },
];

/** Past the fixed ladder, a milestone repeats every N days for REPEAT_XP. */
const REPEAT_EVERY = 50;
const REPEAT_XP = 250;

/**
 * XP bonus for *reaching* exactly `streak` days on the Daily streak.
 * Returns 0 on non-milestone days (the common case), so callers can add it
 * unconditionally to a session's score.
 */
export function dailyStreakBonus(streak: number): number {
    const rung = DAILY_STREAK_LADDER.find(r => r.day === streak);
    if (rung) return rung.xp;
    if (streak > 100 && streak % REPEAT_EVERY === 0) return REPEAT_XP;
    return 0;
}

/** The next milestone day strictly greater than `streak` — for UI teasers. */
export function nextDailyMilestone(streak: number): number {
    const rung = DAILY_STREAK_LADDER.find(r => r.day > streak);
    if (rung) return rung.day;
    // Past the fixed ladder: the next multiple of REPEAT_EVERY above `streak`.
    return Math.floor(streak / REPEAT_EVERY) * REPEAT_EVERY + REPEAT_EVERY;
}
