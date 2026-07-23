/**
 * utils/checkout.ts
 *
 * Channel-aware purchase routing. One product everywhere — the $3.14 lifetime
 * unlock — but HOW it's bought depends on the distribution channel:
 *
 *   web  → Airwallex hosted checkout (callable returns a URL, browser redirects)
 *   twa  → Google Play Billing via the Digital Goods API + PaymentRequest.
 *          Google Play policy (and doubly the Families program this kids' app
 *          sits in) forbids external payment flows inside the Android app, so
 *          the Airwallex path must never render there.
 *   none → Android app but Play Billing unavailable (ancient Chrome, or the
 *          TWA was built without the playBilling feature). We can't legally
 *          sell here at all — the paywall shows a neutral no-purchase notice.
 *
 * Entitlement stays source-agnostic: the web webhook writes source:'airwallex',
 * the Play path writes source:'google' via the verifyPlayPurchase callable.
 * The client gates (hasAccess/isPaid) never care which.
 *
 * The "unlock now" buttons across the app (paywall, reminder modal, countdown
 * chip, Pro-lock taps) all funnel through startCheckout() so the behavior is
 * consistent. In dev (`import.meta.env.DEV`) it short-circuits to a mock grant
 * so the flow can be exercised without a live payment account.
 */

import { getFirebase } from './firebase';
import { isAndroidApp } from './channel';

/** Play Billing product id for the one-time lifetime unlock. Must match the
 *  in-app product created in Play Console → Monetize → Products. */
export const PLAY_SKU = 'pro_lifetime';

/** The Digital Goods API payment method for Google Play. */
const PLAY_BILLING_METHOD = 'https://play.google.com/billing';

export type PurchaseChannel = 'web' | 'play' | 'none';

interface CheckoutResponse {
    url: string;
}

// ── Digital Goods API (not yet in lib.dom) ─────────────────────────────────
interface DigitalGoodsService {
    getDetails(itemIds: string[]): Promise<{ itemId: string; title: string; price: { currency: string; value: string } }[]>;
    listPurchases(): Promise<{ itemId: string; purchaseToken: string }[]>;
}
type DGWindow = Window & {
    getDigitalGoodsService?: (method: string) => Promise<DigitalGoodsService>;
};

// ── Channel diagnostics (TEMP — internal Play Billing debugging) ────────────
// When the TWA reports "Purchases aren't available", we need to know WHY:
// is the Digital Goods API missing entirely (device Chrome/WebView too old),
// or present-but-not-connecting (Play Billing propagation / product config)?
// probePlayService records that distinction so the paywall can show it during
// internal testing. REMOVE (or gate off) `SHOW_CHANNEL_DIAG` in Paywall.tsx
// before promoting to production — see the note there.
export interface ChannelDiagnostic {
    isAndroid: boolean;
    channel: PurchaseChannel;
    /** window.getDigitalGoodsService is a function (API injected by Chrome). */
    dgaPresent: boolean;
    /** Error from getDigitalGoodsService(billing) if it threw every retry. */
    dgaError: string | null;
    /** Chrome/Chromium major.version from the UA (DGA needs ~101+). */
    chrome: string | null;
    paymentRequest: boolean;
}

let lastDiagnostic: ChannelDiagnostic | null = null;
export function getLastChannelDiagnostic(): ChannelDiagnostic | null {
    return lastDiagnostic;
}

function chromeVersion(): string | null {
    const m = /Chrom(?:e|ium)\/([\d.]+)/.exec(navigator.userAgent);
    return m ? m[1] : null;
}

/** One-line readout of the last channel probe, for on-screen diagnostics. */
export function formatChannelDiagnostic(d: ChannelDiagnostic | null): string {
    if (!d) return 'channel: not probed yet';
    const parts = [
        d.isAndroid ? 'twa' : 'web',
        `ch:${d.channel}`,
        `DGA:${d.isAndroid ? (d.dgaPresent ? 'present' : 'ABSENT') : 'n/a'}`,
    ];
    if (d.dgaError) parts.push(`err:${d.dgaError}`);
    parts.push(`Chrome:${d.chrome ?? '?'}`, `PR:${d.paymentRequest ? 'y' : 'n'}`);
    return parts.join(' · ');
}

