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
    // Boss Robo's voice: stats-loving lab partner, not stern supervisor.
    // ALL CAPS is reserved for short status outputs (think console readouts);
    // longer lines use Title Case + dry humour. Tone is "this metric pleases
    // me", not "you must perform". Notices *your* stats with real interest.
    voice: {
        idle: [
            'Ready when you are.',
            'Standing by.',
            'Sensors warm.',
            'Awaiting your input.',
            'Take your time. I do not sleep.',
        ],
        success: [
            'Verified.',
            'Logged. Nice metric.',
            'That one was clean.',
            'Filing this for posterity.',
            'Output: correct. Confidence: high.',
            'Your accuracy curve approves.',
        ],
        fail: [
            'Reading: incorrect.',
            'Re-running.',
            'No problem. Recompute.',
            'Filing under "learning data".',
        ],
        streak: [
            'Streak detected. Logging…',
            'Performance trending up.',
            'You are outpacing my model.',
            'Multiplier engaged.',
        ],
        easterEggs: [
            '1010 in binary is 10. We like 10.',
            'My primary directive: help you level up.',
            'Did you know 73 is the best prime? Sheldon was onto something.',
        ],
    },
    Portrait({ state, streak }) {
        return (
            <g>
                {/* ── Antenna with blinking light (offset right so the mortarboard
                    can sit on the head without overlap) ── */}
                <line x1="62" y1="14" x2="62" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="62" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3">
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                </circle>

                {/* ── Mortarboard graduation cap — reads as "teacher" instantly.
                    Square plate with a tassel hanging on the right. */}
                <g>
                    {/* Square top plate */}
                    <path d="M 22 18 L 50 12 L 78 18 L 50 24 Z"
                        stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.18" strokeLinejoin="round" />
                    {/* Centre button */}
                    <circle cx="50" cy="18" r="1.5" fill="currentColor" />
                    {/* Tassel hanging right */}
                    <path d="M 64 20 Q 70 24 70 30" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    <line x1="68" y1="30" x2="72" y2="34" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <line x1="70" y1="30" x2="73" y2="34" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <line x1="72" y1="30" x2="74" y2="34" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </g>

                {/* ── Square head with rounded corners (pulled down to make room
                    for the cap) ── */}
                <rect x="24" y="24" width="52" height="42" rx="8"
                    stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.04" />

                {/* ── Side bolts ── */}
                <circle cx="22" cy="38" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="20.2" y1="36.2" x2="23.8" y2="39.8" stroke="currentColor" strokeWidth="1" />
                <circle cx="78" cy="38" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <line x1="76.2" y1="36.2" x2="79.8" y2="39.8" stroke="currentColor" strokeWidth="1" />

                {/* ── Visor (the defining feature) ── */}
                <rect x="32" y="36" width="36" height="14" rx="2"
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
