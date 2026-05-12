/**
 * utils/checkout.ts
 *
 * Client-side wrapper for the createCheckoutSession Cloud Function.
 * Returns a Stripe Checkout URL; the caller redirects the browser there.
 *
 * The "unlock now" buttons across the app (paywall, reminder modal,
 * countdown chip) all funnel through this helper so the redirect-or-fail
 * behavior is consistent.
 *
 * In dev (`import.meta.env.DEV`) the helper short-circuits to a mock
 * grant — useful when iterating on the paywall flow without a Stripe
 * test account. The mock path is the same one used pre-Stripe in earlier
 * phases.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

interface CheckoutResponse {
    url: string;
}

/**
 * Start a Stripe Checkout session and redirect the browser to it.
 * Throws on error so the caller can surface a friendly message.
 *
 * @param mockGrant — DEV-only fallback used when Stripe isn't wired or
 *                    the developer wants to bypass the real payment flow.
 *                    Ignored in production builds.
 */
export async function startCheckout(mockGrant?: () => Promise<void>): Promise<void> {
    // In dev, prefer the mock path — most contributors won't have a Stripe
    // test account, and the goal of running locally is to exercise the UI
    // not the billing system. The mock writes paidAt directly via the
    // entitlement hook's mockGrantAccess().
    if (import.meta.env.DEV && mockGrant) {
        await mockGrant();
        return;
    }

    const call = httpsCallable<unknown, CheckoutResponse>(functions, 'createCheckoutSession');
    const result = await call({});
    const url = result.data?.url;
    if (!url) throw new Error('No checkout URL returned');
    // Redirect — Stripe Checkout owns the page from here. On success it
    // returns the user to ?paywall=ok and the webhook will have already
    // written paidAt by the time the page reloads. On cancel they land
    // on ?paywall=cancelled and the trial/paywall state remains.
    window.location.href = url;
}
