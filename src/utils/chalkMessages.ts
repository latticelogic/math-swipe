/**
 * utils/chalkMessages.ts
 *
 * Generic companion message picker.
 * Domain-specific quips are injected via `ChalkMessageOverrides`.
 * The math domain's overrides live in src/domains/math/mathMessages.ts.
 */
import type { ChalkState } from '../engine/domain';

// ── Public types ──────────────────────────────────────────────────────────────

/** Context passed to the message picker so the companion can be smart */
export interface ChalkContext {
    state: ChalkState;
    streak: number;
    totalAnswered: number;
    /** The active category/type ID — domain interprets this string */
    categoryId: string;
    hardMode: boolean;
    timedMode: boolean;
}

/**
 * Domain-injectable overrides.
 * Return `null` to fall through to default generic messages.
 */
export interface ChalkMessageOverrides {
    topicSuccess?: (categoryId: string) => string[] | null;
    topicFail?: (categoryId: string) => string[] | null;
    easterEggs?: string[];
}

// ── Generic message pools ─────────────────────────────────────────────────────
//
// Tone guide for every line below:
//   - warm, never pressure-y
//   - clean text, no emoji (those live as SVG icons in the UI, not in copy)
//   - specific over generic ("Cleanly done" > "Awesome!")
//   - varied length so the speech bubble feels conversational
//
// Per-teacher voice overrides in src/domains/math/teachers/*.tsx take
// priority over these pools. These are the friendly fallback for any
// state a teacher hasn't customised.

const BASE_IDLE = [
    'Take your time.',
    'Ready when you are.',
    'No rush.',
    'Read it carefully.',
    'Focus.',
    'Whenever you\'re set.',
    'Deep breath first.',
    'One step at a time.',
];

const BASE_SUCCESS = [
    'Nicely done.',
    'Clean work.',
    'Sharp.',
    'You got it.',
    'Confident answer.',
    'Right on the first look.',
    'Solid.',
    'Good thinking.',
    'That\'s the one.',
    'Smooth.',
];

const BASE_FAIL = [
    'Close. Try again.',
    'Have another look.',
    'Almost.',
    'No worries — next one.',
    'Pattern\'s nearly right.',
    'Reset and go.',
    'Reread it. The answer is in there.',
];

const BASE_STREAK = [
    'On a roll.',
    'Locked in.',
    'Unstoppable.',
    'Streak going.',
    'You\'re in the zone.',
    'Hot run.',
];

const STREAK_EARLY = ['Great start.', 'Here we go.', 'Warming up.', 'Off to a clean start.'];
const STREAK_MID = ['Five strong.', 'Building something.', 'Momentum.', 'Look at you go.'];
const STREAK_HIGH = ['Double digits — wow.', 'You\'re on fire.', 'Nothing can stop you.', 'This is incredible.'];
const STREAK_LEGENDARY = ['Are you even human?', 'Absolute legend.', 'They\'ll write songs about this.', 'A masterclass.'];

const COMEBACK = [
    'There it is.',
    'That\'s the comeback.',
    'Back in the game.',
    'You powered through.',
    'Redemption.',
    'Up off the mat.',
    'The comeback is always greater.',
];

const HARD_MODE = ['Brave choice.', 'Hard mode hero.', 'No fear.', 'Courage at maximum.'];
const TIMED_MODE = ['Beat the clock.', 'Speed run.', 'Tick tock.', 'Racing the stopwatch.'];

const SESSION_MILESTONES: Record<number, string[]> = {
    10: ['10 problems down. Just getting started.'],
    25: ['25 already. You\'re in the zone.'],
    50: ['Fifty. Half a century down.'],
    100: ['One hundred. You\'re a legend.'],
    200: ['200. Marathon champion.'],
};

