/**
 * Ms. Sigma — the mathletics champ.
 *
 * Long sweeping hair, lab coat, holding a tiny π scroll. Reads as "I will
 * absolutely demolish a derivative." Voice is Gen-Alpha hype with actual
 * mathematical respect.
 *
 * Auto-swap: hard mode + advanced topics.
 * Unlocks: solve 100+ problems on hard mode.
 */

import type { Teacher } from './types';
import { Eyes, Mouth, Blush, Shoulders, Sparkle } from './shared';

export const MS_SIGMA: Teacher = {
    id: 'sigma',
    name: 'Ms. Sigma',
    tagline: 'No cap, math is her cardio.',
    unlock: {
        reason: 'Solve 100 hard-mode problems',
        check: (s) => s.hardModeSolved >= 100,
    },
    context: { whenHardMode: true },
    voice: {
        idle: [
            'Bring it on. 💅',
            'I see you, mathlete.',
            'Big brain warming up… 🧠',
            'Let\'s get unreasonably correct.',
        ],
        success: [
            'OBSESSED with that solve. 💯',
            'Goated math energy. ⭐',
            'You ATE that. No crumbs. 🍴',
            'Mathematically devastating. 🔥',
            'Slay. Continue. 👑',
        ],
        fail: [
            'It\'s giving "draft attempt." Try again.',
            'Not the vibe. We rerun it.',
            'Misplay. We level up from here. 📈',
        ],
        streak: [
            'STREAK. ABSURD. INCONTESTABLE. 👑',
            'They will study YOUR papers one day.',
            'You\'re cooking with high heat. 🔥',
        ],
        easterEggs: [
            'σ stands for sum. You sum-thing else, fr.',
            'Did you know? Erdős wrote 1,500+ math papers.',
            'Cantor proved some infinities are bigger than others. Just like vibes.',
        ],
    },
    Portrait({ state, streak }) {
        const sparkleStreak = streak >= 5 && state === 'streak';
        return (
            <g>
                {/* ── Long hair (back) cascading past shoulders ── */}
                <path d="M 22 38 Q 18 70 26 110 Q 34 105 32 80"
                    stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06" strokeLinecap="round" />
                <path d="M 78 38 Q 82 70 74 110 Q 66 105 68 80"
                    stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.06" strokeLinecap="round" />

                {/* ── Hair top with side parting ── */}
                <path d="M 26 30 Q 32 10 50 8 Q 72 12 76 32"
                    stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.12" strokeLinecap="round" />
                <path d="M 44 12 Q 52 18 62 14" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />

                {/* ── Head (slightly oval — slimmer face) ── */}
                <ellipse cx="50" cy="40" rx="22" ry="24" stroke="currentColor" strokeWidth="2" fill="none" />

                {/* ── Earrings (tiny hoops) ── */}
                <circle cx="27" cy="48" r="2" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <circle cx="73" cy="48" r="2" stroke="currentColor" strokeWidth="1.2" fill="none" />

                {/* ── Brows (subtle confident arch) ── */}
                <path d="M 36 30 Q 40 28 44 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <path d="M 56 30 Q 60 28 64 30" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                {/* ── Eyes ── */}
                <Eyes state={state} cx={50} cy={38} eyeGap={10} />

                {/* ── Nose ── */}
                <path d="M 50 42 Q 49 47 51 49" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5" />

                {/* ── Lipstick mouth ── */}
                <Mouth state={state} cx={50} cy={54} />

                {/* ── Blush ── */}
                {(state === 'success' || state === 'streak') && <Blush cx={50} cy={50} gap={18} />}

                {/* ── Lab coat collar (V-neck with lapels) ── */}
                <Shoulders />
                <g stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.85">
                    <path d="M 40 80 L 50 96 L 60 80" />
                    <path d="M 36 86 L 50 102" opacity="0.5" />
                    <path d="M 64 86 L 50 102" opacity="0.5" />
                </g>
                {/* Coat-pocket Σ insignia — hand-drawn so it doesn't depend on
                    a specific serif font being loaded at small size */}
                <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.75">
                    <path d="M 60 92 L 66 92 L 62 96 L 66 100 L 60 100" />
                </g>

                {/* ── π scroll in hand ── */}
                <g>
                    <path d="M 18 100 Q 14 102 12 108" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <circle cx="12" cy="110" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <rect x="6" y="100" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" fillOpacity="0.1" />
                    {/* Hand-drawn π glyph */}
                    <g stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round">
                        <line x1="9" y1="103.5" x2="15" y2="103.5" />
                        <line x1="11" y1="103.5" x2="11" y2="107.5" />
                        <line x1="13.5" y1="103.5" x2="13" y2="107.5" />
                    </g>
                </g>

                {sparkleStreak && (
                    <>
                        <Sparkle x={20} y={18} size={4} />
                        <Sparkle x={82} y={22} size={3} />
                    </>
                )}
            </g>
        );
    },
};
