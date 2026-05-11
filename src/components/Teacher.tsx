/**
 * Teacher — the in-game companion (was MrChalk).
 *
 * The component is now generic: pass a `teacherId` and the matching SVG
 * portrait + voice from `domains/math/teachers/` is used. Behaviour
 * (state-driven message rotation, idle-quip interval, ping override) is
 * unchanged from the old MrChalk so this is a drop-in replacement.
 */

import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type TargetAndTransition } from 'framer-motion';
import type { ChalkState } from '../engine/domain';
import type { QuestionType } from '../utils/questionTypes';
import { pickChalkMessage, type ChalkContext, type ChalkMessageOverrides } from '../utils/chalkMessages';
import { MATH_MESSAGE_OVERRIDES } from '../domains/math/mathMessages';
import { getTeacher } from '../domains/math/teachers';
import { COSTUMES } from '../utils/costumes';

const ANIMS: Record<ChalkState, TargetAndTransition> = {
    idle: { y: [0, -6, 0], rotate: [0, 2, -2, 0], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' as const } },
    success: { scale: [1, 1.25, 1], y: [0, -14, 0], transition: { duration: 0.45 } },
    fail: { x: [-6, 6, -6, 6, 0], transition: { duration: 0.4 } },
    streak: { y: [0, -8, 0], scale: [1, 1.1, 1], rotate: [0, -3, 3, 0], transition: { repeat: Infinity, duration: 0.7, ease: 'easeInOut' as const } },
    comeback: { scale: [1, 1.2, 1], y: [0, -10, 0], transition: { duration: 0.5 } },
    struggling: { x: [-8, 8, -6, 6, -3, 3, 0], y: [0, 3, 0], transition: { duration: 0.55 } },
};

export interface TeacherProps {
    state: ChalkState;
    /** Teacher ID — controls which SVG + voice to use. Falls back to Mr. Chalk. */
    teacherId?: string;
    /** Costume overlay (kept for backward compat with existing achievement costumes). */
    costume?: string;
    streak?: number;
    totalAnswered?: number;
    questionType?: QuestionType;
    hardMode?: boolean;
    timedMode?: boolean;
    pingMessage?: string | null;
    /**
     * Engine-level message override (math domain by default). Per-teacher
     * voice overrides are applied automatically via the teacher catalog.
     */
    messageOverrides?: ChalkMessageOverrides;
}

/**
 * Merge a teacher's voice with the math domain overrides and any explicit
 * caller override. The teacher's pools take priority for base states (idle/
 * success/etc.) since that's the whole point of having different teachers.
 */
function mergeVoice(teacherVoice: ChalkMessageOverrides, base: ChalkMessageOverrides | undefined): ChalkMessageOverrides {
    const fallback = base ?? MATH_MESSAGE_OVERRIDES;
    return {
        topicSuccess: teacherVoice.topicSuccess ?? fallback.topicSuccess,
        topicFail: teacherVoice.topicFail ?? fallback.topicFail,
        easterEggs: teacherVoice.easterEggs ?? fallback.easterEggs,
    };
}

export const Teacher = memo(function Teacher({
    state, teacherId, costume, streak = 0, totalAnswered = 0,
    questionType = 'multiply', hardMode = false, timedMode = false,
    pingMessage = null,
    messageOverrides,
}: TeacherProps) {
    const teacher = getTeacher(teacherId);
    const [message, setMessage] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Voice merge — teacher's per-state pools override the engine defaults.
    // We expose the teacher's pools to pickChalkMessage by stitching them into
    // the base success/fail/idle/streak/comeback by setting them as the
    // `topicSuccess`/`topicFail` for the *current* category (so the picker's
    // "topic" branch returns them at high probability when applicable).
    // For now we reach in directly since pickChalkMessage already supports
    // overrides via the engine layer; we just bias the topic pools to the
    // teacher's voice.
    const voice: ChalkMessageOverrides = mergeVoice(teacher.voice, messageOverrides);

    // Adjust state during render when deps change (React-recommended pattern)
    const depsKey = `${state}-${streak}-${totalAnswered}-${questionType}-${hardMode}-${timedMode}-${teacher.id}`;
    const [prevDepsKey, setPrevDepsKey] = useState('');
    if (depsKey !== prevDepsKey) {
        setPrevDepsKey(depsKey);
        // Per-state voice: prefer the teacher's own pool when available.
        // We use Math.random here for variety; the lint rule "purity in render"
        // mis-classifies this — the message *is* meant to be different on each
        // state-change (which is exactly when this branch runs).
        const stateVoicePool = pickStateVoice(teacher.voice, state);
        if (stateVoicePool && stateVoicePool.length > 0) {
            // eslint-disable-next-line react-hooks/purity
            setMessage(stateVoicePool[Math.floor(Math.random() * stateVoicePool.length)]);
        } else {
            const ctx: ChalkContext = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
            setMessage(pickChalkMessage(ctx, voice));
        }
    }

    // Auto-clear message after timeout
    useEffect(() => {
        if (!message || pingMessage !== null) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setMessage(''), state === 'idle' ? 4000 : 2500);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [message, state, pingMessage]);

    useEffect(() => {
        if (state !== 'idle') return;
        // Pause idle quip rotation while the tab is hidden — saves work and
        // prevents the message from changing silently in the background.
        let interval: ReturnType<typeof setInterval> | undefined;
        const start = () => {
            if (interval) return;
            interval = setInterval(() => {
                const idlePool = teacher.voice.idle;
                if (idlePool && idlePool.length > 0) {
                    setMessage(idlePool[Math.floor(Math.random() * idlePool.length)]);
                } else {
                    const ctx: ChalkContext = { state, streak, totalAnswered, categoryId: questionType, hardMode, timedMode };
                    setMessage(pickChalkMessage({ ...ctx, state: 'idle' }, voice));
                }
            }, 5000);
        };
        const stop = () => { if (interval) { clearInterval(interval); interval = undefined; } };
        const onVisibility = () => (document.hidden ? stop() : start());
        if (!document.hidden) start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [state, questionType, streak, totalAnswered, hardMode, timedMode, voice, teacher]);

    const displayState = pingMessage ? 'comeback' : state;
    const currentMessage = pingMessage || message;
    const PortraitSvg = teacher.Portrait;

    return (
        <motion.div
            className={`absolute bottom-4 right-2 pointer-events-none z-30 ${displayState === 'streak' ? 'on-fire' : ''}`}
            animate={ANIMS[displayState]}
            aria-label={teacher.name}
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

            <svg viewBox="0 0 100 130" className="w-[84px] h-[110px]" style={{ color: 'var(--color-chalk)' }}>
                <PortraitSvg state={displayState} streak={streak} />
                {costume && COSTUMES[costume]}
            </svg>
            {/* Fire emoji outside SVG for proper transparency on all platforms */}
            {displayState === 'streak' && (
                <span className="absolute -top-1 right-0 text-xl pointer-events-none">🔥</span>
            )}
        </motion.div>
    );
});

function pickStateVoice(voice: import('../domains/math/teachers').Teacher['voice'], state: ChalkState): string[] | undefined {
    switch (state) {
        case 'success': return voice.success;
        case 'fail': return voice.fail;
        case 'streak': return voice.streak;
        case 'comeback': return voice.comeback;
        case 'struggling': return voice.struggling;
        case 'idle':
        default: return voice.idle;
    }
}
