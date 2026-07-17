/**
 * useDifficulty — React wrapper around the pure adaptive-difficulty
 * adjuster in engine/difficulty.ts (rules + tuning rationale live there;
 * tests in src/tests/difficulty.test.ts).
 *
 * This wrapper adds the one impure concern: persistence. The level
 * survives reloads via localStorage and resumes warm-up-capped (never
 * above 4), so returning players don't re-grind from 2 every session and
 * struggling players aren't arbitrarily bumped back up.
 */

import { useState, useCallback, useRef } from 'react';
import {
    initialDifficultyState, stepDifficulty, resumeLevel,
    type DifficultyState,
} from '../engine/difficulty';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

const STORAGE_KEY = 'math-swipe-difficulty';

function readResumeLevel(): number {
    const stored = safeGetItem(STORAGE_KEY); // Number(null) would be 0 — keep null null
    return resumeLevel(stored === null ? null : Number(stored));
}

export function useDifficulty() {
    const [level, setLevel] = useState(readResumeLevel);
    // Full adjuster state lives in a ref, touched only at event time (the
    // react-hooks/refs rule forbids render-time reads; this also keeps the
    // counters safe from StrictMode double-invocation of render).
    const stateRef = useRef<DifficultyState | null>(null);

    const recordAnswer = useCallback((ttsMs: number, correct: boolean) => {
        const prev = stateRef.current ?? initialDifficultyState(readResumeLevel());
        const next = stepDifficulty(prev, ttsMs, correct);
        stateRef.current = next;
        if (next.level !== prev.level) {
            setLevel(next.level);
            safeSetItem(STORAGE_KEY, String(next.level));
        }
    }, []);

    return { level, recordAnswer };
}
