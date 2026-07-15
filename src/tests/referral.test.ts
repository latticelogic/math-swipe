import { describe, it, expect, beforeEach } from 'vitest';
import { buildInviteUrl, capturePendingReferrer, pendingReferrer } from '../utils/referral';

describe('buildInviteUrl', () => {
    it('appends ?r=<uid> to the origin', () => {
        const url = buildInviteUrl('abc123');
        expect(url).toContain('?r=abc123');
        expect(url.startsWith(window.location.origin)).toBe(true);
    });

    it('encodes uids with URL-special characters', () => {
        expect(buildInviteUrl('a b/c')).toContain('?r=a%20b%2Fc');
    });
});

describe('referral capture (first-touch)', () => {
    beforeEach(() => {
        localStorage.clear();
        window.history.replaceState({}, '', '/');
    });

    it('captures ?r= into pending', () => {
        window.history.replaceState({}, '', '/?r=friend1');
        capturePendingReferrer();
        expect(pendingReferrer()).toBe('friend1');
    });

    it('does not overwrite an existing pending code (first-touch wins)', () => {
        window.history.replaceState({}, '', '/?r=friend1');
        capturePendingReferrer();
        window.history.replaceState({}, '', '/?r=friend2');
        capturePendingReferrer();
        expect(pendingReferrer()).toBe('friend1');
    });

    it('is a no-op with no ?r= param', () => {
        capturePendingReferrer();
        expect(pendingReferrer()).toBeNull();
    });

    it('ignores absurdly long codes', () => {
        window.history.replaceState({}, '', '/?r=' + 'x'.repeat(200));
        capturePendingReferrer();
        expect(pendingReferrer()).toBeNull();
    });
});
