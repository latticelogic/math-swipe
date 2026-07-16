import { t, type MsgKey } from '../i18n';

export interface TrailConfig {
    id: string;
    name: string;
    emoji: string;
    minStreak?: number; // Requires a specific gameplay trait
    minLevel?: number;  // Requires a specific global rank
    hardModeOnly?: boolean;
    timedModeOnly?: boolean;
    ultimateOnly?: boolean;
    pro?: boolean;      // Pro-pack exclusive — unlocked by paying, never earnable
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
];

/** Localized display name for a swipe trail. `name` is kept as English
 *  fallback data; this is what the user sees. Keyed by the stable trail id. */
export function trailLabel(id: string): string {
    return t(`trail.${id}` as MsgKey);
}
