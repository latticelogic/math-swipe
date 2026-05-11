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
