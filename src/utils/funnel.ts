/**
 * utils/funnel.ts
 *
 * Lightweight growth-funnel instrumentation. One doc per user at
 * `funnel/{uid}` holds a set-once timestamp for each milestone plus a rolling
 * lastActiveAt for retention. The admin funnel view (/admin/funnel) aggregates
 * these into first-open → first-play → paywall-view → purchase conversion +
 * D1/D7 return, so growth bets become measurable instead of guesses.
 *
 * Cheap + non-blocking: every write is fire-and-forget and guarded by a
 * localStorage flag so a milestone is written at most once per device. Reads
 * are admin-only. As the user base grows this can move to a scheduled
 * server-side rollup (funnelStats/{date}); the client contract stays the same.
 */
import { getFirebase } from './firebase';
import { isAndroidApp, isNativeAndroid } from './channel';

export type FunnelStep = 'firstOpen' | 'firstPlay' | 'paywallView' | 'purchase';

const STEP_FIELD: Record<FunnelStep, string> = {
    firstOpen: 'firstOpenAt',
    firstPlay: 'firstPlayAt',
    paywallView: 'paywallViewAt',
    purchase: 'purchaseAt',
};

function platformLabel(): string {
    return isNativeAndroid() ? 'android-native' : isAndroidApp() ? 'twa' : 'web';
}

/** Mark a funnel milestone (set-once per device). Fire-and-forget. */
export async function markFunnel(uid: string | null, step: FunnelStep): Promise<void> {
    if (!uid) return;
    const guard = `mc-funnel-${step}`;
    try { if (localStorage.getItem(guard) === uid) return; } catch { /* storage off → still write */ }
    try {
        const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
            getFirebase(), import('firebase/firestore'),
        ]);
        await setDoc(doc(db, 'funnel', uid), {
            [STEP_FIELD[step]]: serverTimestamp(),
            platform: platformLabel(),
            lastActiveAt: serverTimestamp(),
        }, { merge: true });
        try { localStorage.setItem(guard, uid); } catch { /* ignore */ }
    } catch (err) {
        console.warn('[funnel] mark failed (non-fatal):', step, err);
    }
}

/** Bump lastActiveAt for retention. Throttled to once per session via the
 *  in-memory flag so it costs one write per app open, not per render. */
let touchedThisSession = false;
export async function touchFunnelActive(uid: string | null): Promise<void> {
    if (!uid || touchedThisSession) return;
    touchedThisSession = true;
    try {
        const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
            getFirebase(), import('firebase/firestore'),
        ]);
        await setDoc(doc(db, 'funnel', uid), { lastActiveAt: serverTimestamp() }, { merge: true });
    } catch { /* non-fatal */ }
}
