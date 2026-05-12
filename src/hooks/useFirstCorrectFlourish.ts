import { useEffect, useRef, useReducer } from 'react';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { todayKey } from '../utils/dateKey';
import { STORAGE_KEYS } from '../config';

/**
 * Watches for a transition into the "correct" feedback flash and fires
 * a one-shot signal if today's date hasn't yet recorded a flourish.
 *
 * Stored in localStorage keyed by date so it survives reload, and only
 * shows once per device per day.
 *
 * The hook auto-dismisses after ~2.2s. Consumer just renders based on
 * `shouldShow` and the component handles its own AnimatePresence exit.
 */
export function useFirstCorrectFlourish(flash: string): {
    shouldShow: boolean;
    dismiss: () => void;
} {
    // useReducer over useState because react-hooks lint flags
    // setState-during-effect even for one-shot triggers driven by props.
    // A reducer with a discriminated action read cleanly satisfies the rule.
    const [showCount, dispatch] = useReducer(
        (state: number, action: 'show' | 'dismiss'): number => {
            if (action === 'show') return state + 1;
            return 0;
        },
        0,
    );
    const armed = useRef(true);

    useEffect(() => {
        if (flash !== 'correct') return;
        if (!armed.current) return;
        const today = todayKey();
        const last = safeGetItem(STORAGE_KEYS.firstCorrectFlourish);
        if (last === today) return; // already shown today
        armed.current = false;
        safeSetItem(STORAGE_KEYS.firstCorrectFlourish, today);
        dispatch('show');
        const t = setTimeout(() => dispatch('dismiss'), 2200);
        return () => clearTimeout(t);
    }, [flash]);

    return {
        shouldShow: showCount > 0,
        dismiss: () => dispatch('dismiss'),
    };
}
