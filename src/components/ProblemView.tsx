import { memo, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useMotionTemplate, animate, type MotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { Problem } from '../utils/mathGenerator';
import type { EngineItem } from '../engine/domain';
import { MathExpr } from './MathExpr';

/** Arrow-key → swipe direction map for desktop play */
const KEY_MAP: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'up',
};

/**
 * Convert the visible plain-text expression into a screen-reader-friendly
 * announcement. The display uses Unicode math symbols (÷, ×, −, ²) which most
 * AT will read out OK, but the LaTeX source piped into KaTeX is announced as
 * raw `\div` / `\times`. Replacing those with English keeps things consistent.
 */
function friendlyAriaLabel(expression: string): string {
    return expression
        .replace(/×/g, ' times ')
        .replace(/÷/g, ' divided by ')
        .replace(/−/g, ' minus ')
        .replace(/²/g, ' squared')
        .replace(/³/g, ' cubed')
        .replace(/√/g, ' square root of ')
        .replace(/\s+/g, ' ')
        .trim();
}
interface Props {
    /** Accepts both the math-specific Problem and the generic EngineItem */
    problem: Problem | EngineItem;
    frozen: boolean;
    highlightCorrect?: boolean;
    showHints?: boolean;
    /** First-time-ever hint: animates a swipe gesture toward the correct
     *  answer to teach the core interaction. Only render this on a true
     *  first run; the App layer is responsible for gating it. */
    coachSwipe?: boolean;
    onSwipe: (dir: 'left' | 'right' | 'up' | 'down') => void;
}

const DIRS: Array<'left' | 'down' | 'right'> = ['left', 'down', 'right'];
const DIR_LABELS = ['<', 'v', '>'];

const pulseAnim = {
    scale: [1, 1.03, 1],
    transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' as const },
};

/** Glow animation for the tutorial-highlighted answer */
const glowAnim = {
    boxShadow: [
        '0 0 0 0 rgba(255,255,255,0)',
        '0 0 20px 4px rgba(251,191,36,0.5)',
        '0 0 0 0 rgba(255,255,255,0)',
    ],
    scale: [1, 1.08, 1],
};

const glowTransition = { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const };

/** Single answer option */
const correctFlashAnim = {
    scale: [1, 1.15, 1],
    boxShadow: [
        '0 0 0 0 rgba(74,222,128,0)',
        '0 0 20px 6px rgba(74,222,128,0.6)',
        '0 0 0 0 rgba(74,222,128,0)',
    ],
};

const AnswerOption = memo(function AnswerOption({
    value, label, dir, dirLabel, glow, frozen, onSwipe, highlighted, correctFlash, showHint,
}: {
    value: number; label?: string; dir: 'left' | 'down' | 'right'; dirLabel: string;
    glow: MotionValue<number>; frozen: boolean;
    onSwipe: (d: 'left' | 'right' | 'up' | 'down') => void;
    highlighted?: boolean;
    correctFlash?: boolean;
    showHint?: boolean;
}) {
    const scale = useTransform(glow, [0, 0.3, 1], [1, 1.05, 1.35]);
    const opacity = useTransform(glow, [0, 1], [0.95, 1]);
    // Gold border + text intensity driven by drag distance
    const borderAlpha = useTransform(glow, [0, 0.3, 1], [0, 0.3, 1]);
    const borderColor = useMotionTemplate`rgba(251,191,36,${borderAlpha})`;
    const shadowSpread = useTransform(glow, [0, 1], [0, 16]);
    const boxShadow = useMotionTemplate`0 0 ${shadowSpread}px 2px rgba(251,191,36,0.4)`;

    return (
        <motion.button
            className="flex flex-col items-center gap-2 flex-1 gpu-layer"
            style={{ scale, opacity }}
            onClick={() => !frozen && onSwipe(dir)}
        >
            {/* Direction chevron — glows gold if highlighted, hidden after first swipes */}
            {showHint !== false && (
                <motion.div
                    className={`text-xl tracking-widest font-bold ui ${highlighted ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/80'}`}
                    animate={highlighted ? { opacity: [0.5, 1, 0.5] } : {}}
                    transition={highlighted ? { duration: 1, repeat: Infinity } : {}}
                >
                    {dirLabel}
                </motion.div>
            )}
            {/* Answer bubble — lights up gold as you drag toward it */}
            <motion.div
                className={`w-[80px] h-[80px] rounded-full border-2 bg-[var(--color-surface)] flex items-center justify-center text-[28px] chalk active:scale-90 transition-transform ${correctFlash ? 'border-[var(--color-correct)] text-[var(--color-correct)]'
                    : highlighted ? 'border-[var(--color-gold)] text-[var(--color-gold)]'
                        : 'border-[rgb(var(--color-fg))]/50 text-[var(--color-chalk)]'
                    }`}
                style={!correctFlash && !highlighted ? { borderColor, boxShadow } : {}}
                animate={correctFlash ? correctFlashAnim : highlighted ? glowAnim : {}}
                transition={correctFlash ? { duration: 0.35 } : highlighted ? glowTransition : {}}
            >
                {label ?? value}
            </motion.div>
        </motion.button>
    );
});

