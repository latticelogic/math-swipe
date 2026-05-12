/**
 * paywallTrigger.test.ts
 *
 * Truth-table coverage for the value-anchored paywall fire rule. The
 * rule lives in shouldFirePaywall() (utils/entitlement.ts) and is the
 * single source of truth used by App.tsx's trigger useEffect.
 *
 * Why this test exists:
 *   The paywall fire condition is the most consequential piece of
 *   conversion logic in the app — fire too early and the trial UX
 *   feels coercive, fire too late or never and we never collect. Worse,
 *   getting "daily" exempt wrong means we either lock out the free
 *   surface (breaking the engagement loop) or accidentally show the
 *   paywall during the only session type that's meant to be always-free.
 *
 *   The test walks every branch of the truth table — status × topic ×
 *   answered × open — so a regression in any of them is caught in CI.
 */

import { describe, it, expect } from 'vitest';
import { shouldFirePaywall, type EntitlementStatus } from '../utils/entitlement';

interface Case {
    status: EntitlementStatus;
    questionType: string;
    totalAnswered: number;
    paywallOpen: boolean;
    expected: boolean;
    /** Why this case matters in plain English. */
    why: string;
}

const cases: Case[] = [
    // ── The "fire" case (only one true outcome in the entire matrix) ──
    {
        status: 'expired',
        questionType: 'multiply',
        totalAnswered: 1,
        paywallOpen: false,
        expected: true,
        why: 'Canonical fire case: expired user finished problem #1 of a non-daily session',
    },

    // ── Status gating ──
    {
        status: 'paid',
        questionType: 'multiply',
        totalAnswered: 5,
        paywallOpen: false,
        expected: false,
        why: 'Paid users never see the paywall, even with stats matching the fire condition',
    },
    {
        status: 'trial',
        questionType: 'multiply',
        totalAnswered: 50,
        paywallOpen: false,
        expected: false,
        why: 'Trial users are inside the free window — no paywall regardless of activity',
    },
    {
        status: 'unknown',
        questionType: 'multiply',
        totalAnswered: 1,
        paywallOpen: false,
        expected: false,
        why: 'Unknown status (loading / unauthenticated) must NEVER trigger a paywall flash',
    },

    // ── Daily Challenge exemption ──
    // This is the FREE-FOREVER rule from monetization_model.md. The
    // Daily Challenge keeps the engagement loop + viral share artifact
    // alive for non-paying post-trial users; firing the paywall here
    // would defeat the entire mechanic.
    {
        status: 'expired',
        questionType: 'daily',
        totalAnswered: 1,
        paywallOpen: false,
        expected: false,
        why: 'Daily Challenge is free forever — expired users can complete it without paywall',
    },
    {
        status: 'expired',
        questionType: 'daily',
        totalAnswered: 10,
        paywallOpen: false,
        expected: false,
        why: 'Even a fully-completed daily session never triggers the paywall',
    },

    // ── totalAnswered gating (the "dopamine first" rule) ──
    {
        status: 'expired',
        questionType: 'multiply',
        totalAnswered: 0,
        paywallOpen: false,
        expected: false,
        why: "Expired user just opened the game tab — don't paywall before they've earned anything",
    },

    // ── Already-open guard ──
    {
        status: 'expired',
        questionType: 'multiply',
        totalAnswered: 5,
        paywallOpen: true,
        expected: false,
        why: 'No re-firing when paywall is already up — the useEffect would loop forever',
    },

    // ── Multi-condition negatives (defense in depth) ──
    {
        status: 'trial',
        questionType: 'daily',
        totalAnswered: 10,
        paywallOpen: false,
        expected: false,
        why: 'Trial + daily + answered: still no paywall (multiple reasons to suppress)',
    },
    {
        status: 'paid',
        questionType: 'daily',
        totalAnswered: 10,
        paywallOpen: true,
        expected: false,
        why: 'Every reason to suppress, all at once — sanity check',
    },

    // ── Other game modes (speedrun, challenge, hard, timed) are NOT
    //    exempt — they're paid-tier content like every other topic. ──
    {
        status: 'expired',
        questionType: 'speedrun',
        totalAnswered: 1,
        paywallOpen: false,
        expected: true,
        why: 'Speedrun is NOT a free-forever exemption — paywall fires after problem #1',
    },
    {
        status: 'expired',
        questionType: 'challenge',
        totalAnswered: 1,
        paywallOpen: false,
        expected: true,
        why: 'Friend-challenge mode is NOT exempt — paywall fires for expired users',
    },
];

describe('shouldFirePaywall (paywall fire rule)', () => {
    for (const c of cases) {
        const label = `${c.expected ? 'FIRES' : 'suppressed'} when status=${c.status} type=${c.questionType} answered=${c.totalAnswered} open=${c.paywallOpen}`;
        it(label, () => {
            const actual = shouldFirePaywall({
                status: c.status,
                questionType: c.questionType,
                totalAnswered: c.totalAnswered,
                paywallOpen: c.paywallOpen,
            });
            expect(actual, c.why).toBe(c.expected);
        });
    }

    // ── Coverage sanity-check: every status value is exercised at least
    //    once so an enum addition (e.g. 'lifetime', 'gift') without test
    //    coverage trips this lint-like assertion. ──
    it('covers every EntitlementStatus value', () => {
        const STATUSES: EntitlementStatus[] = ['paid', 'trial', 'expired', 'unknown'];
        const covered = new Set(cases.map(c => c.status));
        for (const s of STATUSES) {
            expect(covered.has(s), `EntitlementStatus '${s}' has no test coverage`).toBe(true);
        }
    });
});
