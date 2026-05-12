/**
 * config.ts
 *
 * App-level identity and configuration.
 * This is the ONLY file a fork needs to edit to rebrand the app.
 *
 * All localStorage keys, Firestore collection names, and navigation labels
 * are derived from this single source of truth.
 */

// ── App identity ──────────────────────────────────────────────────────────────

export const APP_ID = 'math-swipe';

/**
 * Prefix for all localStorage keys.
 * Change this when forking so a new app doesn't collide with the math app's data.
 */
export const STORAGE_PREFIX = 'math-swipe';

// ── localStorage keys ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
    stats: `${STORAGE_PREFIX}-stats`,
    achievements: `${STORAGE_PREFIX}-achievements`,
    costume: `${STORAGE_PREFIX}-costume`,
    trail: `${STORAGE_PREFIX}-trail`,
    chalkTheme: `${STORAGE_PREFIX}-chalk-theme`,
    theme: `${STORAGE_PREFIX}-theme`,
    ageBand: `${STORAGE_PREFIX}-age-band`,
    // YYYY-MM-DD of the most recent day we showed the "first correct of the
    // day" flourish. Stays purely device-local — no Firestore sync needed
    // since the flourish is meant to feel like an in-session moment, not
    // a tracked metric. Triggers once per device per day.
    firstCorrectFlourish: `${STORAGE_PREFIX}-first-correct-flourish`,
} as const;

// ── Firestore collection names ────────────────────────────────────────────────

export const FIRESTORE = {
    USERS: 'users',
    PINGS: 'pings',
} as const;

// ── Bottom navigation tabs ────────────────────────────────────────────────────

export const NAV_TABS = [
    { id: 'game' as const, label: "Let's Go!", ariaLabel: 'Play' },
    { id: 'league' as const, label: 'League', ariaLabel: 'Leaderboard' },
    { id: 'magic' as const, label: 'Magic', ariaLabel: 'Lessons' },
    { id: 'me' as const, label: 'Me', ariaLabel: 'Profile' },
] as const;

export type AppTab = typeof NAV_TABS[number]['id'];
