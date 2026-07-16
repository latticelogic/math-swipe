import { describe, it, expect } from 'vitest';
import { buildProfileSlug, parseProfileSlug, profileNameCandidates } from '../utils/profileSlug';

/**
 * Regression guard for the share-loop breaker: Firebase uids are MIXED-CASE,
 * and buildProfileSlug appends `uid.slice(0,4)`, so a legacy slug's suffix can
 * contain capitals ("FK1o"). parseProfileSlug's tail test used to be
 * lowercase-only, so every share link for a capitalized-uid user resolved to
 * "Invalid profile link" (ProfilePage) and a generic OG card (edge worker).
 */
describe('parseProfileSlug', () => {
    it('parses a legacy slug whose uid suffix has UPPERCASE letters', () => {
        // The exact slug a tester reported dead.
        expect(parseProfileSlug('LuckyEagle41-FK1o')).toEqual({
            kind: 'legacy', name: 'LuckyEagle41', uidPrefix: 'fk1o',
        });
    });

    it('round-trips buildProfileSlug for a mixed-case uid; lowercased uid matches uidPrefix', () => {
        const uid = 'FK1oQ7bZx9Yr... (realistic mixed-case)'.slice(0, 28);
        const slug = buildProfileSlug('LuckyEagle41', uid);
        const parsed = parseProfileSlug(slug);
        expect(parsed?.kind).toBe('legacy');
        if (parsed?.kind === 'legacy') {
            expect(parsed.name).toBe('LuckyEagle41');
            // ProfilePage.tsx / edge worker match: uid.toLowerCase().startsWith(uidPrefix)
            expect(uid.toLowerCase().startsWith(parsed.uidPrefix)).toBe(true);
        }
    });

    it('still parses an all-lowercase legacy suffix', () => {
        expect(parseProfileSlug('BrightWolf16-abc1')).toEqual({
            kind: 'legacy', name: 'BrightWolf16', uidPrefix: 'abc1',
        });
    });

    it('parses a claimed handle (no uid suffix)', () => {
        expect(parseProfileSlug('coolhandle')).toEqual({ kind: 'handle', handle: 'coolhandle' });
    });

    it('returns null for a genuinely malformed slug', () => {
        expect(parseProfileSlug('!!')).toBeNull();
    });
});

describe('profileNameCandidates (spaced-name lookup)', () => {
    it('returns a single candidate when the name has no underscore', () => {
        expect(profileNameCandidates('BrightWolf16')).toEqual(['BrightWolf16']);
    });

    it('returns both the underscored and the spaced form for a spaced name', () => {
        // "John Smith" slugs to "John_Smith"; the stored displayName has a space.
        expect(profileNameCandidates('John_Smith')).toEqual(['John_Smith', 'John Smith']);
    });

    it('round-trips a spaced display name through build → parse → candidates', () => {
        const slug = buildProfileSlug('John Smith', 'FK1oZZZZ');
        const parsed = parseProfileSlug(slug);
        expect(parsed?.kind).toBe('legacy');
        if (parsed?.kind === 'legacy') {
            // The stored displayName ("John Smith") is one of the candidates.
            expect(profileNameCandidates(parsed.name)).toContain('John Smith');
        }
    });
});
