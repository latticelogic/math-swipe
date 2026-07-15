/**
 * hooks/useGameLoop.ts
 *
 * Engine-level game loop hook.
 * Domain-specific logic is injected via `generateItem` and `config`.
 * Imports scoring from the engine layer; no direct math imports.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { EngineItem, GameConfig, ChalkState, FeedbackFlash } from '../engine/domain';
import { SWIPE_TO_INDEX, DEFAULT_GAME_CONFIG } from '../engine/domain';
import { scoreCorrect, scorePenalty, FAST_ANSWER_MS } from '../engine/scoring';
import { useDifficulty } from './useDifficulty';
import { hapticCorrect, hapticWrong, hapticMilestone } from '../utils/haptics';
import { milestoneDurationMs } from '../components/milestoneTiers';

// Re-export engine types so callers that import from useGameLoop still work
export type { ChalkState, FeedbackFlash };

// ── Internal state ────────────────────────────────────────────────────────────

interface GameState {
    score: number;
    streak: number;
    bestStreak: number;
    totalCorrect: number;
    totalAnswered: number;
    answerHistory: boolean[];
    chalkState: ChalkState;
    flash: FeedbackFlash;
    frozen: boolean;
    milestone: string;
    speedBonus: boolean;
    wrongStreak: number;
    shieldBroken: boolean;
}

const INITIAL_STATE: GameState = {
    score: 0, streak: 0, bestStreak: 0,
    totalCorrect: 0, totalAnswered: 0, answerHistory: [],
    chalkState: 'idle', flash: 'none', frozen: false,
    milestone: '', speedBonus: false, wrongStreak: 0,
    shieldBroken: false,
};

// ── Generator function type ───────────────────────────────────────────────────

/**
 * Function the domain provides to generate one item.
 * @param difficulty  0-10 adaptive difficulty level
 * @param categoryId  The active question type/category (e.g. 'multiply')
 * @param hardMode    Whether hard mode is active
 * @param rng         Optional seeded RNG for reproducible daily/challenge sets
 */
export type ItemGenerator = (
    difficulty: number,
    categoryId: string,
    hardMode: boolean,
    rng?: () => number,
) => EngineItem;

/**
 * Returns true when `selected` is "close enough" to `answer` that the
 * mistake reads as real thinking — not a wild guess.
 *
 * Two cases:
 *   1. Off-by-one for any answer (covers compare, evenodd, etc.)
 *   2. Within 15% of the answer magnitude (covers multiply, fractions, etc.
 *      where being close to the right value indicates real reasoning).
 *
 * Bounds picked empirically: 15% catches "knew the operation, miscomputed
 * a digit" without flagging wildly different distractors as near-miss.
 */
