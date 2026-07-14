import { describe, it, expect } from 'vitest';
import { numberFact } from '../utils/numberFacts';

describe('numberFact', () => {
    it('returns null for numbers with nothing noteworthy', () => {
        expect(numberFact(6)).toBeNull();
        expect(numberFact(10)).toBeNull();
        expect(numberFact(14)).toBeNull();
    });

    it('names special round numbers', () => {
        expect(numberFact(12)).toMatch(/dozen/);
        expect(numberFact(144)).toMatch(/dozen dozen/);
        expect(numberFact(100)).toMatch(/century/);
    });

    it('recognises palindromes (2+ digits)', () => {
        expect(numberFact(121)).toMatch(/backwards/);
        expect(numberFact(88)).toMatch(/backwards/);
        expect(numberFact(7)).not.toMatch(/backwards/); // single digit: not a palindrome fact
    });

    it('recognises square-and-cube, cubes, squares', () => {
        expect(numberFact(64)).toMatch(/².*³|³.*²/); // 64 = 8² and 4³
        expect(numberFact(27)).toMatch(/³/);
        expect(numberFact(49)).toMatch(/perfect square/);
    });

    it('recognises primes, powers of two, factorials', () => {
        expect(numberFact(17)).toMatch(/prime/);
        expect(numberFact(32)).toMatch(/2\^5|doubling/);
        expect(numberFact(120)).toMatch(/!/); // 5!
    });

    it('rejects non-integers and negatives', () => {
        expect(numberFact(3.5)).toBeNull();
        expect(numberFact(-7)).toBeNull();
        expect(numberFact(NaN)).toBeNull();
    });
});
