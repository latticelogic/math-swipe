/**
 * Hand-drawn icons for each Magic trick.
 *
 * Replaces the per-trick emoji that previously rendered in the OS
 * color-emoji font and clashed with the chalkboard aesthetic. Each icon
 * is intentionally chosen to evoke the *concept* of the trick (not just a
 * generic decoration).
 *
 * Style matches CategoryIcon and AgeBandIcon:
 *   24×24 viewBox · strokeWidth 2 · currentColor · no fill · round caps
 *
 * Keyed by trick.id (stable string IDs from mathTricks.ts), so future
 * icon refinements only touch one entry here without rippling through
 * data.
 */

interface Props {
    id: string;
    size?: number;
    className?: string;
}

export function TrickIcon({ id, size = 24, className }: Props) {
    const p = {
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
        // ── Multiplication tricks ──────────────────────────────────────
        case 'multiply-5':
            // Halve-then-times-10 — a hand with 5 fingers (homage to the
            // original 🖐️ but rendered as a simple stylized palm)
            return (
                <svg {...p}>
                    <path d="M9 21 L 9 13 L 5 13 L 5 8" />
                    <path d="M12 21 L 12 11 L 12 3" />
                    <path d="M15 21 L 15 11 L 15 4" />
                    <path d="M18 21 L 18 11 L 18 5" />
                    <path d="M6 21 L 6 14" />
                    <path d="M5 21 L 19 21" />
                </svg>
            );
        case 'multiply-9':
            // ×10 then subtract — a loop arrow showing the "subtract" step
            return (
                <svg {...p}>
                    <text x="3" y="16" fontSize="11" fontFamily="sans-serif" fontWeight="700" fill="currentColor" stroke="none">×9</text>
                    <path d="M14 7 Q 21 12 14 17" />
                    <path d="M14 17 L 16.5 17" />
                    <path d="M14 17 L 14 14.5" />
                </svg>
            );
        case 'multiply-11':
            // Two parallel ones — the digits of 11
            return (
                <svg {...p}>
                    <line x1="8" y1="4" x2="8" y2="20" />
                    <line x1="16" y1="4" x2="16" y2="20" />
                    <path d="M6 6 L 8 4" />
                    <path d="M14 6 L 16 4" />
                </svg>
            );
        case 'multiply-12':
            // Clock face at 12 — the "by 12" connection
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="5" x2="12" y2="12" />
                    <line x1="12" y1="12" x2="16" y2="12" />
                </svg>
            );
        case 'multiply-15':
            // Half-circle (15 = 10 + half-of-that) — geometric "half" gesture
            return (
                <svg {...p}>
                    <line x1="4" y1="20" x2="20" y2="20" />
                    <path d="M4 20 A 8 8 0 0 1 20 20" />
                    <line x1="12" y1="20" x2="12" y2="12" />
                </svg>
            );
        case 'multiply-25':
            // Quarter symbol — ÷4 then ×100 = "quarter coin"
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="8" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                </svg>
            );
        case 'multiply-ends-5-10-apart':
            // Two 5s — connected, 10 apart — handshake metaphor
            return (
                <svg {...p}>
                    <text x="3" y="16" fontSize="11" fontFamily="sans-serif" fontWeight="700" fill="currentColor" stroke="none">5↔5</text>
                </svg>
            );
        case 'double-halve':
            // A scale tipping — double one side, halve the other
            return (
                <svg {...p}>
                    <line x1="12" y1="4" x2="12" y2="20" />
                    <line x1="4" y1="10" x2="20" y2="10" />
                    <circle cx="6" cy="13" r="2" fill="currentColor" stroke="none" />
                    <circle cx="18" cy="14" r="3" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'cross-multiply':
            // Two crossed arrows — the Vedic cross-multiplication pattern
            return (
                <svg {...p}>
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="19" y1="5" x2="5" y2="19" />
                </svg>
            );
        case 'just-over-100':
            // A number line crossing 100 with a tick above
            return (
                <svg {...p}>
                    <line x1="3" y1="14" x2="21" y2="14" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <text x="6" y="9" fontSize="8" fontFamily="sans-serif" fontWeight="700" fill="currentColor" stroke="none">102</text>
                </svg>
            );
        case 'complement-100':
            // Two numbers below 100 — "near-below" indicator
            return (
                <svg {...p}>
                    <line x1="3" y1="14" x2="21" y2="14" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <text x="2" y="9" fontSize="8" fontFamily="sans-serif" fontWeight="700" fill="currentColor" stroke="none">98²</text>
                </svg>
            );
        case 'rule-of-99':
            // ×99 — the "almost 100" trick
            return (
                <svg {...p}>
                    <text x="2" y="17" fontSize="11" fontFamily="sans-serif" fontWeight="700" fill="currentColor" stroke="none">×99</text>
                </svg>
            );
        case 'rule-of-101':
            // ×101 — mirror of 99
            return (
                <svg {...p}>
                    <text x="2" y="17" fontSize="10" fontFamily="sans-serif" fontWeight="700" fill="currentColor" stroke="none">×101</text>
                </svg>
            );

        // ── Squaring tricks ────────────────────────────────────────────
        case 'square-5':
            // n5² — the small-5 superscript trick
            return (
                <svg {...p}>
                    <text x="3" y="18" fontSize="14" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">n5²</text>
                </svg>
            );
        case 'square-40s':
            // ²₄₀ — a 4 in the 40s squared notation
            return (
                <svg {...p}>
                    <text x="3" y="18" fontSize="12" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">4n²</text>
                </svg>
            );
        case 'square-50s':
            // 5n²
            return (
                <svg {...p}>
                    <text x="3" y="18" fontSize="12" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">5n²</text>
                </svg>
            );
        case 'near-100':
            // Square near 100 — 99² style
            return (
                <svg {...p}>
                    <text x="3" y="18" fontSize="11" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">99²</text>
                </svg>
            );
        case 'near-1000':
            // 999²
            return (
                <svg {...p}>
                    <text x="1" y="18" fontSize="10" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">999²</text>
                </svg>
            );
        case 'diff-squares':
            // a² − b² — the difference identity
            return (
                <svg {...p}>
                    <text x="2" y="17" fontSize="10" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">a²−b²</text>
                </svg>
            );

        // ── Division tricks ────────────────────────────────────────────
        case 'divide-3':
            // ÷3 — divisibility by 3
            return (
                <svg {...p}>
                    <text x="4" y="18" fontSize="14" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">÷3</text>
                </svg>
            );
        case 'divide-5':
            // ÷5
            return (
                <svg {...p}>
                    <text x="4" y="18" fontSize="14" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">÷5</text>
                </svg>
            );
        case 'divide-25':
            // ÷25
            return (
                <svg {...p}>
                    <text x="2" y="18" fontSize="12" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">÷25</text>
                </svg>
            );
        case 'divisible-11':
            // 11 with a divisor mark
            return (
                <svg {...p}>
                    <text x="3" y="18" fontSize="12" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">÷11</text>
                </svg>
            );

        // ── Addition / Subtraction tricks ──────────────────────────────
        case 'sum-odds':
            // 1+3+5+...  — sum of odds
            return (
                <svg {...p}>
                    <text x="0.5" y="17" fontSize="8" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">1+3+5</text>
                </svg>
            );
        case 'sub-1000':
            // 1000 − x
            return (
                <svg {...p}>
                    <text x="0" y="17" fontSize="8" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">1000−n</text>
                </svg>
            );
        case 'add-reversed':
            // ab + ba — palindrome addition
            return (
                <svg {...p}>
                    <text x="2" y="17" fontSize="10" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">ab+ba</text>
                </svg>
            );
        case 'sub-reversed':
            // ab − ba
            return (
                <svg {...p}>
                    <text x="2" y="17" fontSize="10" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">ab−ba</text>
                </svg>
            );

        // ── Series / Number theory ─────────────────────────────────────
        case 'gauss-sum':
            // Σ — the summation symbol, attributed to Gauss
            return (
                <svg {...p}>
                    <text x="5" y="20" fontSize="22" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">Σ</text>
                </svg>
            );
        case 'telescoping-sum':
            // Multiple decreasing vertical lines — terms cancelling
            return (
                <svg {...p}>
                    <line x1="4" y1="10" x2="4" y2="18" />
                    <line x1="8" y1="8" x2="8" y2="20" />
                    <line x1="12" y1="6" x2="12" y2="20" />
                    <line x1="16" y1="8" x2="16" y2="20" />
                    <line x1="20" y1="10" x2="20" y2="18" />
                </svg>
            );
        case 'zeno-paradox':
            // 1/2 + 1/4 + 1/8 — converging
            return (
                <svg {...p}>
                    <text x="0" y="17" fontSize="7" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">½+¼+⅛</text>
                </svg>
            );
        case 'digit-sum-mod':
            // mod 9 — digital root
            return (
                <svg {...p}>
                    <text x="0" y="17" fontSize="9" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">mod 9</text>
                </svg>
            );
        case 'power-last-digit':
            // n^k → ? — last digit of powers
            return (
                <svg {...p}>
                    <text x="2" y="17" fontSize="10" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">nᵏ→?</text>
                </svg>
            );
        case 'product-last-digit':
            // a·b → ? — last digit of product
            return (
                <svg {...p}>
                    <text x="2" y="17" fontSize="10" fontFamily="serif" fontWeight="700" fontStyle="italic" fill="currentColor" stroke="none">a·b→?</text>
                </svg>
            );
        case 'large-power-cycles':
            // Cyclic arrow — the period of last-digit cycles
            return (
                <svg {...p}>
                    <path d="M5 12 A 7 7 0 1 1 19 12 A 7 7 0 1 1 5 12 Z" />
                    <path d="M19 12 L 16 10" />
                    <path d="M19 12 L 16 14" />
                </svg>
            );

        // ── Fractions / Percent / Continued fractions ──────────────────
        case 'flip-percent':
            // x% of y = y% of x — rotation arrow with %
            return (
                <svg {...p}>
                    <text x="2" y="18" fontSize="12" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">%↔</text>
                </svg>
            );
        case 'golden-ratio':
            // φ — the golden ratio symbol
            return (
                <svg {...p}>
                    <text x="6" y="20" fontSize="22" fontFamily="serif" fontWeight="700" fill="currentColor" stroke="none">φ</text>
                </svg>
            );

        // ── Fallback ──
        default:
            // Star — generic "advanced trick" placeholder for any id we
            // haven't authored an icon for yet.
            return (
                <svg {...p}>
                    <path d="M12 2 L 14.5 9 L 22 9 L 16 13.5 L 18 21 L 12 16.5 L 6 21 L 8 13.5 L 2 9 L 9.5 9 Z" />
                </svg>
            );
    }
}
