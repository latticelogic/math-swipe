import { describe, it, expect } from 'vitest';
import { formatOptionValue } from '../utils/formatNumber';

describe('formatOptionValue', () => {
    it('caps non-terminating decimals at 4 places (the overflow class)', () => {
        expect(formatOptionValue(17 / 18)).toBe('0.9444'); // was 0.94444444…
        expect(formatOptionValue(1 / 3)).toBe('0.3333');
    });
    it('trims trailing zeros on short decimals', () => {
        expect(formatOptionValue(12.5)).toBe('12.5');
        expect(formatOptionValue(0.1)).toBe('0.1');
    });
    it('gives integers thousands separators', () => {
        expect(formatOptionValue(12345)).toBe('12,345');
        expect(formatOptionValue(7)).toBe('7');
    });
    it('uses compact notation for very large magnitudes', () => {
        expect(formatOptionValue(1_200_000)).toBe('1.2M');
        expect(formatOptionValue(3_000_000_000)).toBe('3B');
    });
    it('uses scientific notation for very small magnitudes', () => {
        expect(formatOptionValue(0.0000015)).toBe('1.5e-6');
    });
    it('passes through non-finite values as strings', () => {
        expect(formatOptionValue(NaN)).toBe('NaN');
        expect(formatOptionValue(Infinity)).toBe('Infinity');
    });
    it('handles negatives', () => {
        expect(formatOptionValue(-0.5)).toBe('-0.5');
        expect(formatOptionValue(-2 / 3)).toBe('-0.6667');
    });
});
