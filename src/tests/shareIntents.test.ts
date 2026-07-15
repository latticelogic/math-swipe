import { describe, it, expect } from 'vitest';
import { shareIntentUrl, toWellFormedText, type ShareChannel } from '../utils/shareIntents';

/**
 * Share-intent URLs are the top of the viral funnel. The regression this
 * suite pins down: WhatsApp shares reaching the composer with every emoji
 * turned into `�` (the wa.me redirect corrupts astral-plane characters), and
 * the encodeURIComponent-throws-on-lone-surrogate failure mode that turns a
 * share button into a silent no-op.
 */

// A realistic payload: headline emoji + Wordle-style grid + pointer emoji.
const REAL_TEXT = [
    'Math Challenge Daily · Jul 16 — 139 pts, 100% , 10🔥',
    '',
    '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩',
    '',
    'Can you beat me? 👉 https://mathchallenge.app/u/EpicEagle4-uIgC',
].join('\n');
const REAL_URL = 'https://mathchallenge.app/u/EpicEagle4-uIgC';

const URL_CHANNELS: ShareChannel[] = ['twitter', 'whatsapp', 'telegram', 'reddit', 'facebook', 'email'];

describe('shareIntentUrl', () => {
    it('WhatsApp goes directly to api.whatsapp.com — NEVER through wa.me (the emoji-corrupting redirect)', () => {
        const target = shareIntentUrl('whatsapp', REAL_TEXT, REAL_URL)!;
        expect(target.startsWith('https://api.whatsapp.com/send?text=')).toBe(true);
        expect(target).not.toContain('wa.me');
    });

    it('emoji survive encoding losslessly for every text-bearing channel', () => {
        for (const channel of ['twitter', 'whatsapp', 'telegram', 'email'] as ShareChannel[]) {
            const target = shareIntentUrl(channel, REAL_TEXT, REAL_URL)!;
            const textParam = new URL(target.replace(/^mailto:/, 'https://mail.invalid/')).searchParams
                .get(channel === 'email' ? 'body' : 'text');
            expect(textParam, `${channel} must carry the text param`).toBeTruthy();
            // Lossless round-trip: the grid and every emoji come back intact.
            expect(textParam).toBe(REAL_TEXT);
            expect(textParam).toContain('🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩');
            expect(textParam).toContain('10🔥');
            expect(textParam).not.toContain('�');
        }
    });

    it('encodes astral characters as proper UTF-8 percent sequences', () => {
        const target = shareIntentUrl('whatsapp', '10🔥', REAL_URL)!;
        expect(target).toContain('%F0%9F%94%A5'); // 🔥 U+1F525
    });

    it('URL-bearing channels carry the profile/challenge URL', () => {
        expect(shareIntentUrl('telegram', REAL_TEXT, REAL_URL)).toContain(encodeURIComponent(REAL_URL));
        expect(shareIntentUrl('reddit', REAL_TEXT, REAL_URL)).toContain(encodeURIComponent(REAL_URL));
        expect(shareIntentUrl('facebook', REAL_TEXT, REAL_URL)).toContain(encodeURIComponent(REAL_URL));
    });

    it('never throws on a lone surrogate (repairs instead of silently no-oping)', () => {
        const broken = 'streak \uD83D'; // truncated emoji — encodeURIComponent would throw
        for (const channel of URL_CHANNELS) {
            expect(() => shareIntentUrl(channel, broken, REAL_URL)).not.toThrow();
            expect(shareIntentUrl(channel, broken, REAL_URL)).toBeTruthy();
        }
    });
});

describe('toWellFormedText', () => {
    it('passes well-formed text through unchanged (same reference)', () => {
        expect(toWellFormedText(REAL_TEXT)).toBe(REAL_TEXT);
    });

    it('repairs lone surrogates into encodable text', () => {
        const repaired = toWellFormedText('oops \uD83D end');
        expect(() => encodeURIComponent(repaired)).not.toThrow();
    });
});