function isNearMissAnswer(selected: number, answer: number): boolean {
    if (!Number.isFinite(selected) || !Number.isFinite(answer)) return false;
    const diff = Math.abs(selected - answer);
    if (diff === 0) return false;
    // Off-by-one rule (handles 0 answer case where 15% trivially fails)
    if (diff <= 1) return true;
    const mag = Math.abs(answer);
    if (mag === 0) return false;
    return diff / mag <= 0.15;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGameLoop(
    generateItem: ItemGenerator,
    categoryId: string = 'multiply',
    hardMode = false,
    challengeId: string | null = null,
    timedMode = false,
    streakShields = 0,
    onConsumeShield?: () => void,
    config: GameConfig = DEFAULT_GAME_CONFIG,
    /**
     * Finite-set generator: when provided and categoryId is in
     * `config.finiteTypeIds`, this is called instead of `generateItem`
     * to produce the entire fixed problem list (daily / challenge).
     */
    generateFiniteSet?: (categoryId: string, challengeId: string | null) => EngineItem[],
) {
    const { level, recordAnswer } = useDifficulty();
    const [items, setItems] = useState<EngineItem[]>([]);
    const [gs, setGs] = useState<GameState>(INITIAL_STATE);

    const { bufferSize, speedrunCount, autoAdvanceMs, failPauseMs, milestones, speedrunTypeId, finiteTypeIds } = config;

    const chalkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const startedRef = useRef(false);
    const prevCategoryId = useRef(categoryId);
    const prevHard = useRef(hardMode);
    const frozenRef = useRef(false);
    const correctCountRef = useRef(0);
    const pendingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    // Dedupe the shield-consume side effect by answer index: the setGs updater
    // it lives in is invoked twice under React StrictMode (dev), which would
    // otherwise decrement streakShields by 2. Keyed on prev.totalAnswered, which
    // is unique per wrong-answer event (a shield save increments it).
    const shieldConsumedForRef = useRef(-1);
    // Per-operation tally for the session: { multiply: {solved, correct}, … }.
    // Keyed on each item's concrete `type` (falls back to the mode's categoryId
    // for single-topic modes), so daily/mixed answers attribute to the real
    // operation they tested. Read by the caller at session-record time, then
    // cleared alongside the game state on reset. `tallyGuardRef` dedupes the
    // bump against React StrictMode's double-invoke of setGs updaters, exactly
    // like `shieldConsumedForRef` above (keyed on the pre-increment answer count).
    const typeTallyRef = useRef<Record<string, { solved: number; correct: number }>>({});
    const tallyGuardRef = useRef(-1);

    /** Bump the per-operation tally for one answered item. `item.type` is the
     *  concrete operation (stamped by the generator for daily/mixed sets); it
     *  falls back to the mode's own categoryId for single-topic play. */
    const bumpTally = useCallback((item: EngineItem | undefined, correct: boolean) => {
        const inc = (key: string) => {
            const t = typeTallyRef.current[key] ?? { solved: 0, correct: 0 };
            typeTallyRef.current[key] = { solved: t.solved + 1, correct: t.correct + (correct ? 1 : 0) };
        };
        const opKey = item?.type || categoryId;
        inc(opKey);
        // Additive: also credit the mode's own bucket (daily / challenge /
        // speedrun / mix-*) when it differs from the concrete operation. This
        // preserves the legacy per-mode counts that mode-level stats and
        // achievements rely on (e.g. "byType.daily.solved >= 10") while the
        // per-operation buckets feed the new per-type accuracy grid.
        if (opKey !== categoryId) inc(categoryId);
    }, [categoryId]);

    /** Snapshot of the session's per-operation tally, for the caller to persist. */
    const getTypeTally = useCallback(() => ({ ...typeTallyRef.current }), []);

    const resetTypeTally = useCallback(() => {
        typeTallyRef.current = {};
        tallyGuardRef.current = -1;
    }, []);

    /** Schedule a timeout that gets auto-cleared on unmount */
    const safeTimeout = useCallback((fn: () => void, ms: number) => {
        const id = setTimeout(() => {
            pendingTimers.current = pendingTimers.current.filter(t => t !== id);
            fn();
        }, ms);
        pendingTimers.current.push(id);
        return id;
    }, []);

    // ── Timed mode ────────────────────────────────────────────────────────────
    // Timed mode: the hook owns the EXPIRY (game logic), but the visual ring
    // self-drives inside the <TimerRing> leaf so App no longer re-renders every
    // animation frame. We keep the rAF here only to detect expiry (and it still
    // pauses in a backgrounded tab, matching the ring's own rAF).
    const timerStartRef = useRef<number>(0);
    const timerRafRef = useRef<number>(0);
    const timedModeRef = useRef(timedMode);
    timedModeRef.current = timedMode;

    // ── Speedrun timing ───────────────────────────────────────────────────────
    const speedrunStartRef = useRef<number>(0);
    const speedrunRafRef = useRef<number>(0);
    const [speedrunElapsed, setSpeedrunElapsed] = useState(0);
    const [speedrunFinalTime, setSpeedrunFinalTime] = useState<number | null>(null);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const isFiniteSet = (id: string) => finiteTypeIds.includes(id);
    const isSpeedrun = (id: string) => id === speedrunTypeId;

    // ── Recent-repeat guard ─────────────────────────────────────────────────
    // Keys of the last few problems shown/queued, so a freshly generated one
    // that matches (e.g. "10 ÷ 5" again) is re-rolled. Thin low-difficulty pools
    // otherwise recycle visibly within a single session. Cleared whenever the
    // buffer is rebuilt (category change / reset) via buildInitialSet.
    const recentKeysRef = useRef<string[]>([]);
    const RECENT_MAX = 8;
    const itemKey = (it: EngineItem): string =>
        (it as { expression?: string }).expression ?? it.prompt ?? String(it.answer);
    const genFresh = useCallback((catId: string, hard: boolean): EngineItem => {
        let item = generateItem(level, catId, hard);
        for (let tries = 0; tries < 6 && recentKeysRef.current.includes(itemKey(item)); tries++) {
            item = generateItem(level, catId, hard);
        }
        const k = itemKey(item);
        recentKeysRef.current = [k, ...recentKeysRef.current.filter(x => x !== k)].slice(0, RECENT_MAX);
        return item;
    }, [level, generateItem]);

    const buildInitialSet = useCallback((catId: string, hard: boolean): EngineItem[] => {
        recentKeysRef.current = [];   // fresh buffer → fresh recency window
        if (isSpeedrun(catId)) {
            return Array.from({ length: speedrunCount }, () => genFresh('mix-all', hard));
        }
        if (isFiniteSet(catId) && generateFiniteSet) {
            return generateFiniteSet(catId, challengeId);   // seeded finite sets are intentionally fixed
        }
        return Array.from({ length: bufferSize }, () => genFresh(catId, hard));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level, bufferSize, speedrunCount, challengeId, genFresh, generateFiniteSet]);

    // ── Initialize buffer ─────────────────────────────────────────────────────
    useEffect(() => {
        if (startedRef.current) return;
        startedRef.current = true;
        const initial = buildInitialSet(categoryId, hardMode);
        if (initial[0]) initial[0].startTime = Date.now();
        if (isSpeedrun(categoryId)) {
            speedrunStartRef.current = Date.now();
            setSpeedrunFinalTime(null);
            correctCountRef.current = 0;
        }
        setItems(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Regenerate on category / hard mode change ─────────────────────────────
    useEffect(() => {
        if (prevCategoryId.current === categoryId && prevHard.current === hardMode) return;
        prevCategoryId.current = categoryId;
        prevHard.current = hardMode;

        const fresh = buildInitialSet(categoryId, hardMode);
        if (fresh[0]) fresh[0].startTime = Date.now();

        if (isSpeedrun(categoryId)) {
            speedrunStartRef.current = Date.now();
            setSpeedrunFinalTime(null);
            correctCountRef.current = 0;
        }

        resetTypeTally();
        setItems(fresh);
        setGs(INITIAL_STATE);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryId, hardMode, buildInitialSet]);

    // ── Reset the current session (same category) ─────────────────────────────
    // Zeroes the counters + rebuilds the buffer WITHOUT a category change. The
    // caller uses this once a session has been recorded + summarized, so
    // re-entering the game tab starts clean and navigating away again can't
    // re-record / re-summarize the stale counts (which also double-counted XP).
    const resetSession = useCallback(() => {
        const fresh = buildInitialSet(categoryId, hardMode);
        if (fresh[0]) fresh[0].startTime = Date.now();
        correctCountRef.current = 0;
        resetTypeTally();
        setItems(fresh);
        setGs(INITIAL_STATE);
    }, [categoryId, hardMode, buildInitialSet, resetTypeTally]);

    // ── Keep infinite buffer full ─────────────────────────────────────────────
    useEffect(() => {
        if (isSpeedrun(categoryId) || isFiniteSet(categoryId)) return;
        if (items.length < bufferSize) {
            setItems(prev => [...prev, genFresh(categoryId, hardMode)]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items.length, level, categoryId, hardMode]);

    // ── Advance to next problem ───────────────────────────────────────────────
    const advanceProblem = useCallback(() => {
        setItems(prev => {
            const next = prev.slice(1);
            if (next[0]) next[0].startTime = Date.now();
            return next;
        });
        if (timedModeRef.current) {
            timerStartRef.current = Date.now();
        }
    }, []);

    // ── Reset chalk state after delay ─────────────────────────────────────────
    const scheduleChalkReset = useCallback((durationMs: number) => {
        if (chalkTimerRef.current) clearTimeout(chalkTimerRef.current);
        chalkTimerRef.current = setTimeout(() => {
            setGs(prev => ({ ...prev, chalkState: prev.chalkState === 'streak' ? 'streak' : 'idle' }));
        }, durationMs);
    }, []);

    // ── Handle swipe ──────────────────────────────────────────────────────────
    const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
        if (frozenRef.current || items.length === 0) return;
        const current = items[0];
        if (!current) return;
        const tts = Date.now() - (current.startTime ?? Date.now());

        // Skip (swipe-up) was removed 2026-07-16 — owner call. Up-swipes are
        // ignored so accidental upward gestures can't do anything.
        if (direction === 'up') return;

        const selectedValue = current.options[SWIPE_TO_INDEX[direction]];
        const correct = selectedValue === current.answer;
        // String-option topics (fractions with labelled options) skip the
        // near-miss branch — only numeric answers compare meaningfully.
        const isNearMiss = !correct
            && typeof selectedValue === 'number'
            && typeof current.answer === 'number'
            && isNearMissAnswer(selectedValue, current.answer);

        if (correct) {
            recordAnswer(tts, true);
            const isFast = tts < FAST_ANSWER_MS;
            correctCountRef.current += 1;
            bumpTally(current, true);
            const actualCorrectCount = correctCountRef.current;
            let newStreak = 0;
            let milestoneEmoji = '';

            setGs(prev => {
                newStreak = prev.streak + 1;
                milestoneEmoji = milestones[newStreak] ?? '';
                // Haptic: louder buzz on milestones, normal pulse otherwise.
                if (milestoneEmoji) hapticMilestone();
                else hapticCorrect();
                return {
                    ...prev,
                    streak: newStreak,
                    bestStreak: Math.max(prev.bestStreak, newStreak),
                    totalCorrect: prev.totalCorrect + 1,
                    totalAnswered: prev.totalAnswered + 1,
                    answerHistory: [...prev.answerHistory, true].slice(-50),
                    score: prev.score + scoreCorrect(newStreak, isFast),
                    flash: 'correct',
                    chalkState: newStreak >= 10 ? 'streak' : (prev.wrongStreak >= 3 ? 'comeback' as ChalkState : 'success'),
                    milestone: milestoneEmoji,
                    speedBonus: isFast,
                    wrongStreak: 0,
                    frozen: true,
                };
            });
            frozenRef.current = true;
            scheduleChalkReset(newStreak >= 10 ? 2000 : 800);
            // Per-tier duration — trophy stays on screen longer than sparkle.
            // Falls back to 1300ms for unknown tiers.
            if (milestoneEmoji) safeTimeout(() => setGs(p => ({ ...p, milestone: '' })), milestoneDurationMs(milestoneEmoji));
            if (isFast) safeTimeout(() => setGs(p => ({ ...p, speedBonus: false })), 900);

            // Speedrun win condition
            if (isSpeedrun(categoryId) && actualCorrectCount >= speedrunCount) {
                const finalTime = Date.now() - speedrunStartRef.current;
                setSpeedrunFinalTime(finalTime);
                setGs(prev => ({ ...prev, flash: 'none' }));
                return;
            }

            safeTimeout(() => {
                setGs(prev => ({ ...prev, flash: 'none', frozen: false }));
                frozenRef.current = false;
                advanceProblem();
            }, autoAdvanceMs);
        } else {
            hapticWrong();
            setGs(prev => {
                const isTutorial = prev.totalAnswered === 0;
                if (isTutorial) {
                    frozenRef.current = true;
                    scheduleChalkReset(failPauseMs);
                    safeTimeout(() => {
                        setGs(p => ({ ...p, flash: 'none', frozen: false }));
                        frozenRef.current = false;
                    }, failPauseMs);
                    return { ...prev, flash: (isNearMiss ? 'near-miss' : 'wrong') as FeedbackFlash, chalkState: 'fail' as ChalkState, frozen: true };
                }

                recordAnswer(tts, false);
                // Counted wrong (both the shield-saved and normal cases below
                // increment totalAnswered); the tutorial case above returns
                // first and is not counted. Guard mirrors the shield dedupe.
                if (tallyGuardRef.current !== prev.totalAnswered) {
                    tallyGuardRef.current = prev.totalAnswered;
                    bumpTally(current, false);
                }

                if (streakShields > 0 && prev.streak > 0 && onConsumeShield) {
                    // Guard against StrictMode's double-invoke of this updater.
                    if (shieldConsumedForRef.current !== prev.totalAnswered) {
                        shieldConsumedForRef.current = prev.totalAnswered;
                        onConsumeShield();
                    }
                    frozenRef.current = true;
                    scheduleChalkReset(failPauseMs);
                    safeTimeout(() => {
                        setGs(p => ({ ...p, flash: 'none', frozen: false, shieldBroken: false }));
                        frozenRef.current = false;
                        advanceProblem();
                    }, failPauseMs);
                    return {
                        ...prev,
                        totalAnswered: prev.totalAnswered + 1,
                        answerHistory: [...prev.answerHistory, false].slice(-50),
                        flash: (isNearMiss ? 'near-miss' : 'wrong') as FeedbackFlash,
                        chalkState: 'fail' as ChalkState,
                        frozen: true,
                        shieldBroken: true,
                    };
                }

                // Normal wrong answer
                frozenRef.current = true;
                scheduleChalkReset(failPauseMs);
                if (isSpeedrun(categoryId)) {
                    setItems(p => [...p, generateItem(level, 'mix-all', hardMode)]);
                }
                safeTimeout(() => {
                    setGs(p => ({ ...p, flash: 'none', frozen: false }));
                    frozenRef.current = false;
                    advanceProblem();
                }, failPauseMs);

                const wrongStreak = prev.wrongStreak + 1;
                return {
                    ...prev,
                    streak: 0,
                    totalAnswered: prev.totalAnswered + 1,
                    answerHistory: [...prev.answerHistory, false].slice(-50),
                    score: scorePenalty(prev.score),
                    flash: (isNearMiss ? 'near-miss' : 'wrong') as FeedbackFlash,
                    chalkState: (wrongStreak >= 3 ? 'struggling' : 'fail') as ChalkState,
                    milestone: '',
                    wrongStreak,
                    frozen: true,
                };
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, recordAnswer, scheduleChalkReset, advanceProblem, safeTimeout, categoryId, streakShields, onConsumeShield, hardMode, level, milestones, autoAdvanceMs, failPauseMs, speedrunCount, generateItem]);

    // ── Timed mode tick + auto-skip ───────────────────────────────────────────
    useEffect(() => {
        if (!timedMode || gs.frozen || items.length === 0) {
            cancelAnimationFrame(timerRafRef.current);
            return;
        }
        timerStartRef.current = Date.now();

        const tick = () => {
            const elapsed = Date.now() - timerStartRef.current;
            const p = Math.min(elapsed / config.timedModeMs, 1);
            if (p >= 1) {
                cancelAnimationFrame(timerRafRef.current);
                frozenRef.current = true;
                setGs(prev => {
                    // Timer ran out — a counted wrong for the current item's type.
                    if (tallyGuardRef.current !== prev.totalAnswered) {
                        tallyGuardRef.current = prev.totalAnswered;
                        bumpTally(items[0], false);
                    }
                    const wrongStreak = prev.wrongStreak + 1;
                    return {
                        ...prev,
                        streak: 0,
                        totalAnswered: prev.totalAnswered + 1,
                        answerHistory: [...prev.answerHistory, false].slice(-50),
                        score: scorePenalty(prev.score),
                        flash: 'wrong' as const,
                        chalkState: (wrongStreak >= 3 ? 'struggling' : 'fail') as ChalkState,
                        milestone: '',
                        wrongStreak,
                        frozen: true,
                    };
                });
                scheduleChalkReset(failPauseMs);
                safeTimeout(() => {
                    setGs(prev => ({ ...prev, flash: 'none', frozen: false }));
                    advanceProblem();
                }, failPauseMs);
                return;
            }
            timerRafRef.current = requestAnimationFrame(tick);
        };
        timerRafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(timerRafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timedMode, items[0]?.id, gs.frozen]);

    // ── Speedrun live stopwatch ───────────────────────────────────────────────
    useEffect(() => {
        if (!isSpeedrun(categoryId) || speedrunFinalTime !== null) {
            cancelAnimationFrame(speedrunRafRef.current);
            return;
        }
        if (speedrunStartRef.current === 0) return;
        // The stopwatch displays 0.1s precision, so emit at ~10Hz rather than
        // once per animation frame. Each setState here reconciles the whole App
        // tree; throttling cuts that ~6x during a latency-sensitive mode with
        // no visible change to the readout.
        let lastEmit = -Infinity;
        const tick = () => {
            const elapsed = Date.now() - speedrunStartRef.current;
            if (elapsed - lastEmit >= 100) {
                lastEmit = elapsed;
                setSpeedrunElapsed(elapsed);
            }
            speedrunRafRef.current = requestAnimationFrame(tick);
        };
        speedrunRafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(speedrunRafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryId, speedrunFinalTime, items.length]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (chalkTimerRef.current) clearTimeout(chalkTimerRef.current);
            pendingTimers.current.forEach(t => clearTimeout(t));
            pendingTimers.current = [];
            cancelAnimationFrame(speedrunRafRef.current);
        };
    }, []);

    const dailyComplete =
        (isFiniteSet(categoryId)) &&
        gs.totalAnswered > 0 &&
        items.length === 0;

    return {
        problems: items,  // alias kept for backward compat with ProblemView/App expectations
        ...gs,
        level,
        handleSwipe,
        resetSession,
        getTypeTally,
        timedDurationMs: config.timedModeMs,
        dailyComplete,
        speedrunFinalTime,
        speedrunElapsed,
    };
}
