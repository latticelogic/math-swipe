import { describe, it, expect } from 'vitest';
import { SWIPE_TRAILS, isReferralTrailUnlocked } from '../utils/trails';

/**
 * The Beacon trail is the referral-conversion exclusive: unlocked ONLY when a
 * friend the player invited went on to BUY the game (server-verified
 * `referralStats/{uid}.converted`). Never purchasable, never Pro-gated —
 * these tests pin that contract so a picker refactor can't quietly turn it
 * into another Pro cosmetic.
 */

describe('Beacon trail (referral-conversion exclusive)', () => {
    const beacon = SWIPE_TRAILS.find(t => t.id === 'beacon')!;

    it('exists in the catalog and is NOT pro-gated', () => {
        expect(beacon).toBeDefined();
        expect(beacon.pro).toBeUndefined();
        expect(beacon.referralConversionsMin).toBe(1);
    });

    it('unlocks at one converted referral, not before', () => {
        expect(isReferralTrailUnlocked(beacon, 0)).toBe(false);
        expect(isReferralTrailUnlocked(beacon, 1)).toBe(true);
        expect(isReferralTrailUnlocked(beacon, 3)).toBe(true);
    });

    it('the predicate never unlocks non-referral trails', () => {
        for (const trail of SWIPE_TRAILS.filter(t => !t.referralConversionsMin)) {
            expect(isReferralTrailUnlocked(trail, 99)).toBe(false);
        }
    });

    it('is the only referral-reward trail (one cosmetic money cannot buy)', () => {
        expect(SWIPE_TRAILS.filter(t => t.referralConversionsMin).map(t => t.id)).toEqual(['beacon']);
    });
});
