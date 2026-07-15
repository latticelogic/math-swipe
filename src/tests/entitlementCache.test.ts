import { describe, it, expect, beforeEach } from 'vitest';
import { cacheEntitlement, readCachedEntitlement } from '../utils/entitlementCache';
import type { Entitlement } from '../utils/entitlement';

const EXPIRED: Entitlement = {
    trialStartedAt: 1_600_000_000_000, // long ago → expired
    paidAt: null,
    source: null,
    originalTransactionId: null,
    updatedAt: 1_600_000_100_000,
};

describe('entitlementCache', () => {
    beforeEach(() => localStorage.clear());

    it('round-trips a cached entitlement', () => {
        cacheEntitlement('alice', EXPIRED);
        expect(readCachedEntitlement('alice')).toEqual(EXPIRED);
    });

    it('is per-uid (one user cannot read another cache)', () => {
        cacheEntitlement('alice', EXPIRED);
        expect(readCachedEntitlement('bob')).toBeNull();
    });

    it('returns null (never a permissive grant) for a missing cache', () => {
        expect(readCachedEntitlement('nobody')).toBeNull();
    });

    it('returns null for a corrupted blob rather than crashing or granting', () => {
        localStorage.setItem('math-swipe-entitlement-cache:alice', '{not json');
        expect(readCachedEntitlement('alice')).toBeNull();
        localStorage.setItem('math-swipe-entitlement-cache:alice', '{"paidAt":123}'); // no trialStartedAt
        expect(readCachedEntitlement('alice')).toBeNull();
    });

    it('preserves a paid entitlement through the cache', () => {
        const paid: Entitlement = { ...EXPIRED, paidAt: 1_700_000_000_000, source: 'airwallex', originalTransactionId: 'cs_1' };
        cacheEntitlement('alice', paid);
        expect(readCachedEntitlement('alice')?.paidAt).toBe(1_700_000_000_000);
    });
});
