/**
 * Shared face primitives.
 *
 * Every teacher composes these — that's how 8 distinct characters stay
 * cheap to maintain. The eyes/mouth pair drives the *emotional state*; the
 * teacher-specific silhouette drives *who they are*.
 *
 * Coordinate convention: face is centred on (cx, cy) with eyes ~10px apart
 * horizontally and the mouth 12-14px below the eye line. Each primitive
 * accepts (cx, cy) so a teacher can position the face anywhere on its head.
 */

import type { ChalkState } from '../../../engine/domain';

interface FacePos {
    cx: number;
    cy: number;
    /** Optional eye spacing (default 10) and mouth offset (default 12). */
    eyeGap?: number;
    mouthY?: number;
}

// ── EYES ─────────────────────────────────────────────────────────────────────

export function Eyes({ state, cx, cy, eyeGap = 10 }: { state: ChalkState } & FacePos) {
    const lx = cx - eyeGap;
    const rx = cx + eyeGap;
    switch (state) {
        case 'success':
            // Smiling crescents
            return (
                <g>
                    <path d={`M ${lx - 4} ${cy} Q ${lx} ${cy - 5} ${lx + 4} ${cy}`} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d={`M ${rx - 4} ${cy} Q ${rx} ${cy - 5} ${rx + 4} ${cy}`} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </g>
            );
        case 'fail':
        case 'struggling':
            // X-eyes (slightly different stroke widths to differ)
            return (
                <g strokeLinecap="round">
                    <line x1={lx - 4} y1={cy - 4} x2={lx + 4} y2={cy + 4} stroke="currentColor" strokeWidth="2" />
                    <line x1={lx + 4} y1={cy - 4} x2={lx - 4} y2={cy + 4} stroke="currentColor" strokeWidth="2" />
                    <line x1={rx - 4} y1={cy - 4} x2={rx + 4} y2={cy + 4} stroke="currentColor" strokeWidth="2" />
                    <line x1={rx + 4} y1={cy - 4} x2={rx - 4} y2={cy + 4} stroke="currentColor" strokeWidth="2" />
                </g>
            );
        case 'streak':
            // Fired-up oval eyes with a sparkle dot inside
            return (
                <g>
                    <ellipse cx={lx} cy={cy} rx="3.5" ry="4" stroke="currentColor" strokeWidth="2" fill="none" />
                    <ellipse cx={rx} cy={cy} rx="3.5" ry="4" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx={lx + 1.2} cy={cy - 1} r="1" fill="currentColor" />
                    <circle cx={rx + 1.2} cy={cy - 1} r="1" fill="currentColor" />
                </g>
            );
        case 'comeback':
            // Determined narrow eyes
            return (
                <g strokeLinecap="round">
                    <path d={`M ${lx - 4} ${cy} L ${lx + 4} ${cy - 1}`} stroke="currentColor" strokeWidth="2.5" />
                    <path d={`M ${rx - 4} ${cy - 1} L ${rx + 4} ${cy}`} stroke="currentColor" strokeWidth="2.5" />
                </g>
            );
        case 'idle':
        default:
            // Soft round dots
            return (
                <g>
                    <circle cx={lx} cy={cy} r="2.2" fill="currentColor" />
                    <circle cx={rx} cy={cy} r="2.2" fill="currentColor" />
                </g>
            );
    }
}

// ── MOUTH ────────────────────────────────────────────────────────────────────

export function Mouth({ state, cx, cy }: { state: ChalkState } & FacePos) {
    switch (state) {
        case 'success':
            // Big smile
            return <path d={`M ${cx - 8} ${cy} Q ${cx} ${cy + 7} ${cx + 8} ${cy}`} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
        case 'streak':
            // Open cheer
            return (
                <g>
                    <path d={`M ${cx - 7} ${cy} Q ${cx} ${cy + 8} ${cx + 7} ${cy}`} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d={`M ${cx - 5} ${cy + 2} Q ${cx} ${cy + 5} ${cx + 5} ${cy + 2}`} stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
                </g>
            );
        case 'comeback':
            // Confident smirk (asymmetric)
            return <path d={`M ${cx - 7} ${cy + 1} Q ${cx - 1} ${cy + 4} ${cx + 7} ${cy - 1}`} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
        case 'fail':
            // Small "o" (oops)
            return <ellipse cx={cx} cy={cy + 1} rx="3" ry="3.5" stroke="currentColor" strokeWidth="2" fill="none" />;
        case 'struggling':
            // Flat line
            return <line x1={cx - 7} y1={cy} x2={cx + 7} y2={cy} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />;
        case 'idle':
        default:
            // Neutral half-smile
            return <path d={`M ${cx - 6} ${cy} Q ${cx} ${cy + 4} ${cx + 6} ${cy}`} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />;
    }
}

// ── ACCENTS ──────────────────────────────────────────────────────────────────

/** Single sweat drop at the right temple — used by struggling state. */
export function SweatDrop({ x, y }: { x: number; y: number }) {
    return <ellipse cx={x} cy={y} rx="2" ry="3.5" fill="currentColor" opacity="0.4" />;
}

/** Cheek blush patches — soft pink-coded warmth on success. */
export function Blush({ cx, cy, gap = 22 }: { cx: number; cy: number; gap?: number }) {
    return (
        <g opacity="0.18">
            <ellipse cx={cx - gap} cy={cy} rx="4.5" ry="2.8" fill="currentColor" />
            <ellipse cx={cx + gap} cy={cy} rx="4.5" ry="2.8" fill="currentColor" />
        </g>
    );
}

/** Tiny sparkle "✨" used as state-bonus on streaks. */
export function Sparkle({ x, y, size = 4 }: { x: number; y: number; size?: number }) {
    const s = size;
    return (
        <g opacity="0.9">
            <line x1={x - s} y1={y} x2={x + s} y2={y} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1={x} y1={y - s} x2={x} y2={y + s} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1={x - s * 0.7} y1={y - s * 0.7} x2={x + s * 0.7} y2={y + s * 0.7} stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </g>
    );
}

// ── BODY/SHOULDERS ───────────────────────────────────────────────────────────
// Most teachers use the same shoulder line silhouette; ones that don't (Robo,
// Lex) define their own.

/** Default shoulder/collar silhouette — sits below a head centred at cy=38. */
export function Shoulders() {
    return (
        <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85">
            {/* Neck */}
            <line x1="50" y1="64" x2="50" y2="78" />
            {/* Shoulders curving outward */}
            <path d="M 18 110 Q 30 82 50 80 Q 70 82 82 110" />
        </g>
    );
}
