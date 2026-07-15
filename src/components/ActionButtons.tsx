import { memo, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionTypePicker } from './QuestionTypePicker';
import type { QuestionType } from '../utils/mathGenerator';
import type { AgeBand } from '../utils/questionTypes';

/**
 * Long-press tooltip wrapper. Shows a small label to the LEFT of the button
 * after holding for 350 ms; auto-dismisses 1.6 s after release. On a quick
 * tap the tooltip never appears, so it doesn't get in the way of normal use.
 *
 * The label lives outside the button (not inside the action stack) so the
 * action column's flex layout isn't disturbed.
 */
function ActionTooltip({ label, children }: { label: string; children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const dismissRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const start = useCallback(() => {
        if (dismissRef.current) clearTimeout(dismissRef.current);
        timerRef.current = setTimeout(() => setVisible(true), 350);
    }, []);
    const cancel = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = undefined; }
        if (visible) {
            dismissRef.current = setTimeout(() => setVisible(false), 1600);
        }
    }, [visible]);

    return (
        <div
            className="relative"
            onPointerDown={start}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
        >
            {children}
            <AnimatePresence>
                {visible && (
                    <motion.div
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none px-2 py-1 rounded-md bg-[var(--color-overlay)] text-[10px] ui text-[rgb(var(--color-fg))]/80 border border-[rgb(var(--color-fg))]/15"
                        role="tooltip"
                    >
                        {label}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface Props {
    questionType: QuestionType;
    onTypeChange: (type: QuestionType) => void;
    hardMode: boolean;
    onHardModeToggle: () => void;
    timedMode: boolean;
    onTimedModeToggle: () => void;
    timedDurationMs: number;        // full-ring duration for the current level
    problemKey: string | number | null; // changes per problem → restarts the ring
    ageBand: AgeBand;
}

/** Circular countdown ring drawn as an SVG arc */
// Self-driving countdown ring. It runs its OWN rAF and holds its OWN progress
// state, so the per-frame updates re-render just these two <circle>s instead of
// the whole App tree. It restarts whenever `problemKey` changes (new problem)
// or timed mode toggles on. The game-loop hook still owns the actual expiry.
function TimerRing({ active, durationMs }: { active: boolean; durationMs: number }) {
    const r = 19;
    const circumference = 2 * Math.PI * r;
    // progress starts at 0 on mount. The parent gives us a `key` derived from
    // active+problemKey, so a new problem (or a timed-mode toggle) REMOUNTS this
    // leaf — resetting progress to 0 with no synchronous setState-in-effect.
    const [progress, setProgress] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (!active || durationMs <= 0) return;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / durationMs, 1);
            setProgress(p); // setState inside an rAF callback (allowed — not sync in effect body)
            if (p < 1) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [active, durationMs]);

    const offset = circumference * (1 - progress);

    return (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
            {/* Track */}
            <circle
                cx="22" cy="22" r={r}
                fill="none"
                stroke={active ? 'rgb(var(--color-fg) / 0.12)' : 'rgb(var(--color-fg) / 0.15)'}
                strokeWidth="2.5"
            />
            {/* Progress arc */}
            {active && (
                <circle
                    cx="22" cy="22" r={r}
                    fill="none"
                    stroke={progress > 0.75 ? 'var(--color-streak-fire)' : 'var(--color-gold)'}
                    strokeWidth="2.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke 0.3s' }}
                />
            )}
        </svg>
    );
}

export const ActionButtons = memo(function ActionButtons({
    questionType, onTypeChange, hardMode, onHardModeToggle,
    timedMode, onTimedModeToggle, timedDurationMs, problemKey,
    ageBand,
}: Props) {
    // Hard/Timed don't apply to the fixed daily/challenge sets, so hide the
    // toggles there (App also neutralizes the flags for those types).
    const hideModeToggles = questionType === 'daily' || questionType === 'challenge';
    // Transient feedback toast for the share button. Without this, share
    // appears to do nothing on platforms where navigator.share is missing
    // or rejects (tester report).
    const [shareToast, setShareToast] = useState<string | null>(null);
    const shareToastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const flashToast = (msg: string) => {
        if (shareToastTimer.current) clearTimeout(shareToastTimer.current);
        setShareToast(msg);
        shareToastTimer.current = setTimeout(() => setShareToast(null), 1800);
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Math Challenge',
            text: 'Try this mental-math game.',
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
                // navigator.share succeeded — no toast needed, the OS UI handled it
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(window.location.href);
                flashToast('Link copied!');
            } else {
                flashToast('Sharing not supported');
            }
        } catch (err) {
            // AbortError = user cancelled the native share sheet (normal, no toast)
            if (err instanceof Error && err.name === 'AbortError') return;
            // Real failure — try clipboard fallback and toast
            try {
                await navigator.clipboard.writeText(window.location.href);
                flashToast('Link copied!');
            } catch {
                flashToast("Couldn't share — try again");
            }
        }
    };

    // z-40 (not z-20) so this sidebar stays above the score container
    // (z-30 in App.tsx). At narrow viewports the score banner extends
    // down past y≈160px and would otherwise eat clicks on the share
    // button at top-right.
    return (
        <div className="absolute right-3 top-[25%] -translate-y-1/2 flex flex-col gap-4 z-40">
            {/* Share */}
            <ActionTooltip label="Share">
                <div className="relative">
                    <motion.button
                        onClick={handleShare}
                        aria-label="Share"
                        className="action-icon w-11 h-11 flex items-center justify-center text-[rgb(var(--color-fg))]/70 active:text-[var(--color-gold)]"
                        whileTap={{ scale: 0.88 }}
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="18" cy="5" r="2.5" />
                            <circle cx="6" cy="12" r="2.5" />
                            <circle cx="18" cy="19" r="2.5" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                        </svg>
                    </motion.button>
                    {/* Feedback toast — fires when share triggers a clipboard
                        fallback or a real failure (not on successful native-share). */}
                    <AnimatePresence>
                        {shareToast && (
                            <motion.div
                                initial={{ opacity: 0, x: 6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 6 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none px-2 py-1 rounded-md bg-[var(--color-gold)]/90 text-[10px] ui font-semibold text-black"
                                role="status"
                            >
                                {shareToast}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ActionTooltip>

            {/* Question type */}
            <ActionTooltip label="Switch topic">
                <QuestionTypePicker current={questionType} onChange={onTypeChange} ageBand={ageBand} />
            </ActionTooltip>

            {!hideModeToggles && (<>
            {/* Stopwatch / timed mode */}
            <ActionTooltip label={timedMode ? 'Timed: ON' : 'Timed mode'}>
                <motion.button
                    onClick={onTimedModeToggle}
                    aria-label={timedMode ? 'Disable timed mode' : 'Enable timed mode'}
                    className={`action-icon w-11 h-11 relative flex items-center justify-center ${timedMode
                        ? 'text-[var(--color-gold)]'
                        : 'text-[rgb(var(--color-fg))]/70'
                        }`}
                    whileTap={{ scale: 0.88 }}
                >
                    <TimerRing key={`tr-${timedMode ? 1 : 0}-${problemKey ?? 'none'}`} active={timedMode} durationMs={timedDurationMs} />
                    <motion.svg
                        viewBox="0 0 24 24"
                        className="w-6 h-6 relative z-10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        animate={timedMode ? { rotate: [0, -6, 6, -3, 3, 0] } : {}}
                        transition={timedMode ? {
                            duration: 1.8,
                            repeat: Infinity,
                            repeatDelay: 3,
                            ease: 'easeInOut',
                        } : {}}
                    >
                        <circle cx="12" cy="14" r="7" />
                        <line x1="12" y1="3" x2="12" y2="7" />
                        <line x1="9" y1="3" x2="15" y2="3" />
                        <line x1="12" y1="14" x2="12" y2="10" />
                    </motion.svg>
                </motion.button>
            </ActionTooltip>

            {/* Hard mode skull */}
            <ActionTooltip label={hardMode ? 'Hard: ON · bigger numbers' : 'Hard mode · bigger numbers'}>
                <motion.button
                    onClick={onHardModeToggle}
                    aria-label={hardMode ? 'Disable hard mode' : 'Enable hard mode'}
                    aria-pressed={hardMode}
                    className={`action-icon w-11 h-11 flex items-center justify-center ${hardMode
                        ? 'text-[var(--color-gold)]'
                        : 'text-[rgb(var(--color-fg))]/70'
                        }`}
                    whileTap={{ scale: 0.88 }}
                    animate={hardMode ? {
                        rotate: [0, -8, 8, -5, 5, 0],
                        scale: [1, 1.1, 1, 1.05, 1],
                    } : {}}
                    transition={hardMode ? {
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: 'easeInOut' as const,
                    } : {}}
                >
                    {/* Hand-drawn skull — matches the line weight + sizing of the
                        other controls (was a heavier, off-aesthetic emoji). */}
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 11 C 20 6.6 16.4 3.5 12 3.5 C 7.6 3.5 4 6.6 4 11 C 4 13.4 5.2 15 6.6 15.8 L 6.6 18 C 6.6 18.8 7.1 19.3 8 19.3 L 16 19.3 C 16.9 19.3 17.4 18.8 17.4 18 L 17.4 15.8 C 18.8 15 20 13.4 20 11 Z" />
                        <circle cx="9" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
                        <circle cx="15" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
                        <path d="M12 14 L 10.9 16 L 13.1 16 Z" fill="currentColor" stroke="none" />
                        <path d="M10 19.3 L 10 17.5 M12 19.3 L 12 17.5 M14 19.3 L 14 17.5" />
                    </svg>
                </motion.button>
            </ActionTooltip>
            </>)}
        </div>
    );
});
