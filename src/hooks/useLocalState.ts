import { useState, useCallback, useEffect, useRef } from 'react';
import { getFirebase } from '../utils/firebase';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

/** Map storage key → preferences sub-field on the user doc.
 *  Single source of truth — used by both the read and write paths. */
const FIELD_MAP: Record<string, string> = {
    'math-swipe-costume': 'costume',
    'math-swipe-chalk-theme': 'chalkTheme',
    'math-swipe-theme': 'themeMode',
    'math-swipe-age-band': 'ageBand',
    'math-swipe-trail': 'trailId',
    'math-swipe-teacher': 'teacher',
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

    // Restore from Firestore ONLY when this device has no local value.
    // LOCAL WINS on uid changes too: the common uid change here is the same
    // person signing in (anon → Google, reconcile), and letting the cloud
    // value clobber the device's choice made cosmetics "change on their own"
    // after sign-in (bug report 2026-07-16: swipe trail flipped to purple).
    // The setter below pushes local up to the cloud, so the accounts converge
    // on what the user actually sees.
    const prevUidRef = useRef(uid);
    useEffect(() => {
        if (!uid) return;
        prevUidRef.current = uid;
        const localVal = safeGetItem(key);
        if (localVal) return; // device choice stands
        const field = FIELD_MAP[key];
        if (!field) return;
        Promise.all([getFirebase(), import('firebase/firestore')]).then(([{ db }, { doc, getDoc }]) =>
            getDoc(doc(db, 'users', uid)).then(snap => {
                if (snap.exists() && snap.data().preferences) {
                    const prefs = snap.data().preferences;
                    if (prefs[field]) {
                        setInner(prefs[field]);
                        safeSetItem(key, prefs[field]);
                    }
                }
            })
        ).catch(() => { /* silent */ });
    }, [uid, key]);

    const setState = useCallback((value: string) => {
        setInner(value);
        safeSetItem(key, value);
        // Async cloud sync
        if (!uid) return;
        const field = FIELD_MAP[key];
        if (!field) return;
        Promise.all([getFirebase(), import('firebase/firestore')]).then(([{ db }, { doc, setDoc, serverTimestamp }]) =>
            setDoc(doc(db, 'users', uid), {
                preferences: { [field]: value },
                updatedAt: serverTimestamp(),
            }, { merge: true })
        ).catch(() => { /* silent */ });
    }, [key, uid]);

    return [state, setState];
}