/**
 * First-run gesture coach. Drifts a 👆 cursor from the centre toward the
 * correct answer's chevron, with a one-line caption. Loops gently until the
 * user dismisses by swiping (the parent unmounts us by clearing `coachSwipe`).
 */
const SwipeCoach = memo(function SwipeCoach({ correctIndex }: { correctIndex: number }) {
    // Map option index → x-translate of the demo gesture (left/down/right)
    const targetX = correctIndex === 0 ? -90 : correctIndex === 2 ? 90 : 0;
    const targetY = correctIndex === 1 ? 60 : 0;
    const captionDir = correctIndex === 0 ? 'left' : correctIndex === 2 ? 'right' : 'down';

    return (
        <div className="absolute inset-x-0 -top-2 flex flex-col items-center pointer-events-none z-20">
            <motion.div
                className="text-3xl"
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{
                    x: [0, targetX, targetX, 0],
                    y: [0, targetY, targetY, 0],
                    opacity: [0, 1, 1, 0],
                }}
                transition={{
                    duration: 2.2,
                    times: [0, 0.4, 0.7, 1],
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    ease: 'easeInOut',
                }}
            >
                👆
            </motion.div>
            <motion.div
                className="text-[11px] ui mt-1 text-[var(--color-gold)]/80 tracking-wide"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
                swipe {captionDir} to answer
            </motion.div>
        </div>
    );
});

