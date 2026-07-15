/**
 * utils/checkout.ts
 *
 * Client-side wrapper for the payment callable. Returns a hosted checkout URL
 * (Airwallex or Stripe, per VITE_PAYMENT_PROVIDER); the caller redirects the
 * browser there. Both providers' functions return the same `{ url }` shape, so
 * the redirect logic is identical.
 *
 * The "unlock now" buttons across the app (paywall, reminder modal, countdown
 * chip) all funnel through this helper so behaviour is consistent.
 *
 * In dev (`import.meta.env.DEV`) it short-circuits to a mock grant so the
 * paywall flow can be exercised without a live payment account.
 */

import { getFirebase } from './firebase';

interface CheckoutResponse {
    url: string;
}

/** Payment provider. Defaults to Airwallex (the Singapore entity's provider);
 *  set VITE_PAYMENT_PROVIDER=stripe to use the Stripe path instead. */
const PROVIDER = ((import.meta.env as Record<string, string | undefined>).VITE_PAYMENT_PROVIDER ?? 'airwallex').toLowerCase();
const CALLABLE = PROVIDER === 'stripe' ? 'createCheckoutSession' : 'createAirwallexPayment';

/**
 * Start a hosted checkout and redirect the browser to it. Throws on error so
 * the caller can surface a friendly message.
 *
 * @param mockGrant — DEV-only fallback used when no live payment account is
 *                    wired. Ignored in production builds.
 */
export async function startCheckout(mockGrant?: () => Promise<void>): Promise<void> {
    // In dev, prefer the mock path — exercising the UI, not the billing system.
    if (import.meta.env.DEV && mockGrant) {
        await mockGrant();
        return;
    }

    const [{ functions }, { httpsCallable }] = await Promise.all([
        getFirebase(), import('firebase/functions'),
    ]);
    const call = httpsCallable<unknown, CheckoutResponse>(functions, CALLABLE);
    const result = await call({});
    const url = result.data?.url;
    if (!url) throw new Error('No checkout URL returned');
    // Redirect — the hosted payment page owns the flow from here. On success it
    // returns the user to ?paywall=ok and the webhook will have written paidAt
    // by the time the page reloads.
    window.location.href = url;
}
