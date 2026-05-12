import { describe, it, expect } from 'vitest';
import {
    TRIAL_DAYS, blankEntitlement, daysIntoTrial, trialDaysLeft,
    isTrialActive, hasAccess, entitlementStatus, type Entitlement,
} from '../utils/entitlement';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 4, 1); // Arbitrary fixed reference moment

function fresh(overrides: Partial<Entitlement> = {}): Entitlement {
    return { ...blankEntitlement(), trialStartedAt: T0, ...overrides };
}

describe('entitlement helpers', () => {
    describe('daysIntoTrial', () => {
        it('returns 0 when trial hasnt started', () => {
            expect(daysIntoTrial(0, T0)).toBe(0);
        });

        it('returns 0 within the first 24 hours', () => {
            expect(daysIntoTrial(T0, T0)).toBe(0);
            expect(daysIntoTrial(T0, T0 + DAY - 1)).toBe(0);
        });

        it('returns 1 at the 24h mark', () => {
            expect(daysIntoTrial(T0, T0 + DAY)).toBe(1);
        });

        it('returns 14 on day 15 (boundary where paywall fires)', () => {
            expect(daysIntoTrial(T0, T0 + 14 * DAY)).toBe(14);
        });

        it('handles a trialStartedAt in the future gracefully (clock skew)', () => {
            expect(daysIntoTrial(T0 + DAY, T0)).toBe(0);
        });
    });

    describe('trialDaysLeft', () => {
        it('reports full days at trial start', () => {
            expect(trialDaysLeft(T0, T0)).toBe(TRIAL_DAYS);
        });

        it('counts down by whole days', () => {
            expect(trialDaysLeft(T0, T0 + DAY)).toBe(13);
            expect(trialDaysLeft(T0, T0 + 7 * DAY)).toBe(7);
            expect(trialDaysLeft(T0, T0 + 13 * DAY)).toBe(1);
        });

        it('clamps to 0 once trial is over (never negative)', () => {
            expect(trialDaysLeft(T0, T0 + 14 * DAY)).toBe(0);
            expect(trialDaysLeft(T0, T0 + 100 * DAY)).toBe(0);
        });
    });

    describe('isTrialActive', () => {
        it('false when trial hasnt started', () => {
            expect(isTrialActive(0, T0)).toBe(false);
        });

        it('true through day 14 (last full free day)', () => {
            expect(isTrialActive(T0, T0)).toBe(true);
            expect(isTrialActive(T0, T0 + 13 * DAY + DAY - 1)).toBe(true);
        });

        it('false at day 15 (paywall threshold)', () => {
            expect(isTrialActive(T0, T0 + 14 * DAY)).toBe(false);
            expect(isTrialActive(T0, T0 + 100 * DAY)).toBe(false);
        });
    });

    describe('hasAccess', () => {
        it('false for null entitlement', () => {
            expect(hasAccess(null, T0)).toBe(false);
        });

        it('false when trial hasnt started and not paid', () => {
            expect(hasAccess(blankEntitlement(), T0)).toBe(false);
        });

        it('true during the trial window', () => {
            expect(hasAccess(fresh(), T0 + 5 * DAY)).toBe(true);
        });

        it('false after trial expires without payment', () => {
            expect(hasAccess(fresh(), T0 + 15 * DAY)).toBe(false);
        });

        it('true forever once paidAt is set, even after trial expires', () => {
            const paid = fresh({ paidAt: T0 + 3 * DAY, source: 'stripe' });
            expect(hasAccess(paid, T0 + 1000 * DAY)).toBe(true);
        });

        it('paid status bypasses the expired check', () => {
            // Edge case: payment recorded AFTER trial expired (user paid late)
            const latePayer = fresh({ paidAt: T0 + 30 * DAY, source: 'stripe' });
            expect(hasAccess(latePayer, T0 + 100 * DAY)).toBe(true);
        });
    });

    describe('entitlementStatus', () => {
        it('unknown when entitlement is null or has no trial start', () => {
            expect(entitlementStatus(null, T0)).toBe('unknown');
            expect(entitlementStatus(blankEntitlement(), T0)).toBe('unknown');
        });

        it('trial during the free window', () => {
            expect(entitlementStatus(fresh(), T0 + 5 * DAY)).toBe('trial');
        });

        it('expired after day 14 without payment', () => {
            expect(entitlementStatus(fresh(), T0 + 14 * DAY)).toBe('expired');
        });

        it('paid takes precedence over trial state', () => {
            const paid = fresh({ paidAt: T0 + DAY, source: 'stripe' });
            expect(entitlementStatus(paid, T0 + 100 * DAY)).toBe('paid');
            expect(entitlementStatus(paid, T0 + 5 * DAY)).toBe('paid');
        });
    });
});
