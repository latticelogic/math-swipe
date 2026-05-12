/**
 * Lex the Fox — magic-tricks mascot.
 *
 * Fox-shaped head (pointed snout + triangular ears), tail curling around the
 * neck like a scarf, sly grin. The only non-human teacher. Best for the
 * Magic School lesson barrage where the vibe is "let me show you a trick."
 *
 * Auto-swap: none (manual pick) — Dr. Cipher owns Magic auto-swap.
 * Unlocks: complete 3 magic lessons (proxied via sessionsPlayed >= 3).
 */

import type { Teacher } from './types';
import { Eyes, Mouth, Sparkle } from './shared';

export const LEX: Teacher = {
    id: 'lex',
    name: 'Lex the Fox',
    tagline: 'Watch closely — here\'s the trick.',
    unlock: {
        reason: 'Play 3 sessions',
        check: (s) => s.sessionsPlayed >= 3,
    },
    // Lex's voice: stage magician. Treats every solve as a magic trick
    // being performed. Sly, theatrical, never mean. Distinct by being
    // showy-confident rather than warm/clinical/etc.
    voice: {
        idle: [
            'Wanna see something cool?',
            'Pick a number, any number…',
            'I know a shortcut. Just watch.',
            'Stand back. Pay attention.',
            'The trick is in the setup.',
        ],
        success: [
            'Magic.',
            'Told you I knew a shortcut.',
            'Smooth. Like silk.',
            'Easy when you know the trick.',
            'Now you see it.',
            'Sleight of hand, sharp of mind.',
        ],
        fail: [
            'Lost the trail. Try again.',
            'Sleight of hand slipped.',
            'Even foxes fumble.',
            'Off-script. Restart the trick.',
        ],
        streak: [
            'Stealing the spotlight.',
            'On a roll. Nine tails of luck.',
            'Audience is hooked.',
            'They\'ll demand an encore.',
        ],
        easterEggs: [
            'Trick: any number divisible by 9 has a digit-sum divisible by 9.',
            'Trick: × 5 is the same as ÷ 2 × 10.',
            'My favorite number is 9. It always tells the truth (in mod 9).',
            'A 2-digit number times 11? Split the digits, tuck their sum in the middle.',
        ],
    },
    Portrait({ state, streak }) {
        return (
            <g>
                {/* ── Triangular fox ears ── */}
                <path d="M 26 30 L 22 8 L 38 22 Z"
                    stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" strokeLinejoin="round" />
                <path d="M 74 30 L 78 8 L 62 22 Z"
                    stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" strokeLinejoin="round" />
                {/* Inner ear */}
                <path d="M 28 24 L 26 14 L 34 20 Z" fill="currentColor" opacity="0.35" />
                <path d="M 72 24 L 74 14 L 66 20 Z" fill="currentColor" opacity="0.35" />

                {/* ── Head: rounded triangle pointing slightly down (snout shape) ── */}
                <path d="M 26 38 Q 28 22 50 22 Q 72 22 74 38 Q 74 54 64 60 L 50 70 L 36 60 Q 26 54 26 38 Z"
                    stroke="currentColor" strokeWidth="2" fill="none" strokeLinejoin="round" />

                {/* ── Cheek tufts ── */}
                <path d="M 30 50 Q 26 56 30 60" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M 70 50 Q 74 56 70 60" stroke="currentColor" strokeWidth="1.5" fill="none" />

                {/* ── White face-mask area (subtle V down the snout) ── */}
                <path d="M 50 28 L 42 52 L 50 64 L 58 52 Z"
                    fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />

                {/* ── Eyes (slightly angled, sly) ── */}
                <Eyes state={state === 'idle' ? 'comeback' : state} cx={50} cy={38} eyeGap={11} />

                {/* ── Black snout nose ── */}
                <ellipse cx="50" cy="56" rx="3" ry="2.2" fill="currentColor" opacity="0.85" />
                {/* Bridge of nose */}
                <line x1="50" y1="44" x2="50" y2="54" stroke="currentColor" strokeWidth="1" opacity="0.4" />

                {/* ── Sly mouth: sharper than the default Mouth ── */}
                {state === 'success' || state === 'streak' || state === 'idle' ? (
                    /* Sly grin with tiny fang */
                    <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                        <path d="M 44 62 Q 50 66 56 62" />
                        <line x1="48" y1="62" x2="48" y2="64.5" strokeWidth="1.2" />
                    </g>
                ) : (
                    <Mouth state={state} cx={50} cy={64} />
                )}

                {/* ── Neck/shoulder ── */}
                <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
                    <path d="M 40 72 L 38 80" />
                    <path d="M 18 110 Q 28 84 38 80 Q 50 76 62 80 Q 70 86 70 100" />
                </g>

                {/* ── Bushy tail curling up from BEHIND the right shoulder, with
                    a clearly fluffy white tip. Drawn last so it sits on top
                    of the shoulder line — reads as "tail wrapping," not "pad." */}
                <g>
                    {/* Main tail body — thick S-curve up and over */}
                    <path d="M 70 100 Q 86 96 92 80 Q 94 70 86 64 Q 76 64 74 74"
                        stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.18" strokeLinejoin="round" strokeLinecap="round" />
                    {/* Fur tufts along the spine of the tail */}
                    <path d="M 84 96 Q 86 92 84 90" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
                    <path d="M 90 84 Q 92 80 89 78" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
                    <path d="M 88 72 Q 90 68 86 67" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6" />
                    {/* White fluffy tip */}
                    <ellipse cx="80" cy="68" rx="5" ry="4" fill="currentColor" opacity="0.45" />
                    <path d="M 76 66 Q 78 63 81 64 M 80 64 Q 82 61 84 64" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.7" strokeLinecap="round" />
                </g>

                {/* ── Tiny top hat behind ear (mascot of magic) on streak ── */}
                {state === 'streak' && (
                    <g opacity="0.9">
                        <rect x="76" y="2" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3" />
                        <line x1="74" y1="12" x2="88" y2="12" stroke="currentColor" strokeWidth="1.5" />
                    </g>
                )}

                {streak >= 5 && state === 'streak' && (
                    <>
                        <Sparkle x={18} y={26} size={4} />
                        <Sparkle x={86} y={68} size={3} />
                    </>
                )}
            </g>
        );
    },
};
