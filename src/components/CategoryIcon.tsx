import type { QuestionType } from '../utils/questionTypes';

interface Props {
    /** Category id (from QUESTION_TYPES) */
    id: QuestionType;
    /** Pixel size (defaults to 24px) */
    size?: number;
    /** Optional className override (e.g. for color) */
    className?: string;
}

/**
 * Single source of truth for category icons.
 *
 * Earlier the QUESTION_TYPES list used raw emoji strings (📅, 🔗, 👯, ⚖️,
 * 🦘, 🔺, 🔢, 🌀). Those render in the OS color-emoji font, which clashes
 * with the chalkboard hand-drawn aesthetic everywhere else in the app
 * (tester feedback: "we like SVGs, not emojis").
 *
 * For categories whose icon is plain math notation (+, −, ×, ÷, ≈, x², √,
 * ±, x=, ½, 10, ⅓, .5, %, a:b, GCF), we render the text in the chalk font
 * — these ARE on-brand for a math game.
 *
 * For categories that need a real symbol (daily, bonds, doubles, compare,
 * skip, shapes, orderops, mix-all), we render a hand-drawn stroke SVG.
 *
 * All SVGs use viewBox 24×24, strokeWidth 2, currentColor stroke, no fill
 * — matching the band-switcher sapling/rocket pattern.
 */
export function CategoryIcon({ id, size = 24, className }: Props) {
    const svgProps = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        className,
    };

    switch (id) {
        case 'daily':
            // Calendar — frame + binder rings + grid dot
            return (
                <svg {...svgProps}>
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <line x1="8" y1="3" x2="8" y2="7" />
                    <line x1="16" y1="3" x2="16" y2="7" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'bonds':
            // Two interlocking circles — number bonds
            return (
                <svg {...svgProps}>
                    <circle cx="9" cy="12" r="5" />
                    <circle cx="15" cy="12" r="5" />
                </svg>
            );
        case 'doubles':
            // Two identical small circles side by side with an equals between
            return (
                <svg {...svgProps}>
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="12" r="3" />
                    <line x1="11" y1="10.5" x2="13" y2="10.5" />
                    <line x1="11" y1="13.5" x2="13" y2="13.5" />
                </svg>
            );
        case 'compare':
            // Balance scale — a pivot, beam, and two pans
            return (
                <svg {...svgProps}>
                    <line x1="12" y1="4" x2="12" y2="20" />
                    <line x1="6" y1="7" x2="18" y2="7" />
                    <path d="M3 11 L 6 7 L 9 11 L 6 13 Z" />
                    <path d="M15 11 L 18 7 L 21 11 L 18 13 Z" />
                    <line x1="9" y1="20" x2="15" y2="20" />
                </svg>
            );
        case 'skip':
            // Three dots with arrows between, signifying counting-on
            return (
                <svg {...svgProps}>
                    <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <path d="M6.5 10 Q 8.75 7 11 10" />
                    <path d="M13 10 Q 15.25 7 17.5 10" />
                </svg>
            );
        case 'shapes':
            // Triangle + square overlapping — abstract polygon recognition
            return (
                <svg {...svgProps}>
                    <path d="M12 4 L 21 18 L 3 18 Z" />
                    <rect x="7" y="11" width="10" height="9" />
                </svg>
            );
        case 'orderops':
            // Parens with dot inside, hinting precedence rules
            return (
                <svg {...svgProps}>
                    <path d="M8 6 Q 4 12 8 18" />
                    <path d="M16 6 Q 20 12 16 18" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'mix-all':
            // Spiral — preserves the "all mixed up" feeling
            return (
                <svg {...svgProps}>
                    <path d="M12 12 m -1 0 a 1 1 0 1 1 2 0 a 3 3 0 1 1 -3 -3 a 5 5 0 1 1 5 5 a 7 7 0 1 1 -7 -7 a 9 9 0 1 1 9 9" />
                </svg>
            );
        default:
            // For categories whose "icon" is math notation (+, ×, ÷, x², √, %, a:b, GCF, etc.)
            // — render the text in chalk font at the requested size.
            return <CategoryTextIcon id={id} size={size} className={className} />;
    }
}

/** Renders the text-icon for categories where the icon is math notation. */
function CategoryTextIcon({ id, size = 24, className }: Props) {
    const text = TEXT_ICONS[id] ?? id;
    // Scale font-size to fit inside the requested box. ~0.6× of the nominal
    // size feels right for single-char glyphs; smaller for multi-char.
    const isMulti = text.length > 1;
    const fontSize = Math.round(size * (isMulti ? 0.45 : 0.7));
    return (
        <span
            className={`inline-flex items-center justify-center chalk leading-none ${className ?? ''}`}
            style={{ width: size, height: size, fontSize, whiteSpace: 'pre' }}
            aria-hidden
        >
            {text}
        </span>
    );
}

/** Plain-text icons for categories whose icon is mathematical notation. */
const TEXT_ICONS: Partial<Record<QuestionType, string>> = {
    add: '+',
    subtract: '−',
    multiply: '×',
    divide: '÷',
    add1: '+',
    sub1: '−',
    evenodd: '½',
    tens: '10',
    round: '≈',
    square: 'x²',
    sqrt: '√',
    exponent: 'xⁿ',
    negatives: '±',
    linear: 'x=',
    gcflcm: 'GCF',
    ratio: 'a:b',
    fraction: '⅓',
    decimal: '.5',
    percent: '%',
    'mix-basic': '+−×÷',
};
