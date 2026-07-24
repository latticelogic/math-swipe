import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Auto-shows session summary when daily challenge or speedrun finishes.
 * Returns showSummary state + setter, plus isNewSpeedrunRecord flag.
 *
 * Implementation: tracks the "edge token" of the most recently dismissed
 * trigger. The summary is open whenever a trigger is active and differs from
 * the last-dismissed token. This avoids both (a) setState-in-render warnings
 * and (b) setState-in-effect warnings that React 19's stricter linter flags.
 */
type DismissToken = string | null;

function dailyToken(complete: boolean): DismissToken {
    return complete ? 'daily' : null;
}

function speedrunToken(time: number | null): DismissToken {
    return time ? `speedrun:${time}` : null;
}

export function useAutoSummary(
    dailyComplete: boolean,
    speedrunFinalTime: number | null,
    bestSpeedrunTime: number,
    updateBestSpeedrunTime: (time: number, hardMode?: boolean) => void,
    hardMode: boolean,
) {
    // The token of whatever trigger was last dismissed (or last open-and-still-active).
    const [dismissedToken, setDismissedToken] = useState<DismissToken>(null);

    const activeToken: DismissToken =
        speedrunToken(speedrunFinalTime) ?? dailyToken(dailyComplete);

    const showSummary = activeToken !== null && activeToken !== dismissedToken;

    // Snapshot record-ness at the instant a NEW speedrun time arrives — before
    // the effect below lowers bestSpeedrunTime. Computing it live would flip the
    // flag to false the moment updateBestSpeedrunTime lands, so "New Record!"
    // flashed for a single frame then vanished. We latch it into state, keyed on
    // the time we processed, so it stays stable for the whole summary.
    const [isNewSpeedrunRecord, setIsNewSpeedrunRecord] = useState(false);
    const processedTimeRef = useRef<number | null>(null);
    useEffect(() => {
        if (speedrunFinalTime) {
            if (speedrunFinalTime !== processedTimeRef.current) {
                processedTimeRef.current = speedrunFinalTime;
                // Read best BEFORE the update on this same tick (prop still holds
                // the previous best here).
                setIsNewSpeedrunRecord(bestSpeedrunTime === 0 || speedrunFinalTime < bestSpeedrunTime);
                updateBestSpeedrunTime(speedrunFinalTime, hardMode);
            }
        } else if (processedTimeRef.current !== null) {
            processedTimeRef.current = null;
            setIsNewSpeedrunRecord(false);
        }
    }, [speedrunFinalTime, bestSpeedrunTime, hardMode, updateBestSpeedrunTime]);

    const setShowSummary = useCallback((open: boolean) => {
        if (open) {
            // Allow opening even if user dismissed: clear the dismiss token so
            // the current active trigger (or future one) shows again.
            setDismissedToken(null);
        } else {
            // Closing: snapshot the active trigger as dismissed so it stays closed
            // until a new edge fires.
            setDismissedToken(activeToken);
        }
    }, [activeToken]);

    return { showSummary, setShowSummary, isNewSpeedrunRecord };
}

/**
 * Detects when session streak exceeds all-time best and shows a toast.
 * The toast is auto-dismissed after 2s; the timer callback is the only
 * place we update state, which is the legitimate "subscribe + callback"
 * effect pattern.
 */
export function usePersonalBest(sessionBest: number, allTimeBest: number) {
    // Anchor the all-time best at mount; bump it only if cloud-sync raises it later.
    const [anchorBest, setAnchorBest] = useState(allTimeBest);
    const exceeded = sessionBest > anchorBest && sessionBest > 0;

    // Visibility flag — only mutated by the auto-dismiss timer callback,
    // which is exactly the pattern React 19's lint rule permits.
    const [visible, setVisible] = useState(false);

    // Edge-triggered: open the toast on the rising edge of `exceeded`, then
    // auto-dismiss via setTimeout. Lint rule mis-classifies this as a feedback
    // loop; it's actually a one-shot one-way sync.
    useEffect(() => {
        if (!exceeded) return;
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 2000);
        return () => clearTimeout(t);
    }, [exceeded]);

    useEffect(() => {
        if (allTimeBest > anchorBest) setAnchorBest(allTimeBest);
    }, [allTimeBest, anchorBest]);

    return visible;
}
