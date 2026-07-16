/**
 * Profile-slug utilities.
 *
 * The slug shape is `<displayName>-<uid.slice(0,4)>`. The 4-char uid suffix
 * lets us disambiguate two players who happened to pick the same display
 * name without forcing a global username uniqueness scheme.
 *
 * Lives outside ProfilePage.tsx because the share-card builder also needs
 * `buildProfileSlug` and Vite Fast Refresh requires component files to
 * export only components.
 */

/** Build a profile URL slug.
 *  - Prefer a claimed `handle` when present — clean URL, no uid suffix.
 *  - Otherwise fall back to `<encodedDisplayName>-<uid.slice(0,4)>` so
 *    deduplication still works for unclaimed names. */
export function buildProfileSlug(displayName: string, uid: string, handle?: string | null): string {
    if (handle) return handle;
    const cleanName = displayName.replace(/\s+/g, '_');
    return `${encodeURIComponent(cleanName)}-${uid.slice(0, 4)}`;
}

/** Parsed slug shape:
 *  - `{ kind: 'handle', handle }` for `/u/somehandle`
 *  - `{ kind: 'legacy', name, uidPrefix }` for `/u/Some_Name-abc1`
 *  Returns null only if the slug is malformed beyond either shape. */
export type ParsedSlug =
    | { kind: 'handle'; handle: string }
    | { kind: 'legacy'; name: string; uidPrefix: string };

/** displayName values to query for a legacy slug's parsed name.
 *
 *  buildProfileSlug maps spaces → '_' (`displayName.replace(/\s+/g, '_')`),
 *  which is LOSSY — a stored name with spaces ("John Smith") slugs to
 *  "John_Smith", so an exact `displayName == "John_Smith"` query misses it.
 *  We query BOTH the parsed name and its '_'→space form (deduped), which
 *  recovers spaced names WITHOUT breaking names that contain a literal
 *  underscore (the parsed form is always tried too). Firestore `in`/`IN`
 *  takes 1–10 values and needs no composite index for a single field. */
export function profileNameCandidates(name: string): string[] {
    const spaced = name.replace(/_/g, ' ');
    return spaced === name ? [name] : [name, spaced];
}

export function parseProfileSlug(slug: string): ParsedSlug | null {
    const i = slug.lastIndexOf('-');
    // Heuristic for legacy `name-uid4`: the substring AFTER the last `-` must
    // look like a uid prefix (3-8 lowercase alphanum chars). Anything else
    // (including handles that happen to contain `-`, of which we have none
    // because the slug normalizer strips dashes) is treated as a handle.
    if (i >= 1 && i < slug.length - 1) {
        const tail = slug.slice(i + 1);
        // Firebase uids are MIXED-CASE, so `buildProfileSlug`'s `uid.slice(0,4)`
        // suffix can contain capitals (e.g. "FK1o"). The tail test must accept
        // them — matching is case-insensitive downstream (both this uidPrefix
        // and the compared uid are lowercased). A lowercase-only test here made
        // every share link for a capitalized-uid user resolve to "Invalid
        // profile link" — the whole viral loop, silently broken.
        if (/^[a-zA-Z0-9]{3,8}$/.test(tail)) {
            const name = decodeURIComponent(slug.slice(0, i));
            return { kind: 'legacy', name, uidPrefix: tail.toLowerCase() };
        }
    }
    // Pure-handle form. Mirror normalizeSlug's allow-list so what URL-routes
    // can never claim and `claimUsername` are 1:1 consistent.
    const handle = slug.toLowerCase();
    if (/^[a-z0-9_]{3,20}$/.test(handle)) {
        return { kind: 'handle', handle };
    }
    return null;
}
