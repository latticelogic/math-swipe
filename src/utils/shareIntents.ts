/**
 * utils/shareIntents.ts
 *
 * Share-payload safety. (The per-network intent-URL builders that used to
 * live here went with the ShareSheet — sharing is now direct: native OS
 * share on mobile, clipboard on desktop. Owner call 2026-07-16; see
 * docs/README.md "Sharing decisions". Git history has the builders if a
 * destination picker ever returns.)
 */

/** Repair lone surrogates instead of letting downstream consumers throw or
 *  drop the payload — a truncated emoji would otherwise turn a share button
 *  into a silent no-op (encodeURIComponent throws) or make some Android
 *  share targets discard the whole text.
 *  String.prototype.toWellFormed is ES2024 — guarded for older engines. */
export function toWellFormedText(s: string): string {
    const candidate = s as string & { toWellFormed?: () => string; isWellFormed?: () => boolean };
    if (typeof candidate.isWellFormed === 'function' && typeof candidate.toWellFormed === 'function') {
        return candidate.isWellFormed() ? s : candidate.toWellFormed();
    }
    return s;
}
