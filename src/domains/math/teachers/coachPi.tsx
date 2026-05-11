/**
 * Coach Pi — speed-and-accuracy whistle-blower.
 *
 * Sweatband, sharp jawline, whistle dangling from a lanyard. Built for the
 * speedrun + timed-mode contexts where pacing matters more than reflection.
 *
 * Auto-swap: speedrun + timed mode.
 * Unlocks: complete a speedrun.
 */

import type { Teacher } from './types';
import { Eyes, Mouth, Shoulders, Sparkle } from './shared';

export const COACH_PI: Teacher = {
    id: 'coach-pi',
    name: 'Coach Pi',
    tagline: 'Faster. Sharper. Cleaner.',
    unlock: {
        reason: 'Complete a speedrun',
        check: (s) => s.bestSpeedrunTime > 0,
    },
    context: { whenSpeedrun: true, whenTimedMode: true },
    voice: {
        idle: [
            'Three… two… one… 🏁',
            'Let\'s see those reps.',
            'Eyes up. Hands ready.',
            'No warm-ups. We GO. 💨',
        ],
        success: [
            'CLEAN. Next! ⚡',
            'Reps building.',
            'That was fast! 🏎️',
            'Form is locked in.',
            'Boom. Move it.',
        ],
        fail: [
            'Reset. Breathe. Again.',
            'Shake it off — next rep.',
            'Doesn\'t count. Try once more.',
        ],
        streak: [
            'STREAK! Don\'t look down. 🔥',
            'You\'re in the zone — STAY there.',
            'CARDIO for the brain. KEEP GOING.',
        ],
        comeback: [
            'THAT\'S the comeback I wanted. 💪',
            'There it is. Pure grit.',
        ],
    },
    Portrait({ state, streak }) {
        const sparkle = streak >= 5;
        return (
            <g>
                {/* ── Sweatband (defining feature, sits on forehead) ── */}
                <g>
                    <rect x="24" y="22" width="52" height="8" rx="3" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
                    {/* Three vertical stripes */}
                    <line x1="40" y1="22" x2="40" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
                    <line x1="50" y1="22" x2="50" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
                    <line x1="60" y1="22" x2="60" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
                </g>
                {/* ── Cropped buzzcut hair under the band ── */}
                <path d="M 26 30 Q 30 16 50 14 Q 70 16 74 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeDasharray="1 2" opacity="0.7" />

                {/* ── Head (square jaw — slightly wider, more angular) ── */}
                <path d="M 26 38 Q 26 60 36 64 L 64 64 Q 74 60 74 38" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M 26 38 Q 28 30 50 30 Q 72 30 74 38" stroke="currentColor" strokeWidth="2" fill="none" />

                {/* ── Brows (intense, lower) ── */}
                <line x1="36" y1="38" x2="44" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="56" y1="36" x2="64" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

                {/* ── Eyes ── */}
                <Eyes state={state} cx={50} cy={42} eyeGap={10} />

                {/* ── Nose ── */}
                <path d="M 50 47 L 49 53 L 51 53" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6" />

                {/* ── Mouth (whistling on idle, otherwise standard) ── */}
                {state === 'idle' ? (
                    /* Pursed-lips whistling */
                    <ellipse cx={50} cy={58} rx="2.5" ry="2" stroke="currentColor" strokeWidth="2" fill="none" />
                ) : (
                    <Mouth state={state} cx={50} cy={58} />
                )}

                {/* ── Shoulders (broad athletic) ── */}
                <Shoulders />
                {/* Tank top straps */}
                <line x1="42" y1="80" x2="40" y2="100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                <line x1="58" y1="80" x2="60" y2="100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.85" />

                {/* ── Whistle on lanyard ── */}
                <g>
                    <path d="M 50 78 Q 60 88 65 100" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.7" />
                    <ellipse cx="65" cy="103" rx="5" ry="3" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
                    <circle cx="63" cy="103" r="1.2" fill="currentColor" />
                    {/* whistle tip */}
                    <line x1="68" y1="102" x2="71" y2="101" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    {/* sound puffs on streak */}
                    {state === 'streak' && (
                        <g opacity="0.8">
                            <path d="M 73 99 Q 76 97 78 99" stroke="currentColor" strokeWidth="1.2" fill="none" />
                            <path d="M 76 95 Q 79 93 81 95" stroke="currentColor" strokeWidth="1.2" fill="none" />
                        </g>
                    )}
                </g>
                {sparkle && <Sparkle x={20} y={108} size={4} />}
            </g>
        );
    },
};
