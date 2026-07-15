/**
 * Math-domain rank ladder.
 *
 * Extracted from MePage so other surfaces (the public profile page in
 * particular) can reuse the same titles/emojis/thresholds without
 * duplicating the data.
 */

export interface Rank {
    name: string;
    emoji: string;
    xp: number;
}

export const RANKS: ReadonlyArray<Rank> = [
    { name: 'Beginner', emoji: '🌱', xp: 0 },
    { name: 'Learner', emoji: '📚', xp: 100 },
    { name: 'Thinker', emoji: '🧠', xp: 300 },
    { name: 'Problem Solver', emoji: '🔧', xp: 600 },
    { name: 'Calculator', emoji: '🖩', xp: 1000 },
    { name: 'Mathematician', emoji: '📐', xp: 1800 },
    { name: 'Wizard', emoji: '🧙', xp: 3000 },
    { name: 'Grandmaster', emoji: '♟️', xp: 5000 },
    { name: 'Legend', emoji: '👑', xp: 8000 },
    { name: 'Mythic', emoji: '🌌', xp: 12000 },
    { name: 'Transcendent', emoji: '✨', xp: 20000 },
];

export interface RankInfo {
    rank: Rank;
    nextRank: Rank | null;
    /** 0..1 progress toward nextRank; 1 when at max rank. */
    progress: number;
}

export function getRank(xp: number): RankInfo {
    let rank = RANKS[0];
    let nextRank: Rank | null = RANKS[1] ?? null;
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (xp >= RANKS[i].xp) {
            rank = RANKS[i];
            nextRank = RANKS[i + 1] ?? null;
            break;
        }
    }
    const progress = nextRank ? (xp - rank.xp) / (nextRank.xp - rank.xp) : 1;
    return { rank, nextRank, progress };
}

// ── Mastery: post-max-rank infinite progression ───────────────────────────────
// Once a player passes the top rank (Transcendent) the XP counter would
// otherwise stop meaning anything. Mastery turns that tail into an endless,
// legibly-growing number: ML1→ML2 costs 25k XP, and each level after costs
// 10k more than the last (25k, 35k, 45k, …). It is the app's only INFINITE
// reward track, so it lives here (canonical) and every surface — Me, profile,
// share card — reads it, not just the Me tab.

/** XP at which the top named rank is reached; mastery begins here. */
export const MAX_RANK_XP = RANKS[RANKS.length - 1].xp;
const MASTERY_BASE = 25000;
const MASTERY_SCALE = 10000;

export interface MasteryInfo {
    /** 1-indexed mastery level (ML1 is the first level past max rank). */
    level: number;
    /** 0..1 progress toward the next mastery level. */
    progress: number;
    /** Total XP at which the next mastery level is reached. */
    xpForNext: number;
}

/** Mastery info for a given XP total, or null if the player hasn't hit max rank. */
export function getMastery(xp: number): MasteryInfo | null {
    if (xp < MAX_RANK_XP) return null;
    let remaining = xp - MAX_RANK_XP;
    let level = 1;
    let levelStartXp = MAX_RANK_XP;
    for (;;) {
        const cost = MASTERY_BASE + (level - 1) * MASTERY_SCALE;
        if (remaining < cost) {
            return { level, progress: remaining / cost, xpForNext: levelStartXp + cost };
        }
        remaining -= cost;
        levelStartXp += cost;
        level++;
    }
}
