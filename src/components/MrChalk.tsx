import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import type { ChalkState } from '../engine/domain';
import type { QuestionType } from '../utils/questionTypes';
import { pickChalkMessage, type ChalkContext, type ChalkMessageOverrides } from '../utils/chalkMessages';
import { MATH_MESSAGE_OVERRIDES } from '../domains/math/mathMessages';

const ANIMS: Record<ChalkState, TargetAndTransition> = {
    idle: { y: [0, -6, 0], rotate: [0, 2, -2, 0], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const } },
    success: { scale: [1, 1.25, 1], y: [0, -14, 0], transition: { duration: 0.45 } },
    fail: { x: [-6, 6, -6, 6, 0], transition: { duration: 0.4 } },
    streak: { y: [0, -8, 0], scale: [1, 1.1, 1], rotate: [0, -3, 3, 0], transition: { repeat: Infinity, duration: 0.7, ease: 'easeInOut' as const } },
    comeback: { scale: [1, 1.2, 1], y: [0, -10, 0], transition: { duration: 0.5 } },
    struggling: { x: [-8, 8, -6, 6, -3, 3, 0], y: [0, 3, 0], transition: { duration: 0.55 } },
};

// Static SVG parts extracted to avoid re-creating on every render
const Body = () => (
    <>
        <line x1="50" y1="64" x2="50" y2="110" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
        <line x1="50" y1="110" x2="36" y2="140" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <line x1="50" y1="110" x2="64" y2="140" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </>
);

const ArmsUp = () => (
    <>
        <line x1="50" y1="78" x2="28" y2="64" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <line x1="50" y1="78" x2="72" y2="64" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </>
);

const ArmsDown = () => (
    <>
        <line x1="50" y1="80" x2="30" y2="74" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <line x1="50" y1="80" x2="70" y2="74" stroke="currentColor" strokeWidth="2" opacity="0.6" />
    </>
);

const FACES: Record<ChalkState, React.ReactNode> = {
    idle: (
        <>
            <circle cx="40" cy="34" r="2.5" fill="currentColor" opacity="0.8" />
            <circle cx="60" cy="34" r="2.5" fill="currentColor" opacity="0.8" />
            <path d="M 40 48 Q 50 55 60 48" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.7" />
        </>
    ),
    success: (
        <>
            <path d="M 36 34 Q 40 29 44 34" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M 56 34 Q 60 29 64 34" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M 38 48 Q 50 60 62 48" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="34" cy="44" r="4" fill="currentColor" opacity="0.12" />
            <circle cx="66" cy="44" r="4" fill="currentColor" opacity="0.12" />
            <text x="74" y="30" fontSize="22">👍</text>
        </>
    ),
    fail: (
        <>
            <line x1="36" y1="30" x2="44" y2="38" stroke="currentColor" strokeWidth="2" />
            <line x1="44" y1="30" x2="36" y2="38" stroke="currentColor" strokeWidth="2" />
            <line x1="56" y1="30" x2="64" y2="38" stroke="currentColor" strokeWidth="2" />
            <line x1="64" y1="30" x2="56" y2="38" stroke="currentColor" strokeWidth="2" />
            <circle cx="50" cy="50" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
            <ellipse cx="70" cy="28" rx="2" ry="3.5" fill="currentColor" opacity="0.3" />
        </>
    ),
    streak: (
        <>
            <rect x="30" y="30" width="16" height="8" rx="3" fill="currentColor" opacity="0.9" />
            <rect x="54" y="30" width="16" height="8" rx="3" fill="currentColor" opacity="0.9" />
            <line x1="46" y1="34" x2="54" y2="34" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 42 50 Q 50 55 58 50" stroke="currentColor" strokeWidth="2" fill="none" />
        </>
    ),
    comeback: (
        <>
            <circle cx="40" cy="34" r="2.5" fill="currentColor" opacity="0.8" />
            <circle cx="60" cy="34" r="2.5" fill="currentColor" opacity="0.8" />
            <path d="M 38 48 Q 50 58 62 48" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <text x="72" y="30" fontSize="18">💪</text>
        </>
    ),
    struggling: (
        <>
            {/* X eyes */}
            <line x1="36" y1="30" x2="44" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            <line x1="44" y1="30" x2="36" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            <line x1="56" y1="30" x2="64" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            <line x1="64" y1="30" x2="56" y2="38" stroke="currentColor" strokeWidth="2" opacity="0.9" />
            {/* Flat-line mouth */}
            <line x1="40" y1="50" x2="60" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            {/* Sweat drop */}
            <ellipse cx="72" cy="32" rx="2" ry="3.5" fill="currentColor" opacity="0.4" />
        </>
    ),
};
import { COSTUMES } from '../utils/costumes';

