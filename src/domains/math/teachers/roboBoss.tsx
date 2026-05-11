/**
 * Boss Robo — leaderboard / metrics machine.
 *
 * Square head with antenna and a glowing visor (one rectangular slit instead
 * of two eyes — the visor is its own state-driven element). Voice is robot
 * formal-speak, very stat-aware. Best for league-grinders.
 *
 * Auto-swap: none (it's a vibe, not a context). Picked manually.
 * Unlocks: reach top 10 on the leaderboard — proxied by totalXP >= 500.
 */

import type { Teacher } from './types';
import { Mouth, Sparkle } from './shared';
import type { ChalkState } from '../../../engine/domain';

/**
 * The robot's "eyes" are a single visor slit with state-driven content
 * inside (loading dots when idle, "><" when fail, etc.). Rendered as plain
 * JSX so it stays inside the teacher's Portrait function (avoids the
 * react-refresh/only-export-components warning by not being a sibling export).
 */
function visorContent(state: ChalkState) {
    switch (state) {
        case 'success':
            return (
                <g fill="currentColor">
                    <circle cx="42" cy="40" r="1.5" />
                    <circle cx="50" cy="40" r="1.5" />
                    <circle cx="58" cy="40" r="1.5" />
                </g>
            );
        case 'fail':
            return (
                <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="40" y1="38" x2="46" y2="44" />
                    <line x1="46" y1="38" x2="40" y2="44" />
                    <line x1="54" y1="38" x2="60" y2="44" />
                    <line x1="60" y1="38" x2="54" y2="44" />
                </g>
            );
        case 'streak':
            return (
                <g fill="currentColor">
                    <rect x="36" y="38" width="4" height="6" />
                    <rect x="44" y="38" width="4" height="6" />
                    <rect x="52" y="38" width="4" height="6" />
                    <rect x="60" y="38" width="4" height="6" />
                </g>
            );
        case 'struggling':
            return (
                <text x="50" y="44" fontSize="6" textAnchor="middle" fill="currentColor" fontFamily="monospace">ERROR</text>
            );
        case 'comeback':
            return (
                <g fill="currentColor">
                    <rect x="42" y="38" width="6" height="6" />
                    <rect x="52" y="38" width="6" height="6" />
                </g>
            );
        case 'idle':
        default:
            // Slow scanning bar — 3 dots with staggered opacity
            return (
                <g fill="currentColor">
                    <circle cx="44" cy="41" r="1.5">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="50" cy="41" r="1.5">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0.4s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="56" cy="41" r="1.5">
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0.8s" repeatCount="indefinite" />
                    </circle>
                </g>
            );
    }
}

export const BOSS_ROBO: Teacher = {
    id: 'robo',
    name: 'Boss Robo',
    tagline: 'BEEP. STAT. CRUSH. REPEAT.',
    unlock: {
        reason: 'Earn 500 XP',
        check: (s) => s.totalXP >= 500,
    },
    voice: {
        idle: [
            'AWAITING INPUT.',
            'PROCESSORS WARM. LET\'S COMPUTE.',
            'SCANNING… READY.',
            'INITIATE.',
        ],
        success: [
            'OPTIMAL. +XP.',
            'COMPUTATION VERIFIED. ✅',
            'EFFICIENCY: 100%.',
            'CHECKSUM PASSED.',
            'SYSTEM PLEASED. 🤖',
        ],
        fail: [
            'INVALID. RETRY.',
            'ERROR LOGGED. RECOMPUTE.',
            'DOES NOT COMPUTE. 🚫',
        ],
        streak: [
            'STREAK MULTIPLIER ENGAGED. 🔥',
            'OVERCLOCKED. CONTINUE.',
            'COMBO: MAXIMUM. 💥',
        ],
        easterEggs: [
            'BINARY FACT: 1010 = 10. WE LIKE 10.',
            'MY PRIMARY DIRECTIVE: HELP YOU LEVEL UP.',
        ],
    },
    Portrait({ state, streak }) {
        return (
            <g>
                {/* ── Antenna with blinking light ── */}
                <line x1="50" y1="10" x2="50" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="50" cy="8" r="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3">
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                </circle>

                {/* ── Square head with rounded corners ── */}
                <rect x="24" y="22" width="52" height="44" rx="8"
                    stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.04" />

                {/* ── Side bolts ── */}
                <circle cx="22" cy="36" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="20.2" y1="34.2" x2="23.8" y2="37.8" stroke="currentColor" strokeWidth="1" />
                <circle cx="78" cy="36" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="76.2" y1="34.2" x2="79.8" y2="37.8" stroke="currentColor" strokeWidth="1" />

                {/* ── Visor (the defining feature) ── */}
                <rect x="32" y="34" width="36" height="14" rx="2"
                    stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
                {visorContent(state)}

                {/* ── Speaker grille mouth (rectangles in a row) ── */}
                {state === 'streak' || state === 'success' ? (
                    <g fill="currentColor" opacity="0.7">
                        <rect x="42" y="56" width="2" height="6" />
                        <rect x="46" y="55" width="2" height="7" />
                        <rect x="50" y="54" width="2" height="8" />
                        <rect x="54" y="55" width="2" height="7" />
                        <rect x="58" y="56" width="2" height="6" />
                    </g>
                ) : (
                    <Mouth state={state} cx={50} cy={58} />
                )}

                {/* ── Body: chest plate ── */}
                <rect x="30" y="74" width="40" height="32" rx="6"
                    stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06" />
                {/* Power button */}
                <circle cx="50" cy="86" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="50" y1="84" x2="50" y2="88" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                {/* LED level meter */}
                <g fill="currentColor">
                    <rect x="38" y="96" width="4" height="2" opacity="0.9" />
                    <rect x="44" y="96" width="4" height="2" opacity={streak >= 1 ? 0.9 : 0.25} />
                    <rect x="50" y="96" width="4" height="2" opacity={streak >= 3 ? 0.9 : 0.25} />
                    <rect x="56" y="96" width="4" height="2" opacity={streak >= 5 ? 0.9 : 0.25} />
                    <rect x="62" y="96" width="4" height="2" opacity={streak >= 10 ? 0.9 : 0.25} />
                </g>
                {/* Neck connector */}
                <rect x="46" y="66" width="8" height="8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />

                {/* Streak overclock sparks */}
                {streak >= 5 && state === 'streak' && (
                    <>
                        <Sparkle x={18} y={26} size={3} />
                        <Sparkle x={82} y={26} size={3} />
                    </>
                )}
            </g>
        );
    },
};
