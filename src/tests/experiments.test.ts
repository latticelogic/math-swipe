import { describe, it, expect } from 'vitest';
import { getVariant, stableId, EXPERIMENTS } from '../utils/experiments';

/**
 * A/B assignment must be deterministic (same player → same variant, forever),
 * respect the active kill-switch, and split roughly by weight. These are the
 * invariants a real experiment's validity depends on.
 *
 * `paywall-cta` is ARMED (active:true) as of 2026-07-23. Assignment is a pure
 * function of the registry entry, so tests that need a specific active state
 * flip the entry around the assertion (mutable registry) and restore it.
 */

describe('getVariant — determinism + kill switch', () => {
    it('returns control for an unknown experiment', () => {
        expect(getVariant('does-not-exist', 'user-1')).toBe('control');
    });

    it('returns control while the experiment is inactive (kill switch)', () => {
        // Temporarily disable paywall-cta to exercise the kill switch.
        const exp = EXPERIMENTS.find(e => e.id === 'paywall-cta')!;
        const original = exp.active;
        (exp as { active: boolean }).active = false;
        try {
            const seen = new Set<string>();
            for (let i = 0; i < 50; i++) seen.add(getVariant('paywall-cta', `user-${i}`));
            expect([...seen]).toEqual(['control']);
        } finally {
            (exp as { active: boolean }).active = original;
        }
    });

    it('is stable: the same uid always maps to the same variant', () => {
        for (const uid of ['abc', 'z9', 'EpicEagle4']) {
            const first = getVariant('paywall-cta', uid);
            for (let i = 0; i < 20; i++) {
                expect(getVariant('paywall-cta', uid)).toBe(first);
            }
        }
    });
});

describe('weighted assignment (via a locally-activated experiment)', () => {
    // Temporarily activate paywall-cta to exercise the split. The registry is
    // a mutable array of objects; flip + restore around the assertions.
    const exp = EXPERIMENTS.find(e => e.id === 'paywall-cta')!;

    it('splits ~50/50 across many distinct ids and stays deterministic', () => {
        const original = exp.active;
        (exp as { active: boolean }).active = true;
        try {
            const counts: Record<string, number> = { control: 0, bold: 0 };
            const N = 4000;
            for (let i = 0; i < N; i++) {
                const v = getVariant('paywall-cta', `player-${i}`);
                counts[v] = (counts[v] ?? 0) + 1;
                // deterministic on repeat
                expect(getVariant('paywall-cta', `player-${i}`)).toBe(v);
            }
            // 50/50 with weight 1:1 — allow a generous band for hash variance.
            expect(counts.control / N).toBeGreaterThan(0.4);
            expect(counts.control / N).toBeLessThan(0.6);
            expect(counts.control + counts.bold).toBe(N);
        } finally {
            (exp as { active: boolean }).active = original;
        }
    });
});

describe('stableId', () => {
    it('uses the uid when signed in', () => {
        expect(stableId('user-42')).toBe('user-42');
    });

    it('is stable per device when anonymous', () => {
        const a = stableId(null);
        const b = stableId(null);
        expect(a).toBe(b);
    });
});
