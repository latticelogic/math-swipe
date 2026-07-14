/**
 * Last-known-good entitlement cache (localStorage).
 *
 * On a Firestore read failure the hook used to fall back to a *permissive*
 * trial state — which turned "reliably block the read → free access" into an
 * exploit. Instead we cache the entitlement on every successful read/write and,
 * when a read fails, fall back to the CACHED value: an expired user stays
 * expired, a paid user stays paid, a trial user keeps their real clock. We only
 * fall back to permissive when there's no cache at all (a genuine first run
 * that's also offline — where refusing access would be the worse failure).
 *
 * The cache is a hint, never authority: the server rules still gate every
 * write, so a tampered cache can't grant anything a real read wouldn't.
 */
import { safeGetItem, safeSetItem } from './safeStorage';
import type { Entitlement } from './entitlement';

const KEY = (uid: string) => `math-swipe-entitlement-cache:${uid}`;

export function cacheEntitlement(uid: string, e: Entitlement): void {
    try {
        safeSetItem(KEY(uid), JSON.stringify(e));
    } catch {
        // Best-effort — a cache miss just means we use the permissive fallback.
    }
}

export function readCachedEntitlement(uid: string): Entitlement | null {
    const raw = safeGetItem(KEY(uid));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<Entitlement>;
        // Validate the shape defensively — a corrupted blob must not crash the
        // gate or silently grant access.
        if (typeof parsed.trialStartedAt !== 'number') return null;
        return {
            trialStartedAt: parsed.trialStartedAt,
            paidAt: typeof parsed.paidAt === 'number' ? parsed.paidAt : null,
            source: (parsed.source as Entitlement['source']) ?? null,
            originalTransactionId: typeof parsed.originalTransactionId === 'string' ? parsed.originalTransactionId : null,
            updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
        };
    } catch {
        return null;
    }
}