// Tier-aligned with src/engine/domain.ts milestones config (3/5/10/25/50)
// and src/components/MilestoneBurst.tsx tier names. Multiple lines per tier
// so the teacher doesn't repeat themselves on back-to-back milestones.
const STREAK_MILESTONES: Record<number, string[]> = {
    3: [
        'Three in a row!',
        'Nice rhythm!',
        'In the zone.',
        'Building heat.',
    ],
    5: [
        'High five! Five in a row!',
        'Five strong!',
        'You\'re cooking.',
        'Streak of five — keep going!',
    ],
    10: [
        'TEN in a row!',
        'Double digits! Unstoppable.',
        'Ten! Locked in.',
        'You\'re on fire.',
    ],
    25: [
        'TWENTY-FIVE?! Are you human?',
        '25 streak — legendary territory.',
        'Quarter century! Wild.',
        'Twenty-five. I\'m impressed.',
    ],
    50: [
        'FIFTY. I\'m speechless.',
        'Fifty in a row?! Hall of fame.',
        'Fifty. This is a record.',
        'FIFTY STREAK! Bow down.',
    ],
};

function getTimeMessages(): string[] {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return ['Morning session.', 'Rise and shine.', 'Early-day brain.'];
    if (h >= 12 && h < 17) return ['Afternoon focus.', 'Post-lunch session.', 'Midday math.'];
    if (h >= 17 && h < 22) return ['Evening practice.', 'Wind-down session.', 'Sundown math.'];
    return ['Night-owl session.', 'Burning the midnight oil.', 'Late-night brain.'];
}

// ── Internal picker helper ────────────────────────────────────────────────────

let lastMessage = '';

function pick(arr: string[]): string {
    const filtered = arr.filter(m => m !== lastMessage);
    const choice = filtered[Math.floor(Math.random() * filtered.length)] || arr[0];
    lastMessage = choice;
    return choice;
}

function chance(pct: number): boolean { return Math.random() * 100 < pct; }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Context-aware message picker.
 * Pass domain-specific `overrides` to inject subject-flavoured quips.
 */
export function pickChalkMessage(ctx: ChalkContext, overrides?: ChalkMessageOverrides): string {
    const { state, streak, totalAnswered, categoryId, hardMode, timedMode } = ctx;
    const eggs = overrides?.easterEggs ?? [];

    // 1. Easter eggs (2% chance, any state)
    if (eggs.length > 0 && chance(2)) return pick(eggs);

    // 2. Session milestones (exact thresholds, on success only)
    if (state === 'success' && SESSION_MILESTONES[totalAnswered]) {
        return pick(SESSION_MILESTONES[totalAnswered]);
    }

    // 3. Streak milestones (exact thresholds)
    if ((state === 'success' || state === 'streak') && STREAK_MILESTONES[streak]) {
        return pick(STREAK_MILESTONES[streak]);
    }

    // 4. Time-of-day (10% chance on idle)
    if (state === 'idle' && chance(10)) return pick(getTimeMessages());

    // 5. Hard/timed mode acknowledgement (15% chance)
    if (state === 'success' && hardMode && chance(15)) return pick(HARD_MODE);
    if (state === 'success' && timedMode && chance(15)) return pick(TIMED_MODE);

    // 6. Domain topic-specific (25% chance on success/fail)
    if (state === 'success' && chance(25) && overrides?.topicSuccess) {
        const pool = overrides.topicSuccess(categoryId);
        if (pool) return pick(pool);
    }
    if (state === 'fail' && chance(25) && overrides?.topicFail) {
        const pool = overrides.topicFail(categoryId);
        if (pool) return pick(pool);
    }

    // 7. Streak-scaled success messages
    if (state === 'success') {
        if (streak >= 20) return pick(STREAK_LEGENDARY);
        if (streak >= 10) return pick(STREAK_HIGH);
        if (streak >= 5) return pick(STREAK_MID);
        if (streak >= 1) return chance(40) ? pick(STREAK_EARLY) : pick(BASE_SUCCESS);
    }

    // 8. Comeback
    if (state === 'comeback') return pick(COMEBACK);

    // 9. Base pools fallback
    switch (state) {
        case 'idle': return pick(BASE_IDLE);
        case 'success': return pick(BASE_SUCCESS);
        case 'fail': return pick(BASE_FAIL);
        case 'streak': return pick(BASE_STREAK);
        default: return pick(BASE_IDLE);
    }
}
