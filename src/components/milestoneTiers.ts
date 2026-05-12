/**
 * Milestone tier metadata, split out from MilestoneBurst.tsx so non-React
 * consumers (useGameLoop) can read tier-derived values without pulling
 * in the component module (react-refresh fast-refresh prefers single-export
 * component files).
 */

export type MilestoneTier = 'sparkle' | 'flame' | 'bolt' | 'crown' | 'trophy';

/** Animation duration in seconds, per tier. Bigger = more theatrical. */
export const TIER_DURATIONS_S: Record<MilestoneTier, number> = {
    sparkle: 1.0,
    flame: 1.3,
    bolt: 1.6,
    crown: 2.0,
    trophy: 2.6,
};

/** How long the burst overlay should stay mounted before the game loop
 *  clears it. Higher-tier celebrations get more screen time. */
export function milestoneDurationMs(tier: string): number {
    const s = TIER_DURATIONS_S[tier as MilestoneTier] ?? TIER_DURATIONS_S.sparkle;
    return Math.round(s * 1000) + 200;
}
