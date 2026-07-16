/**
 * utils/experiments.ts
 *
 * A/B experiment scaffolding. The monetization model is explicit that the
 * lever for revenue is *conversion-rate UX* (trial polish, paywall copy,
 * habit formation) — never price or tiers. This is the plumbing to measure
 * those UX bets.
 *
 * Design:
 *  - **Deterministic, offline assignment.** A player's variant is a pure
 *    hash of (stableId, experimentId) — no network, no flicker, no server
 *    round-trip. The same player always sees the same variant; refreshes and
 *    reinstalls-with-same-uid are stable.
 *  - **Anonymous-safe.** Assignment keys on the Firebase uid (anonymous auth
 *    gives everyone one). Before auth resolves, a per-device fallback id keeps
 *    assignment stable for that session.
 *  - **Exposure logged once.** `useExperiment` fires a fire-and-forget write
 *    to `experimentExposures` (create-only, read:false — the owner joins it to
 *    conversions server-side, like `vitals`). Deduped per session so a paywall
 *    re-render doesn't spam.
 *
 * Registering an experiment does NOT change any UX until a component calls
 * `useExperiment(id)` and branches on the result — see the example below.
 */

import { useEffect, useState } from 'react';
import { getFirebase } from './firebase';

export interface Experiment {
    id: string;
    /** Variant ids with integer weights (need not sum to 100). The FIRST is
     *  the control and the fallback for any lookup miss. */
    variants: { id: string; weight: number }[];
    /** false = assignment always returns control (kill switch without code
     *  removal). Flip to true to start collecting. */
    active: boolean;
}

/**
 * The registry. Add experiments here; consume with `useExperiment(id)`.
 *
 * EXAMPLE (dormant — active:false, so everyone gets 'control' and nothing
 * changes until it's turned on and a component branches on it):
 *
 *   In Paywall.tsx:
 *     const cta = useExperiment('paywall-cta', uid);
 *     <button>{cta === 'bold' ? t('paywall.ctaBold') : t('paywall.ctaExpired')}</button>
 */
export const EXPERIMENTS: readonly Experiment[] = [
    {
        id: 'paywall-cta',
        variants: [{ id: 'control', weight: 1 }, { id: 'bold', weight: 1 }],
        active: false,
    },
];

const byId = new Map(EXPERIMENTS.map(e => [e.id, e]));

/** FNV-1a 32-bit — small, fast, well-distributed for short strings. */
function hash(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0; // unsigned
}

const DEVICE_ID_KEY = 'math-swipe-device-id';

/** Stable id for assignment: the uid when signed in, else a per-device id
 *  (anonymous auth means uid is usually present, but this covers the pre-auth
 *  window so a player doesn't flip variants when auth resolves mid-session). */
export function stableId(uid: string | null): string {
    if (uid) return uid;
    try {
        let id = localStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
            // Derive from time+perf without Math.random (kept out of this file
            // for the same reason the workflow layer bans it — determinism).
            id = `dev-${hash(String(Date.now()) + navigator.userAgent).toString(36)}`;
            localStorage.setItem(DEVICE_ID_KEY, id);
        }
        return id;
    } catch {
        return 'anon';
    }
}

/**
 * The variant for (experiment, player). Pure + deterministic. Returns the
 * control for an unknown or inactive experiment. Weighted by variant weight.
 */
export function getVariant(experimentId: string, uid: string | null): string {
    const exp = byId.get(experimentId);
    if (!exp || exp.variants.length === 0) return 'control';
    const control = exp.variants[0].id;
    if (!exp.active) return control;

    const total = exp.variants.reduce((s, v) => s + Math.max(0, v.weight), 0);
    if (total <= 0) return control;

    // Bucket into [0, total) deterministically from the hash.
    const bucket = hash(`${experimentId}:${stableId(uid)}`) % total;
    let acc = 0;
    for (const v of exp.variants) {
        acc += Math.max(0, v.weight);
        if (bucket < acc) return v.id;
    }
    return control;
}

// Per-session exposure dedupe so a re-render doesn't re-log.
const loggedThisSession = new Set<string>();

/** Fire-and-forget exposure log to Firestore (`experimentExposures`). */
async function logExposure(experimentId: string, variant: string, uid: string | null): Promise<void> {
    const key = `${experimentId}:${variant}`;
    if (loggedThisSession.has(key)) return;
    loggedThisSession.add(key);
    try {
        const [{ db }, { collection, addDoc, serverTimestamp }] = await Promise.all([
            getFirebase(), import('firebase/firestore'),
        ]);
        await addDoc(collection(db, 'experimentExposures'), {
            experimentId,
            variant,
            uid: uid ?? null,
            timestamp: serverTimestamp(),
        });
    } catch {
        loggedThisSession.delete(key); // let a later render retry
    }
}

/**
 * Hook: returns the player's variant for `experimentId` and logs one exposure
 * per session. Branch on the returned string in your component.
 */
export function useExperiment(experimentId: string, uid: string | null): string {
    const [variant] = useState(() => getVariant(experimentId, uid));
    useEffect(() => {
        const exp = byId.get(experimentId);
        if (exp?.active) void logExposure(experimentId, variant, uid);
    }, [experimentId, variant, uid]);
    return variant;
}

/** Test hook — reset the per-session dedupe. */
export function _resetExposuresForTests(): void {
    loggedThisSession.clear();
}
