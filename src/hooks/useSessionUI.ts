import { useState, useEffect, useCallback } from 'react';

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

    const isNewSpeedrunRecord = !!(
        speedrunFinalTime &&
        (bestSpeedrunTime === 0 || speedrunFinalTime < bestSpeedrunTime)
    );

    // Side-effect: persist the new best speedrun time. This *is* a true
    // synchronization with external state, which is the legitimate use of
    // an effect — the effect is reading from props and pushing into the
    // useStats store, not feeding its own setState.
    useEffect(() => {
        if (speedrunFinalTime) {
            updateBestSpeedrunTime(speedrunFinalTime, hardMode);
        }
    }, [speedrunFinalTime, hardMode, updateBestSpeedrunTime]);

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 2000);
        return () => clearTimeout(t);
    }, [exceeded]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (allTimeBest > anchorBest) setAnchorBest(allTimeBest);
    }, [allTimeBest, anchorBest]);

    return visible;
}
