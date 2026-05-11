/**
 * Dr. Cipher — number-theory sleuth.
 *
 * Deerstalker hat, magnifying glass framing one eye, calabash pipe with a
 * wisp of chalk-smoke. Riddle-y, mysterious, treats every problem like a
 * case file. Pairs perfectly with the Magic School lessons.
 *
 * Auto-swap: Magic / Tricks tab.
 * Unlocks: master 5 magic tricks.
 */

import type { Teacher } from './types';
import { Eyes, Mouth, Sparkle } from './shared';

export const DR_CIPHER: Teacher = {
    id: 'cipher',
    name: 'Dr. Cipher',
    tagline: 'Every number is a clue.',
    unlock: {
        reason: 'Master 5 magic tricks',
        // Mastery is stored separately (math-swipe-mastered-tricks);
        // we proxy via totalSolved here and let the trick-mastery hook
        // refine when wired.
        check: (s) => s.sessionsPlayed >= 5,
    },
    context: { whenMagicLesson: true },
    voice: {
        idle: [
            'Curious… curious indeed. 🔍',
            'I deduce you\'re ready.',
            'A number is a story. Listen.',
            'Hmm. The trail begins here.',
        ],
        success: [
            'Brilliant deduction. 🕵️',
            'Case cracked. 🗝️',
            'Elementary. 🎩',
            'The pattern reveals itself!',
            'You saw what I saw. 👁️',
        ],
        fail: [
            'A red herring. We try again.',
            'The plot thickens — keep at it.',
            'A wrong turn down a familiar alley.',
        ],
        streak: [
            'A breakthrough! 🔓',
            'You\'ve cracked the code. 🔍',
            'They\'ll write detective novels about this.',
        ],
        easterEggs: [
            'Did you know? 12 = 3×4 AND 6+6 AND 2². Numbers are clues.',
            'There are exactly 25 primes under 100. I counted them twice.',
            'Riddle: I\'m even, prime, and the only one. Who am I? (2)',
        ],
    },
    Portrait({ state, streak }) {
        return (
            <g>
                {/* ── Deerstalker hat (front + ear flaps) ── */}
                <g>
                    {/* Brim */}
                    <ellipse cx="50" cy="22" rx="32" ry="4" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
                    {/* Crown */}
                    <path d="M 28 22 Q 30 6 50 4 Q 70 6 72 22 Z"
                        stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" strokeLinejoin="round" />
                    {/* Top button */}
                    <circle cx="50" cy="6" r="2" fill="currentColor" opacity="0.7" />
                    {/* Ear flap on the side */}
                    <path d="M 22 22 Q 16 30 24 36 Q 28 32 28 26" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
                    {/* Houndstooth pattern hint */}
                    <line x1="36" y1="14" x2="40" y2="18" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
                    <line x1="46" y1="11" x2="50" y2="15" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
                    <line x1="56" y1="13" x2="60" y2="17" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
                </g>

                {/* ── Head ── */}
                <ellipse cx="50" cy="42" rx="22" ry="22" stroke="currentColor" strokeWidth="2" fill="none" />

                {/* ── Brow over the right (un-magnified) eye ── */}
                <path d="M 56 36 Q 60 34 64 36" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                {/* Single raised brow on left (under magnifier) */}
                <path d="M 36 33 Q 40 31 44 33" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                {/* ── Eyes ── */}
                <Eyes state={state} cx={50} cy={40} eyeGap={10} />

                {/* ── Magnifying glass framing the LEFT eye (the defining gimmick) ── */}
                <g>
                    <circle cx="40" cy="40" r="11" stroke="currentColor" strokeWidth="2.2" fill="currentColor" fillOpacity="0.06" />
                    {/* Glass shine */}
                    <path d="M 35 36 Q 38 34 40 36" stroke="currentColor" strokeWidth="1" opacity="0.4" />
                    {/* Handle */}
                    <line x1="32" y1="48" x2="22" y2="58" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </g>

                {/* ── Moustache ── */}
                <path d="M 42 52 Q 50 56 58 52 Q 56 50 50 51 Q 44 50 42 52 Z"
                    stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.4" strokeLinejoin="round" />

                {/* ── Mouth (under moustache) ── */}
                <Mouth state={state} cx={50} cy={58} />

                {/* ── Pipe with smoke wisp ── */}
                <g>
                    <path d="M 60 60 L 72 64 Q 76 64 76 60 L 76 56" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <ellipse cx="76" cy="56" rx="3" ry="4" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
                    {/* Smoke (only when state is "streak" — case cracked) */}
                    {state === 'streak' && (
                        <g opacity="0.6">
                            <path d="M 76 50 Q 80 46 76 42 Q 72 38 78 32" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            <circle cx="79" cy="30" r="1.5" fill="currentColor" />
                        </g>
                    )}
                </g>

                {/* ── Coat collar (high, mysterious) ── */}
                <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85">
                    <path d="M 50 64 L 50 80" />
                    <path d="M 16 110 Q 28 80 50 80 Q 72 80 84 110" />
                    {/* Collar lapels */}
                    <path d="M 38 86 L 50 100" opacity="0.5" />
                    <path d="M 62 86 L 50 100" opacity="0.5" />
                    <circle cx="50" cy="92" r="1.5" fill="currentColor" opacity="0.5" />
                    <circle cx="50" cy="100" r="1.5" fill="currentColor" opacity="0.5" />
                </g>

                {streak >= 5 && state === 'streak' && (
                    <Sparkle x={84} y={24} size={4} />
                )}
            </g>
        );
    },
};
