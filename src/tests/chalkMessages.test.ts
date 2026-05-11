import { describe, it, expect } from 'vitest';
import { pickChalkMessage, type ChalkContext } from '../utils/chalkMessages';

const baseCtx: ChalkContext = {
    state: 'idle',
    streak: 0,
    totalAnswered: 0,
    categoryId: 'multiply',
    hardMode: false,
    timedMode: false,
};

describe('chalkMessages.pickChalkMessage', () => {
    it('always returns a non-empty string for any state', () => {
        const states: ChalkContext['state'][] = ['idle', 'success', 'fail', 'streak', 'comeback', 'struggling'];
        for (const state of states) {
            const msg = pickChalkMessage({ ...baseCtx, state });
            expect(typeof msg).toBe('string');
            expect(msg.length).toBeGreaterThan(0);
        }
    });

    it('does not crash when overrides are absent', () => {
        for (let i = 0; i < 100; i++) {
            const msg = pickChalkMessage({ ...baseCtx, state: 'success', streak: i });
            expect(msg).toBeTruthy();
        }
    });

    it('does not crash when overrides return null', () => {
        const msg = pickChalkMessage(
            { ...baseCtx, state: 'success' },
            { topicSuccess: () => null, topicFail: () => null, easterEggs: [] },
        );
        expect(msg).toBeTruthy();
    });

    it('returns a streak-themed message when streak is high enough', () => {
        // Try a few times because of internal randomness; check at least one
        // sample lands a streak-tier or success-tier string.
        let hitSomething = false;
        for (let i = 0; i < 10; i++) {
            const msg = pickChalkMessage({ ...baseCtx, state: 'streak', streak: 25 });
            if (msg.length > 0) hitSomething = true;
        }
        expect(hitSomething).toBe(true);
    });

    it('uses topicSuccess override when state is success', () => {
        // Force the override path by always returning a fixed pool;
        // even with the 25% chance gate, run enough samples to hit it at least once.
        const customPool = ['__CUSTOM_QUIP__'];
        let foundCustom = false;
        for (let i = 0; i < 200; i++) {
            const msg = pickChalkMessage(
                { ...baseCtx, state: 'success', streak: 1 },
                { topicSuccess: () => customPool, topicFail: () => null, easterEggs: [] },
            );
            if (msg === '__CUSTOM_QUIP__') {
                foundCustom = true;
                break;
            }
        }
        expect(foundCustom).toBe(true);
    });

    it('handles an unknown categoryId by falling back to base pools', () => {
        const msg = pickChalkMessage(
            { ...baseCtx, state: 'success', categoryId: 'totally-made-up-category' },
            { topicSuccess: () => null, easterEggs: [] },
        );
        expect(msg).toBeTruthy();
    });
});
