/**
 * Pixel — the gamer.
 *
 * Bunny-ear gaming headset with a glowing antenna mic, oversized hoodie hood
 * up. Reads Gen-Alpha streamer-coded — the friend who teaches you cool tricks
 * via Roblox slang. Best for younger players where formality kills engagement.
 *
 * Auto-swap: K-2 + casual mix.
 * Unlocks: solve 25 problems on the K-2 band (or, default for new K-2 picks).
 */

import type { Teacher } from './types';
import { Eyes, Mouth, Sparkle } from './shared';

export const PIXEL: Teacher = {
    id: 'pixel',
    name: 'Pixel',
    tagline: 'Big-W energy. Math for the squad.',
    unlock: {
        reason: 'Solve 25 problems',
        check: (s) => s.totalSolved >= 25,
    },
    voice: {
        idle: [
            'Lock in. We got this. 🎮',
            'On standby. Hit go.',
            'Vibing. Ready when you are.',
            'Chat is in your favor 💬',
        ],
        success: [
            'YESSS. W. 🏆',
            'Big brain unlocked. 🧠✨',
            'That\'s a clip. Save it. 📹',
            'Powering up. ⚡',
            'Combo popping! 💥',
        ],
        fail: [
            'Respawn. We\'re cooked, but only briefly.',
            'L canceled. Try again.',
            'Glitch in the matrix 👀',
            'Nah, that wasn\'t the play.',
        ],
        streak: [
            'STREAK! Chat is going crazy! 🔥',
            'KILLSTREAK ENERGY 💀⚡',
            'Multiplier stacking! KEEP GOING.',
        ],
        easterEggs: [
            'Random fact: 0xFF is 255. That\'s why colors max at 255.',
            'Did you know? 64 = 2 to the 6. Powers of 2 are clutch.',
            'Math fact: a hexagon tiles perfectly. So does this win streak.',
        ],
    },
    Portrait({ state, streak }) {
        return (
            <g>
                {/* ── Hoodie hood (oversized, pulled up around head) ── */}
                <path d="M 16 50 Q 14 22 50 14 Q 86 22 84 50 L 80 64 Q 50 70 20 64 Z"
                    stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.10" strokeLinejoin="round" />
                {/* Hoodie drawstrings */}
                <line x1="40" y1="62" x2="38" y2="78" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                <line x1="60" y1="62" x2="62" y2="78" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                <circle cx="38" cy="80" r="1.5" fill="currentColor" opacity="0.7" />
                <circle cx="62" cy="80" r="1.5" fill="currentColor" opacity="0.7" />

                {/* ── Head (smaller, framed by hood) ── */}
                <circle cx="50" cy="42" r="20" stroke="currentColor" strokeWidth="2" fill="none" />

                {/* ── Bunny-ear gaming headset (defining feature) ── */}
                <g>
                    {/* headband */}
                    <path d="M 30 32 Q 50 18 70 32" stroke="currentColor" strokeWidth="2.5" fill="none" />
                    {/* left ear cup */}
                    <ellipse cx="30" cy="40" rx="5" ry="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
                    {/* right ear cup */}
                    <ellipse cx="70" cy="40" rx="5" ry="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
                    {/* bunny ears sticking up */}
                    <path d="M 32 24 Q 30 8 36 6 Q 38 18 38 30" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" strokeLinejoin="round" />
                    <path d="M 68 24 Q 70 8 64 6 Q 62 18 62 30" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" strokeLinejoin="round" />
                    {/* ear inner */}
                    <line x1="34" y1="14" x2="36" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                    <line x1="66" y1="14" x2="64" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                    {/* mic boom */}
                    <path d="M 30 47 Q 26 56 36 60" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <circle cx="36" cy="60" r="2" fill="currentColor" opacity="0.7" />
                </g>

                {/* ── Eyes ── */}
                <Eyes state={state} cx={50} cy={44} eyeGap={9} />

                {/* ── Mouth ── */}
                <Mouth state={state} cx={50} cy={54} />

                {/* ── Game controller in hand ── */}
                <g>
                    <path d="M 86 102 Q 92 98 96 100" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    {/* controller body */}
                    <path d="M 76 110 Q 76 104 82 104 L 92 104 Q 98 104 98 110 Q 96 116 92 114 L 82 114 Q 78 116 76 110 Z"
                        stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" strokeLinejoin="round" />
                    {/* d-pad */}
                    <line x1="81" y1="109" x2="84" y2="109" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="82.5" y1="107" x2="82.5" y2="111" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    {/* buttons */}
                    <circle cx="92" cy="108" r="1" fill="currentColor" />
                    <circle cx="95" cy="111" r="1" fill="currentColor" />
                </g>

                {/* ── Streak: rainbow pixel sparkles around hood ── */}
                {streak >= 5 && state === 'streak' && (
                    <>
                        <Sparkle x={20} y={20} size={4} />
                        <Sparkle x={84} y={26} size={3} />
                        <rect x="14" y="60" width="3" height="3" fill="currentColor" opacity="0.9" />
                        <rect x="86" y="64" width="3" height="3" fill="currentColor" opacity="0.9" />
                    </>
                )}
            </g>
        );
    },
};
