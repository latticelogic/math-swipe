import { describe, it, expect } from 'vitest';
import {
    TRIAL_DAYS, trialDaysLeft, isTrialActive, hasAccess, entitlementStatus,
    blankEntitlement, type Entitlement,
} from '../utils/entitlement';

/**
 * The double-sided referral reward: a referee gets `trialBonusDays` (server-set,
 * +3 today) added to the base 7-day window. These are the invariants the paywall
 * timing depends on — an off-by-one here either paywalls a user who was promised
 * extra days, or hands out extra free days to everyone.
 */

const DAY = 86_400_000;

function ent(daysIn: number, bonus?: number): Entitlement {
    const now = Date.now();
    return {
        ...blankEntitlement(),
        trialStartedAt: now - daysIn * DAY,
        updatedAt: now,
        ...(bonus !== undefined ? { trialBonusDays: bonus } : {}),
    };
}

describe('trialBonusDays — the referee reward', () => {
    it('base window unchanged without a bonus (day 7 = expired)', () => {
        expect(isTrialActive(ent(6).trialStartedAt)).toBe(true);
        expect(isTrialActive(ent(7).trialStartedAt)).toBe(false);
    });

    it('+3 bonus keeps the trial alive through day 9, expires day 10', () => {
        expect(hasAccess(ent(9, 3))).toBe(true);        // 7 + 3 = 10-day window
        expect(hasAccess(ent(10, 3))).toBe(false);
        expect(entitlementStatus(ent(9, 3))).toBe('trial');
        expect(entitlementStatus(ent(10, 3))).toBe('expired');
    });

    it('daysLeft counts the bonus', () => {
        const e = ent(0, 3);
        expect(trialDaysLeft(e.trialStartedAt, Date.now(), 3)).toBe(TRIAL_DAYS + 3);
    });

    it('a NEGATIVE bonus can never shorten the base window (clamped)', () => {
        expect(hasAccess(ent(5, -100))).toBe(true);
        expect(trialDaysLeft(ent(0).trialStartedAt, Date.now(), -5)).toBe(TRIAL_DAYS);
    });

    it('a missing/undefined bonus behaves exactly like 0', () => {
        expect(hasAccess(ent(6))).toBe(hasAccess(ent(6, 0)));
        expect(hasAccess(ent(7))).toBe(hasAccess(ent(7, 0)));
    });

    it('paid always wins regardless of trial/bonus state', () => {
        const e = { ...ent(50, 0), paidAt: Date.now(), source: 'apple' as const };
        expect(hasAccess(e)).toBe(true);
        expect(entitlementStatus(e)).toBe('paid');
    });
});
