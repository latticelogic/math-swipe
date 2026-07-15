/**
 * utils/shareIntents.ts
 *
 * Share-intent URL builders for the ShareSheet's third-party channels.
 * Extracted from the component so the URL construction is unit-testable —
 * this is the top of the viral funnel, and a mangled payload here quietly
 * kills the growth loop (see the WhatsApp note below).
 *
 * Robustness rules:
 *
 *  1. WhatsApp links go DIRECTLY to `api.whatsapp.com/send` — NOT `wa.me`.
 *     wa.me answers with a redirect that re-encodes the `text` param and
 *     corrupts astral-plane characters (every emoji: the 🟩🟥 grid, 🔥, 👉)
 *     into invalid UTF-8, which WhatsApp renders as `�`. Observed live on
 *     desktop Chrome 2026-07-16. api.whatsapp.com/send is the same
 *     interstitial wa.me lands on, minus the lossy hop.
 *
 *  2. Every payload passes through toWellFormed() before encoding. A lone
 *     surrogate (e.g. from any future truncation upstream) makes
 *     encodeURIComponent THROW, which would turn the share button into a
 *     silent no-op inside ShareSheet's try/catch.
 */

export type ShareChannel = 'twitter' | 'whatsapp' | 'telegram' | 'reddit' | 'facebook' | 'email';

/** Repair lone surrogates instead of letting encodeURIComponent throw.
 *  String.prototype.toWellFormed is ES2024 — guarded for older engines. */
export function toWellFormedText(s: string): string {
    const candidate = s as string & { toWellFormed?: () => string; isWellFormed?: () => boolean };
    if (typeof candidate.isWellFormed === 'function' && typeof candidate.toWellFormed === 'function') {
        return candidate.isWellFormed() ? s : candidate.toWellFormed();
    }
    return s;
}

/** Build the third-party intent URL for a channel, or null when the channel
 *  has no URL-based flow (native/copy/download are handled in the sheet). */
export function shareIntentUrl(channel: ShareChannel, rawText: string, rawUrl: string): string | null {
    const text = toWellFormedText(rawText);
    const url = toWellFormedText(rawUrl);
    const encText = encodeURIComponent(text);
    const encUrl = encodeURIComponent(url);
    switch (channel) {
        case 'twitter': return `https://twitter.com/intent/tweet?text=${encText}`;
        // Direct endpoint on purpose — see header note (1). wa.me is a trap.
        case 'whatsapp': return `https://api.whatsapp.com/send?text=${encText}`;
        case 'telegram': return `https://t.me/share/url?url=${encUrl}&text=${encText}`;
        case 'reddit': return `https://www.reddit.com/submit?url=${encUrl}&title=${encodeURIComponent('Beat my Math Challenge streak?')}`;
        case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
        case 'email': return `mailto:?subject=${encodeURIComponent('Beat my Math Challenge streak')}&body=${encText}`;
        default: return null;
    }
}
