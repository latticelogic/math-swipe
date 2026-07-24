import { describe, it, expect } from 'vitest';

/**
 * Docs anti-drift guard. The docs/ set grows as the app does, and a stale or
 * incomplete index is how docs rot silently (a doc added without an index row,
 * or a deleted doc still linked). This makes docs/README.md's completeness a
 * CI-enforced invariant instead of a discipline:
 *   - every docs/*.md (except README itself) is linked from the index
 *   - the index has no links to docs that no longer exist
 * See the "docs discipline" convention in CLAUDE.md.
 *
 * Uses Vite's import.meta.glob (?raw) rather than node:fs so it typechecks
 * under the browser tsconfig like every other test.
 */

const MD = import.meta.glob('../../docs/*.md', {
    query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

const fileName = (path: string) => path.split('/').pop() as string;
const README = Object.entries(MD).find(([p]) => fileName(p) === 'README.md')?.[1] ?? '';
const docNames = Object.keys(MD).map(fileName).filter(f => f !== 'README.md').sort();

describe('docs/README.md index', () => {
    it('finds the index + some docs (glob wired correctly)', () => {
        expect(README).not.toBe('');
        expect(docNames.length).toBeGreaterThan(5);
    });

    it('links every docs/*.md (no un-indexed docs)', () => {
        const missing = docNames.filter(f => !README.includes(`(${f})`));
        expect(missing, `these docs exist but are not in docs/README.md: ${missing.join(', ')}`).toEqual([]);
    });

    it('has no index links to docs that were deleted', () => {
        const present = new Set(docNames);
        const linked = [...README.matchAll(/\]\(([a-z0-9-]+\.md)\)/gi)].map(m => m[1]);
        const dangling = [...new Set(linked)].filter(f => f !== 'README.md' && !present.has(f));
        expect(dangling, `index links docs that no longer exist: ${dangling.join(', ')}`).toEqual([]);
    });
});
