import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

/** Map storage key → preferences sub-field on the user doc.
 *  Single source of truth — used by both the read and write paths. */
const FIELD_MAP: Record<string, string> = {
    'math-swipe-costume': 'costume',
    'math-swipe-chalk-theme': 'chalkTheme',
    'math-swipe-theme': 'themeMode',
    'math-swipe-age-band': 'ageBand',
    'math-swipe-trail': 'trailId',
};

/**
 * useState backed by localStorage + Firestore cloud sync.
 * Reads localStorage on mount (fast), restores from Firestore if local is empty.
 * Every set writes to both localStorage and Firestore preferences.
 */
export function useLocalState(
    key: string,
    defaultValue: string,
    uid?: string | null,
): [string, (value: string) => void] {
    const [state, setInner] = useState<string>(
        () => safeGetItem(key) ?? defaultValue,
    );

    // Restore from Firestore if localStorage is empty or UID changed
    const prevUidRef = useRef(uid);
    useEffect(() => {
        if (!uid) return;
        const uidChanged = prevUidRef.current !== uid;
        prevUidRef.current = uid;
        const localVal = safeGetItem(key);
        if (localVal && !uidChanged) return; // already have local data and same user
        const field = FIELD_MAP[key];
        if (!field) return;
        getDoc(doc(db, 'users', uid)).then(snap => {
            if (snap.exists() && snap.data().preferences) {
                const prefs = snap.data().preferences;
                if (prefs[field]) {
                    setInner(prefs[field]);
                    safeSetItem(key, prefs[field]);
                }
            }
        }).catch(() => { /* silent */ });
    }, [uid, key]);

    const setState = useCallback((value: string) => {
        setInner(value);
        safeSetItem(key, value);
        // Async cloud sync
        if (!uid) return;
        const field = FIELD_MAP[key];
        if (!field) return;
        setDoc(doc(db, 'users', uid), {
            preferences: { [field]: value },
            updatedAt: serverTimestamp(),
        }, { merge: true }).catch(() => { /* silent */ });
    }, [key, uid]);

    return [state, setState];
}
