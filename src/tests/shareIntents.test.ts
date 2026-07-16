import { describe, it, expect } from 'vitest';
import { toWellFormedText } from '../utils/shareIntents';

/**
 * Share-payload safety. (The intent-URL builder tests went with the
 * ShareSheet — sharing is direct now. The well-formedness guard remains on
 * the rail share path: a lone surrogate must never silently kill a share.)
 */

const REAL_TEXT = [
    'Math Challenge Daily · Jul 16 — 139 pts, 100% , 10🔥',
    '',
    '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩',
    '',
    'Can you beat me? 👉 https://mathchallenge.app/u/EpicEagle4-uIgC',
].join('\n');

describe('toWellFormedText', () => {
    it('passes well-formed text through unchanged (same reference)', () => {
        expect(toWellFormedText(REAL_TEXT)).toBe(REAL_TEXT);
    });

    it('repairs lone surrogates into encodable text', () => {
        const repaired = toWellFormedText('oops \uD83D end');
        expect(() => encodeURIComponent(repaired)).not.toThrow();
    });

    it('emoji survive the guard losslessly', () => {
        const out = toWellFormedText(REAL_TEXT);
        expect(out).toContain('🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩');
        expect(out).toContain('10🔥');
    });
});
