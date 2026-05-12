/**
 * utils/dailyChallenge.ts
 *
 * Seeded daily and challenge generators.
 * Math-specific constants (DAILY_COUNT, DAILY_TYPES) imported from math domain.
 * The functions themselves are domain-agnostic in signature.
 */
import { createSeededRng, dateSeed, stringSeed } from './seededRng';
import { generateProblem, type Problem } from './mathGenerator';
import { DAILY_COUNT, DAILY_TYPES } from '../domains/math/mathDailyConfig';

/** Forward-compat alias so callers can use EngineItem in the future */
export type { Problem };

/** Generate the DAILY_COUNT-sized problem set for a given seed, tagged with
 *  the given id prefix. Shared by both the daily and shareable-challenge
 *  paths so they stay byte-identical for the same seed. */
function buildSeededSet(seed: number, idPrefix: string): Problem[] {
    const rng = createSeededRng(seed);
    const problems: Problem[] = [];
    for (let i = 0; i < DAILY_COUNT; i++) {
        const type = DAILY_TYPES[Math.floor(rng() * DAILY_TYPES.length)];
        const difficulty = 2 + Math.floor(i / 3);
        const problem = generateProblem(difficulty, type, false, rng);
        problem.id = `${idPrefix}-${seed}-${i}`;
        problems.push(problem);
    }
    return problems;
}

/**
 * Generate today's daily challenge — same N problems for everyone.
 * Uses a date-seeded RNG so every player gets the same set.
 */
export function generateDailyChallenge(): { problems: Problem[]; dateLabel: string } {
    const today = new Date();
    const seed = dateSeed(today);
    return {
        problems: buildSeededSet(seed, 'daily'),
        dateLabel: today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
}

/**
 * Generate a challenge from a seed string (e.g., from a URL param).
 * Same seed → same problems for both players.
 */
export function generateChallenge(challengeId: string): Problem[] {
    return buildSeededSet(stringSeed(challengeId), 'challenge');
}

/** Create a short challenge ID from current timestamp */
export function createChallengeId(): string {
    return Date.now().toString(36);
}
