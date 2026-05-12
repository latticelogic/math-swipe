/**
 * hooks/useEntitlement.ts
 *
 * The 14-day demo → $3.14 lifetime gate, exposed as a React hook.
 *
 * Reads `entitlements/{uid}` from Firestore. On the user's first session
 * (no doc exists), creates one with `trialStartedAt = now()` so the clock
 * starts on first launch and survives device changes (it's tied to uid).
 *
 *   trialStartedAt — set once, on first session per uid. Never reset.
 *   paidAt          — null until lifetime unlock purchase. Set by the
 *                     Stripe webhook (Cloud Function) on successful charge.
 *                     Once set, hasAccess() returns true forever.
 *
 * Mock helpers (`mockGrantAccess`, `mockResetTrial`) exist for dev testing
 * the paywall UX before Stripe is wired. Guarded by import.meta.env.DEV so
 * they no-op in production builds.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { FIRESTORE } from '../config';
import {
    blankEntitlement, hasAccess, entitlementStatus, trialDaysLeft,
    type Entitlement, type EntitlementStatus,
} from '../utils/entitlement';

interface UseEntitlementResult {
    /** Granular state for UI branching: 'paid' | 'trial' | 'expired' | 'unknown' */
    status: EntitlementStatus;
    /** Whole days remaining in the free window; 0 once expired. */
    daysLeft: number;
    /** True until first Firestore read resolves. Render loaders, not gates,
     *  while this is true — otherwise a fresh page load briefly flashes the
     *  paywall before the trial state arrives. */
    loading: boolean;
    /** True iff trial is active OR user has paid. Use this for the actual
     *  access decision; everything else is for UI nuance. */
    hasAccess: boolean;
    /** Raw record (or null until loaded). Tests/admin views may want this. */
    entitlement: Entitlement | null;
    /** DEV-ONLY: grant the user lifetime access locally for paywall-flow
     *  testing. No-ops outside dev builds. */
    mockGrantAccess: () => Promise<void>;
    /** DEV-ONLY: rewind trialStartedAt by N days to test expiry/reminder
     *  surfaces. No-ops outside dev builds. */
    mockBackdateTrial: (days: number) => Promise<void>;
}

export function useEntitlement(uid: string | null): UseEntitlementResult {
    const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
    const [loading, setLoading] = useState(true);
    // Guard so the first-session writer doesn't race itself across StrictMode
    // double-mounts or rapid auth re-fires.
    const initialisedForRef = useRef<string | null>(null);

    useEffect(() => {
        if (!uid) {
            setEntitlement(null);
            setLoading(false);
            initialisedForRef.current = null;
            return;
        }
        if (initialisedForRef.current === uid) return;
        initialisedForRef.current = uid;

        let cancelled = false;
        setLoading(true);

        (async () => {
            try {
                const ref = doc(db, FIRESTORE.ENTITLEMENTS, uid);
                const snap = await getDoc(ref);

                if (cancelled) return;

                if (snap.exists()) {
                    setEntitlement(toEntitlement(snap.data()));
                    setLoading(false);
                    return;
                }

                // No doc — this is the user's first session, start the trial clock.
                const now = Date.now();
                const next: Entitlement = {
                    ...blankEntitlement(),
                    trialStartedAt: now,
                    updatedAt: now,
                };
                await setDoc(ref, {
                    trialStartedAt: now,
                    paidAt: null,
                    source: null,
                    originalTransactionId: null,
                    updatedAt: serverTimestamp(),
                });
                if (cancelled) return;
                setEntitlement(next);
            } catch (err) {
                // Don't lock the user out of the app on a transient read failure
                // — fall back to a stale-but-permissive state (treat as trial,
                // re-check next session). The Firestore rule will still gate
                // any write that depends on entitlement on the server side.
                console.warn('[entitlement] load failed, falling back:', err);
                if (!cancelled) {
                    setEntitlement({ ...blankEntitlement(), trialStartedAt: Date.now() });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [uid]);

    const mockGrantAccess = useCallback(async () => {
        if (!import.meta.env.DEV || !uid) return;
        const now = Date.now();
        const ref = doc(db, FIRESTORE.ENTITLEMENTS, uid);
        await setDoc(ref, {
            paidAt: now,
            source: 'promo',
            originalTransactionId: 'dev-mock',
            updatedAt: serverTimestamp(),
        }, { merge: true });
        setEntitlement(prev => ({
            ...(prev ?? blankEntitlement()),
            paidAt: now,
            source: 'promo',
            originalTransactionId: 'dev-mock',
            updatedAt: now,
        }));
    }, [uid]);

    const mockBackdateTrial = useCallback(async (days: number) => {
        if (!import.meta.env.DEV || !uid) return;
        const newStart = Date.now() - days * 86_400_000;
        const ref = doc(db, FIRESTORE.ENTITLEMENTS, uid);
        await setDoc(ref, {
            trialStartedAt: newStart,
            // Belt and braces: clear paid state when backdating so the
            // paywall actually fires in dev testing.
            paidAt: null,
            source: null,
            originalTransactionId: null,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        setEntitlement(prev => ({
            ...(prev ?? blankEntitlement()),
            trialStartedAt: newStart,
            paidAt: null,
            source: null,
            originalTransactionId: null,
            updatedAt: Date.now(),
        }));
    }, [uid]);

    return {
        status: entitlementStatus(entitlement),
        daysLeft: entitlement ? trialDaysLeft(entitlement.trialStartedAt) : 0,
        loading,
        hasAccess: hasAccess(entitlement),
        entitlement,
        mockGrantAccess,
        mockBackdateTrial,
    };
}

/** Coerce a raw Firestore data blob into a typed Entitlement. Tolerant of
 *  missing fields so an older partial doc doesn't break the hook. */
function toEntitlement(data: Record<string, unknown>): Entitlement {
    const trialStartedAt = typeof data.trialStartedAt === 'number'
        ? data.trialStartedAt
        // serverTimestamp() resolves to a Firestore Timestamp object — convert
        : (data.trialStartedAt && typeof data.trialStartedAt === 'object' && 'toMillis' in data.trialStartedAt)
            ? (data.trialStartedAt as { toMillis: () => number }).toMillis()
            : 0;
    const paidAt = typeof data.paidAt === 'number'
        ? data.paidAt
        : (data.paidAt && typeof data.paidAt === 'object' && 'toMillis' in data.paidAt)
            ? (data.paidAt as { toMillis: () => number }).toMillis()
            : null;
    const updatedAt = typeof data.updatedAt === 'number'
        ? data.updatedAt
        : (data.updatedAt && typeof data.updatedAt === 'object' && 'toMillis' in data.updatedAt)
            ? (data.updatedAt as { toMillis: () => number }).toMillis()
            : 0;
    return {
        trialStartedAt,
        paidAt,
        source: (data.source as Entitlement['source']) ?? null,
        originalTransactionId: (data.originalTransactionId as string | null) ?? null,
        updatedAt,
    };
}