export const ProblemView = memo(function ProblemView({ problem, frozen, highlightCorrect, showHints = true, coachSwipe = false, onSwipe }: Props) {
    // At runtime this component always receives a math Problem (which has expression, latex, visual, etc.).
    // The prop type accepts EngineItem so callers with EngineItem[] don't need a cast.
    const p = problem as Problem;

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Desktop arrow-key support (stable listener — no churn)
    const onSwipeRef = useRef(onSwipe);
    const frozenRef = useRef(frozen);
    useEffect(() => { onSwipeRef.current = onSwipe; }, [onSwipe]);
    useEffect(() => { frozenRef.current = frozen; }, [frozen]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const dir = KEY_MAP[e.key];
            if (dir && !frozenRef.current) {
                e.preventDefault();
                onSwipeRef.current(dir);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const leftGlow = useTransform(x, [-140, -50, 0], [1, 0.3, 0]);
    const rightGlow = useTransform(x, [0, 50, 140], [0, 0.3, 1]);
    const downGlow = useTransform(y, [0, 50, 140], [0, 0.3, 1]);
    const glows = [leftGlow, downGlow, rightGlow];



    const handlePan = (_: unknown, info: PanInfo) => {
        if (!frozen) {
            x.set(info.offset.x);
            y.set(info.offset.y);
        }
    };

    const handlePanEnd = (_: unknown, info: PanInfo) => {
        if (frozen) return;
        // Snap the local touch point back to 0 so the answer glows recede naturally
        animate(x, 0, { duration: 0.3, bounce: 0 });
        animate(y, 0, { duration: 0.3, bounce: 0 });

        const t = 80;
        if (info.offset.y < -t || info.velocity.y < -400) onSwipe('up');
        else if (info.offset.y > t || info.velocity.y > 400) onSwipe('down');
        else if (info.offset.x > t || info.velocity.x > 400) onSwipe('right');
        else if (info.offset.x < -t || info.velocity.x < -400) onSwipe('left');
    };

    return (
        <motion.div
            className="landscape-answers flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-24 relative z-10 gpu-layer touch-none"
            onPan={handlePan}
            onPanEnd={handlePanEnd}
        >
            {/* Number bond visual */}
            {p.visual === 'bond' && p.bondTotal != null && p.bondPart != null && (
                <svg viewBox="0 0 160 120" className="w-44 h-28 mb-4" style={{ color: 'var(--color-chalk)' }}>
                    {/* Lines connecting circles */}
                    <line x1="80" y1="32" x2="40" y2="84" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                    <line x1="80" y1="32" x2="120" y2="84" stroke="currentColor" strokeWidth="2" opacity="0.5" />
                    {/* Top circle — total */}
                    <circle cx="80" cy="24" r="22" stroke="currentColor" strokeWidth="2" fill="none" />
                    <text x="80" y="31" textAnchor="middle" fill="currentColor" fontSize="20" fontFamily="inherit" className="chalk">{p.bondTotal}</text>
                    {/* Bottom-left circle — known part */}
                    <circle cx="40" cy="94" r="22" stroke="currentColor" strokeWidth="2" fill="none" />
                    <text x="40" y="101" textAnchor="middle" fill="currentColor" fontSize="20" fontFamily="inherit" className="chalk">{p.bondPart}</text>
                    {/* Bottom-right circle — unknown (?) */}
                    <circle cx="120" cy="94" r="22" stroke="var(--color-gold)" strokeWidth="2.5" fill="none" strokeDasharray="6 3" />
                    <text x="120" y="101" textAnchor="middle" fill="var(--color-gold)" fontSize="22" fontFamily="inherit" className="chalk">?</text>
                </svg>
            )}
            {/* Problem expression */}
            <motion.div className="text-center mb-12" animate={pulseAnim}>
                <div
                    className={`landscape-question chalk leading-tight tracking-wider text-[var(--color-chalk)] max-w-full px-2 ${p.expression.length > 15 ? 'text-2xl' : p.expression.length > 10 ? 'text-4xl' : 'text-6xl'}`}
                    aria-label={p.latex ? friendlyAriaLabel(p.expression) : undefined}
                >
                    {p.latex
                        ? <MathExpr latex={p.latex} ariaLabel={friendlyAriaLabel(p.expression)} />
                        : p.expression
                    }
                </div>
            </motion.div>

            {/* Answer options */}
            <div className="flex items-center justify-center gap-3 w-full max-w-[380px]">
                {p.options.map((opt, i) => (
                    <AnswerOption
                        key={`${opt}-${i}`}
                        value={opt as number}
                        label={p.optionLabels?.[i]}
                        dir={DIRS[i]}
                        dirLabel={DIR_LABELS[i]}
                        glow={glows[i]}
                        frozen={frozen}
                        onSwipe={onSwipe}
                        highlighted={highlightCorrect && i === p.correctIndex}
                        correctFlash={frozen && i === p.correctIndex}
                        showHint={showHints}
                    />
                ))}
            </div>

            {/* First-run swipe coach: animates a finger drifting toward the correct answer */}
            {coachSwipe && !frozen && (
                <SwipeCoach correctIndex={p.correctIndex} />
            )}

            {/* Skip hint */}
            {showHints && (
                <div className="mt-8 flex flex-col items-center text-[rgb(var(--color-fg))]/60">
                    <div className="text-xl font-bold tracking-wider ui">^</div>
                    <span className="text-xs ui mt-1 tracking-wider">skip</span>
                </div>
            )}
        </motion.div>
    );
});
