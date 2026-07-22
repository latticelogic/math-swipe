import { describe, it, expect } from 'vitest';
import { buildSharePayload, buildSharePayloadFromArgs } from '../utils/sharePayload';

/**
 * The share payload composer — one source of truth for BOTH share surfaces
 * (SessionSummary modal + the game-rail share button). Pins the artifact
 * shape: headline with real numbers, 10-wide 🟩🟥 grid, profile-first URL.
 */

const WIN = [true, true, true, true, true, true, true, true, true, true];

describe('buildSharePayload', () => {
    it('daily headline carries the date, points and accuracy', () => {
        const { text } = buildSharePayload(139, 10, 100, WIN, 'daily');
        expect(text).toContain('Math Challenge Daily');
        expect(text).toContain('139 pts');
        expect(text).toContain('100%');
        expect(text).toContain('10🔥');
    });

    it('perfect non-daily run gets the 💯 headline with real numbers', () => {
        const { text } = buildSharePayload(87, 12, 100, WIN, 'multiply');
        expect(text).toContain('💯 87 pts, 12🔥 — perfect run');
    });

    it('normal run leads with pts · streak · accuracy', () => {
        const { text } = buildSharePayload(42, 5, 80, [true, true, false, true, true], 'divide');
        expect(text).toContain('42 pts · 5🔥 streak · 80% — Math Challenge Divide');
    });

    it('grid chunks into 10-wide rows of 🟩/🟥', () => {
        const history = [...WIN, true, false, true];
        const { text } = buildSharePayload(50, 3, 77, history, 'add');
        const rows = text.split('\n').filter(l => /^[🟩🟥]+$/u.test(l));
        expect(rows).toHaveLength(2);
        expect([...rows[0]].length).toBe(10);          // spread iterates code points
        expect(rows[1]).toBe('🟩🟥🟩');
    });

    it('uses the profile URL when given, challenge fallback otherwise', () => {
        const profile = 'https://mathchallenge.app/u/EpicEagle4-uIgC';
        expect(buildSharePayload(10, 2, 90, WIN, 'add', false, false, null, profile).url).toBe(profile);
        const fallback = buildSharePayload(10, 2, 90, WIN, 'add').url;
        expect(fallback).toContain('?c=');
    });

    it('args-object overload matches the positional call', () => {
        const a = buildSharePayloadFromArgs({
            xp: 139, streak: 10, accuracy: 100, history: WIN,
            questionType: 'daily', profileUrl: 'https://mathchallenge.app/u/x-y',
        });
        const b = buildSharePayload(139, 10, 100, WIN, 'daily', undefined, undefined, undefined, 'https://mathchallenge.app/u/x-y');
        expect(a.text).toBe(b.text);
        expect(a.url).toBe(b.url);
    });

    it('appends ?r=<uid> to a clean profile URL (invite enters circulation)', () => {
        const profile = 'https://mathchallenge.app/u/EpicEagle4-uIgC';
        const { url } = buildSharePayload(10, 2, 90, WIN, 'add', false, false, null, profile, 'abc123');
        expect(url).toBe(`${profile}?r=abc123`);
    });

    it('appends &r=<uid> when the URL already has a query (challenge fallback)', () => {
        const { url } = buildSharePayload(10, 2, 90, WIN, 'add', false, false, null, null, 'abc123');
        expect(url).toContain('?c=');
        expect(url).toMatch(/&r=abc123$/);
    });

    it('omits the referrer param without a uid, and the args overload passes it through', () => {
        expect(buildSharePayload(10, 2, 90, WIN, 'add').url).not.toContain('r=');
        const viaArgs = buildSharePayloadFromArgs({
            xp: 10, streak: 2, accuracy: 90, history: WIN, questionType: 'add',
            profileUrl: 'https://mathchallenge.app/u/x-y', referrerUid: 'zz9',
        });
        expect(viaArgs.url).toBe('https://mathchallenge.app/u/x-y?r=zz9');
    });

    it('mode tags surface in the headline (HARD / TIMED / ULTIMATE)', () => {
        expect(buildSharePayload(50, 3, 90, WIN, 'add', true, false).text).toContain('HARD');
        expect(buildSharePayload(50, 3, 90, WIN, 'add', false, true).text).toContain('TIMED');
        expect(buildSharePayload(50, 3, 90, WIN, 'add', true, true).text).toContain('ULTIMATE');
    });
});
