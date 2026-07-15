/**
 * utils/referral.ts
 *
 * Client half of the referral loop (server half: functions/src/referral.ts).
 *
 *   1. capturePendingReferrer() — read ?r=<uid> at boot, first-touch, stash it.
 *   2. maybeClaimReferral()     — once the new player has actually played,
 *                                 redeem the code via the claimReferral callable.
 *   3. fetchReferralCount()     — read the caller's server-verified count to
 *                                 drive referral achievements/cosmetics.
 *   4. buildInviteUrl()         — the shareable ?r= link for a given uid.
 *
 * The reward is derived client-side from the verified count, but the count
 * itself is only writable by the Cloud Function — so it can't be forged.
 */

import { getFirebase } from './firebase';
import { safeGetItem, safeSetItem } from './safeStorage';

const PENDING_KEY = 'math-swipe-pending-referrer';

/** Must match MIN_INVITEE_SOLVED in functions/src/referral.ts. */
export const MIN_INVITEE_SOLVED = 10;

/** Read ?r=<uid> from the URL and stash it (first-touch — never overwrite an
 *  existing pending code). Call once, as early as possible, before other boot
 *  logic rewrites the URL. */
export function capturePendingReferrer(): void {
    try {
        if (typeof window === 'undefined') return;
        const r = new URLSearchParams(window.location.search).get('r');
        if (r && r.length <= 128 && !safeGetItem(PENDING_KEY)) {
            safeSetItem(PENDING_KEY, r);
        }
    } catch { /* ignore */ }
}

export function pendingReferrer(): string | null {
    const v = safeGetItem(PENDING_KEY);
    return v ? v : null;
}

function clearPendingReferrer(): void {
    try { safeSetItem(PENDING_KEY, ''); } catch { /* ignore */ }
}

/** Redeem the pending referral once the invitee has played enough. Idempotent
 *  and cheap to call on every stats change — it no-ops without a pending code,
 *  a uid, or enough play. A `failed-precondition` (server hasn't seen enough
 *  play yet) leaves the code in place to retry next session; any other outcome
 *  clears it so it never loops. */
export async function maybeClaimReferral(uid: string | null, totalSolved: number): Promise<void> {
    if (!uid) return;
    const referrer = pendingReferrer();
    if (!referrer) return;
    if (referrer === uid) { clearPendingReferrer(); return; }
    if (totalSolved < MIN_INVITEE_SOLVED) return;
    try {
        const [{ functions }, { httpsCallable }] = await Promise.all([
            getFirebase(), import('firebase/functions'),
        ]);
        await httpsCallable(functions, 'claimReferral')({ referrerUid: referrer });
        clearPendingReferrer();
    } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code !== 'functions/failed-precondition') clearPendingReferrer();
    }
}

/** Caller's server-verified referral count (0 on any error/absence). */
export async function fetchReferralCount(uid: string): Promise<number> {
    try {
        const [{ db }, { doc, getDoc }] = await Promise.all([
            getFirebase(), import('firebase/firestore'),
        ]);
        const snap = await getDoc(doc(db, 'referralStats', uid));
        return snap.exists() ? Number(snap.data().count ?? 0) || 0 : 0;
    } catch {
        return 0;
    }
}

/** The shareable invite link that credits `uid` when a new player joins. */
export function buildInviteUrl(uid: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://math-swipe-c7k.pages.dev';
    return `${origin}/?r=${encodeURIComponent(uid)}`;
}
