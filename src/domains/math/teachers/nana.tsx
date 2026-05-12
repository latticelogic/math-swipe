/**
 * Nana — the comfort teacher.
 *
 * Bun hairstyle with two stray strands, glasses on a beaded chain, knitting
 * needles in hand mid-purl. Voice is warm-grandma; she shows up automatically
 * when the player has just had a few wrongs in a row, lowering the stakes.
 *
 * Auto-swap: struggling state (3+ wrongs in a row).
 * Unlocks: comeback achievement (3 wrongs followed by 5 corrects in one session)
 *  — proxied here via dayStreak >= 3 to keep the implementation simple.
 */

import type { Teacher } from './types';
import { Eyes, Mouth, Blush, Shoulders, Sparkle } from './shared';

export const NANA: Teacher = {
    id: 'nana',
    name: 'Nana',
    tagline: 'Slow down, deary. You\'re doing great.',
    unlock: {
        reason: 'Reach a 3-day streak',
        check: (s) => s.dayStreak >= 3,
    },
    context: { whenStruggling: true },
    // Nana's voice: comforting grandmother. Gentle, never patronising,
    // never saccharine. Notices effort. Specialises in 'struggling' state
    // (she auto-activates when the player needs a break). The warm
    // counterweight to Coach Pi's urgency.
    voice: {
        idle: [
            'Take all the time you need, sweetie.',
            'There\'s tea on the table.',
            'Whenever you\'re ready, dear.',
            'No rush. Math is timeless.',
            'I\'ll be right here.',
        ],
        success: [
            'Oh, I knew you could.',
            'Wonderful, dear.',
            'See? Easy peasy.',
            'Proud of you, sweetheart.',
            'That\'s my star.',
            'Sharp as ever.',
        ],
        fail: [
            'It\'s alright, love. Try once more.',
            'Mistakes are how we learn, dear.',
            'Take a breath. You\'ve got this.',
            'No need to fret.',
        ],
        struggling: [
            'Slow down, sweetheart. Read it again.',
            'Pause. Breathe. The numbers will wait.',
            'How about a little break?',
            'No prize for rushing.',
        ],
        comeback: [
            'There\'s my star.',
            'I knew you\'d find your stride.',
            'Back in the swing of it.',
        ],
        easterEggs: [
            'My grandmother taught me times tables on a clothesline. Each peg was an answer.',
            'A little tip: count backwards from the bigger number. Always works.',
            'When I was your age, we did long division with paper. You\'re lucky, dear.',
        ],
    },
    Portrait({ state, streak }) {
        return (
            <g>
                {/* ── Bun on top of head ── */}
                <ellipse cx="50" cy="14" rx="10" ry="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.18" />
                {/* Bun cross-hatch texture */}
                <line x1="44" y1="12" x2="56" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                <line x1="44" y1="16" x2="56" y2="12" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
                {/* Bun pin */}
                <line x1="60" y1="12" x2="64" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="64" cy="9" r="1.2" fill="currentColor" />

                {/* ── Stray hair strands framing face ── */}
                <path d="M 28 28 Q 26 36 32 44" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
                <path d="M 72 28 Q 74 36 68 44" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" />
                {/* Hair-line above forehead */}
                <path d="M 30 26 Q 50 20 70 26" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />

                {/* ── Head (round, kind face) ── */}
                <circle cx="50" cy="42" r="22" stroke="currentColor" strokeWidth="2" fill="none" />

                {/* ── Glasses on a beaded chain ── */}
                <g>
                    {/* Cat-eye-ish glasses */}
                    <path d="M 32 38 Q 32 32 40 32 Q 47 32 47 38 Q 47 42 39 42 Q 32 42 32 38 Z"
                        stroke="currentColor" strokeWidth="1.8" fill="none" />
                    <path d="M 53 38 Q 53 32 60 32 Q 68 32 68 38 Q 68 42 61 42 Q 53 42 53 38 Z"
                        stroke="currentColor" strokeWidth="1.8" fill="none" />
                    <line x1="47" y1="38" x2="53" y2="38" stroke="currentColor" strokeWidth="1.2" />
                    {/* Beaded chain */}
                    <path d="M 32 40 Q 26 60 32 76" stroke="currentColor" strokeWidth="0.8" fill="none" strokeDasharray="1 2" opacity="0.7" />
                    <path d="M 68 40 Q 74 60 68 76" stroke="currentColor" strokeWidth="0.8" fill="none" strokeDasharray="1 2" opacity="0.7" />
                </g>

                {/* ── Eyes (kind, slightly closed) ── */}
                <Eyes state={state === 'idle' ? 'success' : state} cx={50} cy={38} eyeGap={10} />

                {/* ── Mouth ── */}
                <Mouth state={state} cx={50} cy={52} />

                {/* ── Constant warm blush — Nana is always rosy ── */}
                <Blush cx={50} cy={48} gap={20} />

                {/* ── Cardigan collar with pearls ── */}
                <Shoulders />
                <g stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.75">
                    <path d="M 38 80 Q 50 86 62 80" />
                </g>
                {/* Pearl necklace */}
                <g fill="currentColor" opacity="0.6">
                    <circle cx="42" cy="86" r="1.3" />
                    <circle cx="46" cy="88" r="1.3" />
                    <circle cx="50" cy="89" r="1.5" />
                    <circle cx="54" cy="88" r="1.3" />
                    <circle cx="58" cy="86" r="1.3" />
                </g>

                {/* ── Knitting needles + yarn ── */}
                <g>
                    {/* Two crossed needles */}
                    <line x1="14" y1="100" x2="34" y2="112" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="14" y1="112" x2="34" y2="100" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    {/* Tip dots */}
                    <circle cx="14" cy="100" r="1.2" fill="currentColor" />
                    <circle cx="14" cy="112" r="1.2" fill="currentColor" />
                    {/* Yarn ball */}
                    <circle cx="22" cy="106" r="5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.18" />
                    <path d="M 18 104 Q 22 110 26 105" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.6" />
                    <path d="M 19 108 Q 23 104 25 109" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.6" />
                </g>

                {/* ── Streak: tiny hearts ── */}
                {streak >= 5 && state === 'streak' && (
                    <>
                        <Sparkle x={80} y={22} size={3} />
                        <text x="86" y="50" fontSize="8" fill="currentColor" opacity="0.7">♥</text>
                    </>
                )}
            </g>
        );
    },
};