async function probePlayService(retries = 3): Promise<{ service: DigitalGoodsService | null; present: boolean; error: string | null }> {
    const w = window as DGWindow;
    if (typeof w.getDigitalGoodsService !== 'function') {
        // API not injected at all → Chrome/WebView too old, or not a verified TWA.
        return { service: null, present: false, error: null };
    }
    let lastErr: string | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const svc = await w.getDigitalGoodsService(PLAY_BILLING_METHOD);
            return { service: svc, present: true, error: null };
        } catch (e) {
            // The API is present but the Play Billing service isn't connected
            // yet — transient right after launch (longer for a freshly-published
            // app whose product hasn't propagated). Retry a few times; the
            // caller also re-probes when the paywall opens.
            lastErr = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
            if (attempt < retries - 1) await new Promise(r => setTimeout(r, 400));
        }
    }
    return { service: null, present: true, error: lastErr };
}

async function getPlayService(): Promise<DigitalGoodsService | null> {
    return (await probePlayService()).service;
}

/**
 * Resolve which purchase flow this session must use. Cached per call site is
 * unnecessary — the check is cheap and the answer can change (e.g. service
 * worker update mid-session is a non-event, but keep it simple and honest).
 * Records a ChannelDiagnostic as a side effect (see getLastChannelDiagnostic).
 */
export async function getPurchaseChannel(): Promise<PurchaseChannel> {
    if (!isAndroidApp()) {
        lastDiagnostic = {
            isAndroid: false, channel: 'web', dgaPresent: false,
            dgaError: null, chrome: chromeVersion(),
            paymentRequest: typeof PaymentRequest === 'function',
        };
        return 'web';
    }
    const probe = await probePlayService();
    const channel: PurchaseChannel = probe.service ? 'play' : 'none';
    lastDiagnostic = {
        isAndroid: true, channel, dgaPresent: probe.present,
        dgaError: probe.error, chrome: chromeVersion(),
        paymentRequest: typeof PaymentRequest === 'function',
    };
    return channel;
}

/** Server-side verification + grant. Throws if the function rejects. */
async function verifyWithServer(purchaseToken: string): Promise<void> {
    const [{ functions }, { httpsCallable }] = await Promise.all([
        getFirebase(), import('firebase/functions'),
    ]);
    const call = httpsCallable(functions, 'verifyPlayPurchase');
    await call({ sku: PLAY_SKU, purchaseToken });
}

/** Google Play purchase via PaymentRequest + Digital Goods API. */
async function startPlayPurchase(): Promise<void> {
    const request = new PaymentRequest(
        [{ supportedMethods: PLAY_BILLING_METHOD, data: { sku: PLAY_SKU } }],
        // Play ignores the total (price comes from the Play product), but the
        // PaymentRequest constructor requires one.
        { total: { label: 'Total', amount: { currency: 'USD', value: '0' } } },
    );
    const response = await request.show();
    try {
        const { purchaseToken } = (response.details ?? {}) as { purchaseToken?: string };
        if (!purchaseToken) throw new Error('No purchase token from Play Billing');
        // Verify + grant + acknowledge on the server BEFORE completing the UI
        // flow — if verification fails, Play auto-refunds unacknowledged
        // purchases within 3 days, so the user is never silently charged.
        await verifyWithServer(purchaseToken);
        await response.complete('success');
    } catch (err) {
        await response.complete('fail');
        throw err;
    }
}

/**
 * Restore prior Play purchases (reinstall, new device, or Play Pass grant).
 * Called once at boot inside the Android app. Best-effort: any hit is
 * verified server-side, which writes paidAt → useEntitlement picks it up.
 * Returns true if a purchase was found and verified.
 */
export async function restorePlayPurchases(): Promise<boolean> {
    if (!isAndroidApp()) return false;
    try {
        const service = await getPlayService();
        if (!service) return false;
        const purchases = await service.listPurchases();
        const pro = purchases.find(p => p.itemId === PLAY_SKU);
        if (!pro) return false;
        await verifyWithServer(pro.purchaseToken);
        return true;
    } catch (err) {
        console.warn('[checkout] Play purchase restore failed (non-fatal):', err);
        return false;
    }
}

/**
 * Start the purchase flow for the current channel. Throws on error (including
 * the 'none' channel) so the caller can surface a friendly message.
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

    const channel = await getPurchaseChannel();

    if (channel === 'play') {
        await startPlayPurchase();
        return;
    }
    if (channel === 'none') {
        throw new Error('Purchases are not available in this app version');
    }

    // Web: Airwallex hosted checkout.
    const [{ functions }, { httpsCallable }] = await Promise.all([
        getFirebase(), import('firebase/functions'),
    ]);
    const call = httpsCallable<unknown, CheckoutResponse>(functions, 'createAirwallexPayment');
    const result = await call({});
    const url = result.data?.url;
    if (!url) throw new Error('No checkout URL returned');
    // Redirect — the hosted Airwallex page owns the flow from here. On success
    // it returns the user to ?paywall=ok and the webhook will have written
    // paidAt by the time the page reloads.
    window.location.href = url;
}
