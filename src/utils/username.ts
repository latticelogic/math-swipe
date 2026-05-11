/**
 * Username claims: atomic uniqueness on top of Firestore.
 *
 * Storage shape:
 *   usernames/{slug}        → { uid: string, claimedAt: serverTimestamp }
 *   users/{uid}.username    → string (the canonical slug; null until claimed)
 *
 * The slug is a lowercase, allowed-charset normalization of the displayName
 * — multiple display strings can normalize to the same slug, so we always
 * compare via `normalizeSlug`. Claims are performed in a transaction that
 * checks `usernames/{slug}` ownership before writing both docs.
 *
 * Reserved slugs (e.g. `admin`, `me`) can't be claimed even if available.
 */

import { doc, runTransaction, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const RESERVED_SLUGS = new Set([
    // Routing collisions
    'admin', 'api', 'u', 'me', 'auth', 'login', 'logout', 'signin', 'signup',
    // System / impersonation risk
    'system', 'root', 'support', 'help', 'official', 'team', 'staff',
    'mod', 'mods', 'moderator', 'mathswipe', 'math-swipe',
    // Meaningless / placeholder
    'null', 'undefined', 'none', 'anonymous', 'guest', 'user', 'player',
]);

export interface ClaimResult {
    ok: boolean;
    /** Set when ok=false. Stable codes so the UI can localize/match. */
    error?: 'invalid' | 'reserved' | 'taken' | 'too-short' | 'too-long' | 'unauthorized';
    /** The normalized slug we tried to write. */
    slug?: string;
}

/** Normalize a free-text display name into a username slug.
 *  Returns the empty string for unclaimable inputs (the caller should treat
 *  empty as 'invalid'). */
export function normalizeSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')   // strip combining marks
        .replace(/[^a-z0-9_]/g, '')        // ASCII alphanumeric + underscore only
        .slice(0, 20);
}

/** Validate a slug WITHOUT touching the network. Returns null when valid;
 *  otherwise returns the error code that `claimUsername` would return. */
export function validateSlug(slug: string): ClaimResult['error'] | null {
    if (!slug) return 'invalid';
    if (slug.length < 3) return 'too-short';
    if (slug.length > 20) return 'too-long';
    if (RESERVED_SLUGS.has(slug)) return 'reserved';
    return null;
}

/** Check if a slug is available without claiming it. Cheap single read. */
export async function isSlugAvailable(slug: string, currentUid: string | null): Promise<boolean> {
    if (validateSlug(slug)) return false;
    try {
        const snap = await getDoc(doc(db, 'usernames', slug));
        if (!snap.exists()) return true;
        // If the current user already owns it, it's "available" from their POV
        return snap.data().uid === currentUid;
    } catch {
        // Permission error or network — treat as unavailable to fail safe
        return false;
    }
}

/** Atomically claim a slug for `uid`. If `uid` previously held a different
 *  slug, the old one is released in the same transaction.
 *
 *  Anonymous users cannot claim — pass `isAnonymous` so the caller doesn't
 *  need to plumb auth state through to this function. */
export async function claimUsername(
    uid: string,
    isAnonymous: boolean,
    rawSlug: string,
): Promise<ClaimResult> {
    if (isAnonymous) return { ok: false, error: 'unauthorized' };
    const slug = normalizeSlug(rawSlug);
    const validation = validateSlug(slug);
    if (validation) return { ok: false, error: validation, slug };

    try {
        const result = await runTransaction(db, async (tx) => {
            const targetRef = doc(db, 'usernames', slug);
            const targetSnap = await tx.get(targetRef);
            if (targetSnap.exists() && targetSnap.data().uid !== uid) {
                return { ok: false, error: 'taken' as const, slug };
            }
            // Look up the user doc to find any old claim we need to release
            const userRef = doc(db, 'users', uid);
            const userSnap = await tx.get(userRef);
            const previousSlug = userSnap.exists() ? userSnap.data().username : undefined;

            // Release the old slug if it differs
            if (typeof previousSlug === 'string' && previousSlug !== slug) {
                tx.delete(doc(db, 'usernames', previousSlug));
            }
            // Claim the new slug
            tx.set(targetRef, { uid, claimedAt: serverTimestamp() });
            // Mirror the claim onto the user doc for fast read on profile load
            tx.set(userRef, { username: slug }, { merge: true });
            return { ok: true as const, slug };
        });
        return result;
    } catch (err) {
        console.warn('Claim transaction failed:', err);
        return { ok: false, error: 'taken', slug };
    }
}

/** Resolve a slug to a uid, or null if unclaimed. Uses a single get. */
export async function lookupUidBySlug(slug: string): Promise<string | null> {
    try {
        const snap = await getDoc(doc(db, 'usernames', normalizeSlug(slug)));
        if (snap.exists()) return snap.data().uid as string;
    } catch {
        // Rule rejection or network error — null tells the caller to fall
        // back to legacy displayName lookup
    }
    return null;
}
