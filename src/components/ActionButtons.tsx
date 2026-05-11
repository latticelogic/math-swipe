import { memo, useState, useRef, useCallback, type ReactNode } from 'react';
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
    timerProgress: number; // 0 → 1
    ageBand: AgeBand;
}

/** Circular countdown ring drawn as an SVG arc */
function TimerRing({ progress, active }: { progress: number; active: boolean }) {
    const r = 19;
    const circumference = 2 * Math.PI * r;
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
    timedMode, onTimedModeToggle, timerProgress,
    ageBand,
}: Props) {
    const handleShare = async () => {
        const shareData = {
            title: 'Math Swipe',
            text: 'Try this mental math game! 🧠✨',
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
            }
        } catch {
            // User cancelled share
        }
    };

    return (
        <div className="absolute right-3 top-[25%] -translate-y-1/2 flex flex-col gap-4 z-20">
            {/* Share */}
            <ActionTooltip label="Share">
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
            </ActionTooltip>

            {/* Question type */}
            <ActionTooltip label="Question type">
                <QuestionTypePicker current={questionType} onChange={onTypeChange} ageBand={ageBand} />
            </ActionTooltip>

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
                    <TimerRing progress={timerProgress} active={timedMode} />
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
                    className={`w-11 h-11 flex flex-col items-center justify-center text-xl ${hardMode
                        ? 'opacity-100 action-icon-skull-active'
                        : 'opacity-50 action-icon-skull'
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
                    💀
                    {hardMode && (
                        <span className="w-1 h-1 rounded-full bg-[var(--color-gold)] mt-0.5" />
                    )}
                </motion.button>
            </ActionTooltip>
        </div>
    );
});