export const MrChalk = memo(function MrChalk({
    state, costume, streak = 0, totalAnswered = 0,
    questionType = 'multiply', hardMode = false, timedMode = false,
    pingMessage = null,
    messageOverrides,
}: {
    state: ChalkState;
    costume?: string;
    streak?: number;
    totalAnswered?: number;
    questionType?: QuestionType;
    hardMode?: boolean;
    timedMode?: boolean;
    pingMessage?: string | null;
    /**
     * Domain-specific message overrides.
     * Defaults to math overrides. Pass `undefined` for a completely generic game.
     */
    messageOverrides?: ChalkMessageOverrides;
}) {
    const [message, setMessage] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const ctxRef = useRef<{ state: ChalkState; streak: number; totalAnswered: number; categoryId: string; hardMode: boolean; timedMode: boolean }>(
        { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode }
    );
    useEffect(() => {
        ctxRef.current = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
    });

    // Adjust state during render when deps change (React-recommended pattern)
    // ONLY do this if there's NO ping message, as ping takes priority
    const depsKey = `${state}-${streak}-${totalAnswered}-${questionType}-${hardMode}-${timedMode}`;
    const [prevDepsKey, setPrevDepsKey] = useState('');
    if (depsKey !== prevDepsKey) {
        setPrevDepsKey(depsKey);
        const ctx: ChalkContext = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
        setMessage(pickChalkMessage(ctx, messageOverrides ?? MATH_MESSAGE_OVERRIDES));
    }

    // Auto-clear message after timeout (effect only for async timer)
    useEffect(() => {
        if (!message || pingMessage !== null) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setMessage(''), state === 'idle' ? 4000 : 2500);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [message, state, pingMessage]);

    useEffect(() => {
        if (state !== 'idle') return;
        const ctx: ChalkContext = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
        // Pause the rotating idle quip while the tab is hidden — saves work
        // and prevents the message from changing silently in the background.
        let interval: ReturnType<typeof setInterval> | undefined;
        const start = () => {
            if (interval) return;
            interval = setInterval(
                () => setMessage(pickChalkMessage({ ...ctx, state: 'idle' }, messageOverrides ?? MATH_MESSAGE_OVERRIDES)),
                5000,
            );
        };
        const stop = () => {
            if (interval) { clearInterval(interval); interval = undefined; }
        };
        const onVisibility = () => (document.hidden ? stop() : start());
        if (!document.hidden) start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [state, questionType, streak, totalAnswered, hardMode, timedMode, messageOverrides]);

    const displayState = pingMessage ? 'comeback' : state;
    const currentMessage = pingMessage || message;

    return (
        <motion.div
            className={`absolute bottom-4 right-2 pointer-events-none z-30 ${displayState === 'streak' ? 'on-fire' : ''}`}
            animate={ANIMS[displayState]}
        >
            <AnimatePresence mode="wait">
                {currentMessage && (
                    <motion.div
                        key={currentMessage}
                        initial={{ opacity: 0, y: 8, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.8 }}
                        transition={{ duration: 0.25 }}
                        className="absolute bottom-full mb-2 right-0 max-w-[220px] text-right bg-[var(--color-surface)] border border-[rgb(var(--color-fg))]/15 rounded-xl px-3 py-1.5 text-[12px] ui text-[rgb(var(--color-fg))]/80 leading-snug whitespace-normal break-words"
                    >
                        {currentMessage}
                        <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-[var(--color-overlay)] border-b border-r border-[rgb(var(--color-fg))]/15 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>

            <svg viewBox="0 0 100 160" className="w-[72px] h-[115px]" style={{ color: 'var(--color-chalk)' }}>
                <circle cx="50" cy="38" r="26" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8" />
                {FACES[displayState] || FACES.idle}
                <Body />
                {displayState === 'success' ? <ArmsUp /> : <ArmsDown />}
                {costume && COSTUMES[costume]}
            </svg>
            {/* Fire emoji outside SVG for proper transparency on all platforms */}
            {displayState === 'streak' && (
                <span className="absolute -top-1 right-0 text-xl pointer-events-none">🔥</span>
            )}
        </motion.div>
    );
});
