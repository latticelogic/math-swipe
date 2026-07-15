import { describe, it, expect } from 'vitest';
import { isPaid, type Entitlement } from '../utils/entitlement';
import { isFreeTrick, FREE_TRICK_COUNT, MAGIC_TRICKS } from '../utils/mathTricks';

function ent(over: Partial<Entitlement> = {}): Entitlement {
    return {
        trialStartedAt: Date.now(),
        paidAt: null,
        source: null,
        originalTransactionId: null,
        updatedAt: Date.now(),
        ...over,
    };
}

describe('isPaid — the Pro gate', () => {
    it('is false during an active trial (not yet paid)', () => {
        expect(isPaid(ent())).toBe(false);
    });
    it('is false when the trial has expired but unpaid', () => {
        expect(isPaid(ent({ trialStartedAt: 1 }))).toBe(false);
    });
    it('is true once paidAt is set', () => {
        expect(isPaid(ent({ paidAt: Date.now() }))).toBe(true);
    });
    it('is false for null / paidAt 0', () => {
        expect(isPaid(null)).toBe(false);
        expect(isPaid(ent({ paidAt: 0 }))).toBe(false);
    });
});

describe('isFreeTrick — the Magic Tricks free/Pro split', () => {
    it('marks exactly FREE_TRICK_COUNT tricks as free', () => {
        expect(MAGIC_TRICKS.filter(t => isFreeTrick(t.id)).length).toBe(FREE_TRICK_COUNT);
    });
    it('the free set is the easiest tricks by difficulty', () => {
        const byDifficulty = [...MAGIC_TRICKS].sort((a, b) => a.difficulty - b.difficulty);
        for (let i = 0; i < FREE_TRICK_COUNT; i++) {
            expect(isFreeTrick(byDifficulty[i].id)).toBe(true);
        }
        // The next-hardest trick is Pro.
        expect(isFreeTrick(byDifficulty[FREE_TRICK_COUNT].id)).toBe(false);
    });
    it('an unknown id is not free', () => {
        expect(isFreeTrick('does-not-exist')).toBe(false);
    });
});
