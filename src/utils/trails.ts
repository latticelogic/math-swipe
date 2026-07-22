import { t, type MsgKey } from '../i18n';

export interface TrailConfig {
    id: string;
    name: string;
    /** Legacy data — unused at runtime (TrailIcon renders SVGs keyed by id).
     *  Kept on the original five for backward-compat; new trails omit it. */
    emoji?: string;
    minStreak?: number; // Requires a specific gameplay trait
    minLevel?: number;  // Requires a specific global rank
    hardModeOnly?: boolean;
    timedModeOnly?: boolean;
    ultimateOnly?: boolean;
    pro?: boolean;      // Pro-pack exclusive — unlocked by paying, never earnable
    /** Referral-conversion exclusive — unlocked when this many invited friends
     *  have BOUGHT the game (server-verified `referralStats/{uid}.converted`).
     *  Never purchasable, never Pro-gated: this is the one cosmetic money
     *  can't buy. See functions/src/referral.ts creditReferralConversion. */
    referralConversionsMin?: number;
}

export const SWIPE_TRAILS: TrailConfig[] = [
    {
        id: 'chalk-dust',
        name: 'Chalk Dust',
        emoji: '🖍️',
        minLevel: 1, // Default
    },
    {
        id: 'rainbow',
        name: 'Rainbow Ribbon',
        emoji: '🌈',
        minLevel: 5, // Requires some XP progression
    },
    {
        id: 'fire',
        name: 'Hellfire',
        emoji: '🔥',
        hardModeOnly: true, // Specific achievement check
    },
    {
        id: 'lightning',
        name: 'Static Shock',
        emoji: '⚡',
        timedModeOnly: true,
    },
    {
        id: 'pro-comet',
        name: 'Comet',
        emoji: '☄️',
        pro: true,
    },
    {
        id: 'beacon',
        name: 'Beacon',
        referralConversionsMin: 1,
    },
];

/** True when `trail` is the referral-conversion reward and the player's
 *  server-verified conversion count has reached its bar. Pure so the
 *  picker's gate is unit-testable. */
export function isReferralTrailUnlocked(trail: TrailConfig, referralConversions: number): boolean {
    return !!trail.referralConversionsMin && referralConversions >= trail.referralConversionsMin;
}

/** Localized display name for a swipe trail. `name` is kept as English
 *  fallback data; this is what the user sees. Keyed by the stable trail id. */
export function trailLabel(id: string): string {
    return t(`trail.${id}` as MsgKey);
}
