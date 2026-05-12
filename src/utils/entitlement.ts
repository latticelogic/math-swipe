/**
 * utils/entitlement.ts
 *
 * Pure helpers for the 14-day demo → $3.14 lifetime gating model.
 *
 * No Firestore, no React — this file is the single source of truth for
 * trial-length math and access decisions. Hooks and Cloud Functions both
 * import these so client and server agree on day boundaries.
 *
 * The model (from memory/monetization_model.md):
 *   - First session ever: trialStartedAt = serverTimestamp
 *   - Days 1-14 (i.e. daysIntoTrial < 14): full access
 *   - Day 15+ without purchase: paywall blocks everything
 *   - After purchase: paidAt set, hasAccess() returns true forever
 */

/** Length of the free-access window before paywall. 14 days, lifetime $3.14. */
export const TRIAL_DAYS = 14;

/** Lifetime unlock price (USD). */
export const PRICE_USD = 3.14;

/** Per-uid record stored in Firestore at entitlements/{uid}. */
export interface Entitlement {
    /** When the free-access trial started — ms since epoch.
     *  Set on the user's very first session. Never reset. */
    trialStartedAt: number;
    /** When the user purchased lifetime access — ms since epoch, or null if
     *  they haven't paid. Once set, paywall is bypassed forever. */
    paidAt: number | null;
    /** Where the purchase came from. Drives refund handling + analytics. */
    source: 'stripe' | 'apple' | 'google' | 'promo' | null;
    /** Stripe checkout session id (or store-equivalent) for refund lookups.
     *  Null when source is null or 'promo'. */
    originalTransactionId: string | null;
    /** ms since epoch — last write, used as a sanity check. */
    updatedAt: number;
}

/** Empty record used when a user has no entitlement doc yet — happens for
 *  one tick between auth-resolves and the first-session writer running. */
export function blankEntitlement(): Entitlement {
    return {
        trialStartedAt: 0,
        paidAt: null,
        source: null,
        originalTransactionId: null,
        updatedAt: 0,
    };
}

/** Days elapsed since trial start. Returns 0 if trial hasn't started yet.
 *  Floors to whole days so "day 1" is the first 24h, "day 14" is the last
 *  full day of free access, and `>= 14` means the paywall fires. */
export function daysIntoTrial(trialStartedAt: number, now: number = Date.now()): number {
    if (!trialStartedAt || trialStartedAt > now) return 0;
    return Math.floor((now - trialStartedAt) / 86_400_000);
}

/** Whole days remaining in the trial, never negative. Used by the
 *  countdown chip and reminder copy. */
export function trialDaysLeft(trialStartedAt: number, now: number = Date.now()): number {
    return Math.max(0, TRIAL_DAYS - daysIntoTrial(trialStartedAt, now));
}

/** True if the user is currently inside the free-access window. */
export function isTrialActive(trialStartedAt: number, now: number = Date.now()): boolean {
    if (!trialStartedAt) return false;
    return daysIntoTrial(trialStartedAt, now) < TRIAL_DAYS;
}

/** Single source of truth for "is the app unlocked for this user".
 *  Paywall component asks this; everything else flows from it. */
export function hasAccess(e: Entitlement | null, now: number = Date.now()): boolean {
    if (!e) return false;
    if (e.paidAt && e.paidAt > 0) return true;
    return isTrialActive(e.trialStartedAt, now);
}

/** Granular status for UI branching. Order of precedence: paid → trial → expired. */
export type EntitlementStatus = 'paid' | 'trial' | 'expired' | 'unknown';

export function entitlementStatus(e: Entitlement | null, now: number = Date.now()): EntitlementStatus {
    if (!e || !e.trialStartedAt) return 'unknown';
    if (e.paidAt && e.paidAt > 0) return 'paid';
    if (isTrialActive(e.trialStartedAt, now)) return 'trial';
    return 'expired';
}

/** Inputs to the paywall fire decision. Mirrors what App.tsx's trigger
 *  useEffect tracks. Extracted as a pure function so the logic is unit-
 *  testable without React state. */
export interface PaywallTriggerInputs {
    /** Resolved entitlement status. Only 'expired' is a candidate for firing. */
    status: EntitlementStatus;
    /** Current questionType. 'daily' is exempt — Daily Challenge stays free
     *  forever even post-trial (see monetization_model.md). */
    questionType: string;
    /** Problems answered in the current session. We require >=1 so the user
     *  earns at least one dopamine hit before the paywall arrives. */
    totalAnswered: number;
    /** Is the paywall already open? Avoids re-firing on every render. */
    paywallOpen: boolean;
}

/** Value-anchored paywall fire rule. Returns true iff:
 *    • the user's trial has expired AND
 *    • they're not on the daily-challenge (which stays free) AND
 *    • they've completed at least one non-daily problem in this session AND
 *    • the paywall isn't already showing
 *
 *  Single source of truth — App.tsx's trigger useEffect calls this so
 *  there can't be drift. The truth-table test in paywallTrigger.test.ts
 *  asserts every branch. */
export function shouldFirePaywall(inputs: PaywallTriggerInputs): boolean {
    if (inputs.status !== 'expired') return false;
    if (inputs.questionType === 'daily') return false;
    if (inputs.totalAnswered < 1) return false;
    if (inputs.paywallOpen) return false;
    return true;
}
