import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectChannel, isAndroidApp } from '../utils/channel';
import { getPurchaseChannel } from '../utils/checkout';

/**
 * Distribution-channel detection + purchase routing.
 *
 * The compliance invariant these tests protect: the Google Play (TWA) app must
 * NEVER be offered the web (Airwallex) purchase path — Play policy, enforced
 * harder under the Families program. 'web' must only be returned for genuine
 * browser sessions, and a TWA without Play Billing must resolve to 'none'
 * (no purchase at all), never 'web'.
 */

const CHANNEL_KEY = 'mc-session-channel';

type DGWindow = Window & { getDigitalGoodsService?: (method: string) => Promise<unknown> };

function setSearch(search: string) {
    window.history.replaceState({}, '', `/${search}`);
}

function setReferrer(value: string) {
    Object.defineProperty(document, 'referrer', { value, configurable: true });
}

beforeEach(() => {
    sessionStorage.clear();
    setSearch('');
    setReferrer('');
    delete (window as DGWindow).getDigitalGoodsService;
});

afterEach(() => {
    sessionStorage.clear();
    setSearch('');
    setReferrer('');
    delete (window as DGWindow).getDigitalGoodsService;
});

describe('detectChannel', () => {
    it('defaults to web with no TWA signals', () => {
        expect(detectChannel()).toBe('web');
        expect(isAndroidApp()).toBe(false);
        // A web session must not write the sticky flag
        expect(sessionStorage.getItem(CHANNEL_KEY)).toBeNull();
    });

    it('detects the TWA via the ?src=twa start_url param', () => {
        setSearch('?src=twa');
        expect(detectChannel()).toBe('twa');
        expect(isAndroidApp()).toBe(true);
    });

    it('detects the TWA via the android-app:// referrer', () => {
        setReferrer('android-app://app.mathchallenge.twa');
        expect(detectChannel()).toBe('twa');
    });

    it('stays sticky for the session after the URL is cleaned', () => {
        setSearch('?src=twa');
        expect(detectChannel()).toBe('twa');
        // Simulate the app cleaning the URL and the referrer being lost
        setSearch('');
        setReferrer('');
        expect(detectChannel()).toBe('twa');
    });

    it('does NOT stick across sessions (sessionStorage, not localStorage)', () => {
        setSearch('?src=twa');
        expect(detectChannel()).toBe('twa');
        // New session (TWA shares origin storage with regular Chrome — a
        // persistent flag would wrongly mark later browser visits as TWA)
        sessionStorage.clear();
        setSearch('');
        expect(detectChannel()).toBe('web');
        expect(localStorage.getItem(CHANNEL_KEY)).toBeNull();
    });

    it('ignores unrelated src params and referrers', () => {
        setSearch('?src=share');
        setReferrer('https://google.com/');
        expect(detectChannel()).toBe('web');
    });
});

describe('getPurchaseChannel', () => {
    it('web session → web (Airwallex path)', async () => {
        expect(await getPurchaseChannel()).toBe('web');
    });

    it('TWA without the Digital Goods API → none (no legal purchase path)', async () => {
        sessionStorage.setItem(CHANNEL_KEY, 'twa');
        expect(await getPurchaseChannel()).toBe('none');
    });

    it('TWA with Play Billing available → play', async () => {
        sessionStorage.setItem(CHANNEL_KEY, 'twa');
        (window as DGWindow).getDigitalGoodsService = async () => ({});
        expect(await getPurchaseChannel()).toBe('play');
    });

    it('TWA where the service rejects (billing not configured) → none', async () => {
        sessionStorage.setItem(CHANNEL_KEY, 'twa');
        (window as DGWindow).getDigitalGoodsService = async () => {
            throw new Error('unsupported');
        };
        expect(await getPurchaseChannel()).toBe('none');
    });

    it('never returns web inside the Android app (the compliance invariant)', async () => {
        sessionStorage.setItem(CHANNEL_KEY, 'twa');
        for (const dg of [undefined, async () => ({}), async () => { throw new Error('x'); }]) {
            if (dg) (window as DGWindow).getDigitalGoodsService = dg;
            else delete (window as DGWindow).getDigitalGoodsService;
            expect(await getPurchaseChannel()).not.toBe('web');
        }
    });
});
