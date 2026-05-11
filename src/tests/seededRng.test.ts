import { describe, it, expect } from 'vitest';
import { createSeededRng, dateSeed, stringSeed } from '../utils/seededRng';

describe('seededRng', () => {
    describe('createSeededRng', () => {
        it('produces the same sequence for the same seed', () => {
            const a = createSeededRng(42);
            const b = createSeededRng(42);
            const seqA = Array.from({ length: 20 }, () => a());
            const seqB = Array.from({ length: 20 }, () => b());
            expect(seqA).toEqual(seqB);
        });

        it('produces different sequences for different seeds', () => {
            const a = createSeededRng(42);
            const b = createSeededRng(43);
            const seqA = Array.from({ length: 20 }, () => a());
            const seqB = Array.from({ length: 20 }, () => b());
            expect(seqA).not.toEqual(seqB);
        });

        it('produces values in [0, 1)', () => {
            const rng = createSeededRng(123);
            for (let i = 0; i < 1000; i++) {
                const v = rng();
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(1);
            }
        });

        it('passes a basic uniformity sanity check (10-bucket chi-squared rough)', () => {
            const rng = createSeededRng(7);
            const buckets = new Array(10).fill(0);
            const n = 10000;
            for (let i = 0; i < n; i++) {
                buckets[Math.floor(rng() * 10)]++;
            }
            // Each bucket should be near n/10 = 1000 ± reasonable variance
            for (const c of buckets) {
                expect(c).toBeGreaterThan(800);
                expect(c).toBeLessThan(1200);
            }
        });

        it('handles seed 0 without producing all zeros', () => {
            const rng = createSeededRng(0);
            const vals = Array.from({ length: 5 }, () => rng());
            expect(new Set(vals).size).toBeGreaterThan(1);
        });

        it('handles negative seeds', () => {
            const rng = createSeededRng(-1);
            for (let i = 0; i < 10; i++) {
                const v = rng();
                expect(v).toBeGreaterThanOrEqual(0);
                expect(v).toBeLessThan(1);
            }
        });
    });

    describe('dateSeed', () => {
        it('produces the same seed for the same date', () => {
            const d1 = new Date(2026, 4, 15);
            const d2 = new Date(2026, 4, 15);
            expect(dateSeed(d1)).toBe(dateSeed(d2));
        });

        it('produces different seeds for different days', () => {
            const d1 = new Date(2026, 4, 15);
            const d2 = new Date(2026, 4, 16);
            expect(dateSeed(d1)).not.toBe(dateSeed(d2));
        });

        it('ignores time-of-day', () => {
            const morning = new Date(2026, 4, 15, 8, 0, 0);
            const evening = new Date(2026, 4, 15, 22, 30, 45);
            expect(dateSeed(morning)).toBe(dateSeed(evening));
        });
    });

    describe('stringSeed', () => {
        it('is deterministic', () => {
            expect(stringSeed('abc')).toBe(stringSeed('abc'));
        });

        it('produces different seeds for different strings', () => {
            expect(stringSeed('abc')).not.toBe(stringSeed('abd'));
        });

        it('handles empty string', () => {
            expect(typeof stringSeed('')).toBe('number');
        });

        it('handles long strings', () => {
            const long = 'x'.repeat(10000);
            expect(typeof stringSeed(long)).toBe('number');
        });
    });
});
