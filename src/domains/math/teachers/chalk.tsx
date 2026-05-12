/**
 * Mr. Chalk — refined.
 *
 * Round head with messy chalk-dust hair, round spectacles, bow tie. Holding a
 * small piece of chalk in his right hand that animates a tiny wobble. This is
 * the default teacher — soft, encouraging, the one most users see first.
 */

import type { Teacher } from './types';
import { Eyes, Mouth, Blush, Shoulders, Sparkle } from './shared';

export const MR_CHALK: Teacher = {
    id: 'chalk',
    name: 'Mr. Chalk',
    tagline: 'The encouraging classic.',
    isDefault: true,
    // Mr. Chalk's voice: the calm veteran teacher. Notices *how* you
    // think, not just whether you got it right. Never hypes. Never
    // pressures. Specific praise > generic praise.
    voice: {
        idle: [
            'Take your time.',
            'I\'m here when you\'re ready.',
            'No rush.',
            'Read it twice if you need to.',
            'Whenever you\'re set.',
        ],
        success: [
            'Good thinking.',
            'You saw it.',
            'Nicely reasoned.',
            'Clean work.',
            'That\'s the move.',
            'Right on the first look — well done.',
            'Confident answer.',
        ],
        fail: [
            'Close. Try again — what changes?',
            'No worries. Have another look.',
            'Almost. The pattern\'s nearly right.',
            'Easy fix. What did you see?',
        ],
        // Small facts I drop during idle moments. The vibe is "veteran
        // teacher with one good story per topic" — not a quiz-show host.
        easterEggs: [
            'Did you know? Zero was developed in India around the 5th century.',
            'Every number is interesting — that itself is provable.',
            'Pi never repeats. Neither do you.',
            'There are more decimal places in pi than atoms we\'ve counted.',
            'Math wasn\'t invented; it was noticed.',
        ],
    },
    Portrait({ state, streak }) {
        const showSparkle = streak >= 5 && state === 'streak';
        return (
            <g>
                {/* ── Hair: short, tousled, sticking up slightly on the right ── */}
                <path d="M 24 30 Q 28 12 50 10 Q 72 12 76 30"
                    stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                {/* Hair tufts */}
                <path d="M 33 14 Q 36 6 40 11" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M 56 12 Q 60 5 64 12" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M 46 9 L 49 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />

                {/* ── Head ── */}
                <circle cx="50" cy="38" r="24" stroke="currentColor" strokeWidth="2" fill="none" />

                {/* ── Ears ── */}
                <path d="M 26 38 Q 22 38 23 44 Q 25 46 27 44" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M 74 38 Q 78 38 77 44 Q 75 46 73 44" stroke="currentColor" strokeWidth="1.5" fill="none" />

                {/* ── Glasses (round, defining feature) ── */}
                <circle cx="40" cy="36" r="7" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <circle cx="60" cy="36" r="7" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <line x1="47" y1="36" x2="53" y2="36" stroke="currentColor" strokeWidth="1.5" />
                {/* Glasses arms */}
                <line x1="33" y1="36" x2="28" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                <line x1="67" y1="36" x2="72" y2="34" stroke="currentColor" strokeWidth="1" opacity="0.6" />

                {/* ── Eyes (inside the glasses) ── */}
                <Eyes state={state} cx={50} cy={36} eyeGap={10} />

                {/* ── Nose (small) ── */}
                <path d="M 50 42 Q 48 46 50 48" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />

                {/* ── Mouth (below glasses) ── */}
                <Mouth state={state} cx={50} cy={52} />

                {/* ── Blush on success/streak ── */}
                {(state === 'success' || state === 'streak') && (
                    <Blush cx={50} cy={48} gap={20} />
                )}

                {/* ── Bow tie ── */}
                <g stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.12">
                    <path d="M 50 74 L 42 70 L 42 80 L 50 76 L 58 80 L 58 70 Z" strokeLinejoin="round" />
                    <circle cx="50" cy="75" r="2" fill="currentColor" fillOpacity="0.6" stroke="none" />
                </g>

                {/* ── Shoulders + suit collar ── */}
                <Shoulders />
                <path d="M 38 80 L 50 92 L 62 80" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.55" />

                {/* ── Right hand holding chalk stick ── */}
                <g>
                    {/* arm */}
                    <path d="M 78 100 Q 86 102 90 108" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    {/* hand (small circle) */}
                    <circle cx="90" cy="110" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    {/* chalk stick */}
                    <rect x="88" y="98" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2">
                        <animateTransform attributeName="transform" type="rotate"
                            from="-6 90 104" to="6 90 104" dur="2.2s" repeatCount="indefinite"
                            calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" values="-6 90 104;6 90 104;-6 90 104" />
                    </rect>
                </g>
                {/* ── Streak sparkle ── */}
                {showSparkle && <Sparkle x={18} y={20} size={5} />}
            </g>
        );
    },
};
