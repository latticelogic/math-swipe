/**
 * Web push subscription utility.
 *
 * Wraps the browser PushManager + a Firestore `pushSubscriptions/{uid}`
 * doc so the rest of the app can call `enablePush()` / `disablePush()` /
 * `getPushStatus()` without touching service workers directly.
 *
 * Hard requirement: VITE_VAPID_PUBLIC_KEY must be set (see .env.example).
 * Without it, `isPushConfigured()` returns false and every action no-ops.
 * The companion Cloud Function in `functions/` consumes the persisted
 * subscriptions to actually send messages — see functions/README.md.
 */

import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SW_PATH = '/firebase-messaging-sw.js';

export interface PushPreferences {
    /** Daily streak / "you haven't played today" reminder. */
    dailyEnabled?: boolean;
    /** Notify when another player beats your speedrun position. */
    pingsEnabled?: boolean;
}

export interface PushStatus {
    /** True when both VAPID key + browser support exist. */
    available: boolean;
    /** True when the user has actively granted Notification permission. */
    granted: boolean;
    /** Currently saved subscription doc (null if none). */
    prefs: PushPreferences | null;
}

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushConfigured(): boolean {
    return !!VAPID_KEY
        && typeof window !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window;
}

/** Convert the URL-safe base64 VAPID public key into the Uint8Array
 *  PushManager.subscribe() expects. The buffer is freshly-allocated as an
 *  ArrayBuffer (not SharedArrayBuffer) so it satisfies the BufferSource
 *  parameter type without further casts. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const buffer = new ArrayBuffer(raw.length);
    const out = new Uint8Array(buffer);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

async function ensureSwRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
        // Register at the root scope so push events route correctly.
        return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    } catch (err) {
        console.warn('Failed to register messaging SW:', err);
        return null;
    }
}

export async function getPushStatus(uid: string | null): Promise<PushStatus> {
    if (!isPushConfigured()) return { available: false, granted: false, prefs: null };
    const granted = Notification.permission === 'granted';
    let prefs: PushPreferences | null = null;
    if (uid) {
        try {
            const snap = await getDoc(doc(db, 'pushSubscriptions', uid));
            if (snap.exists()) prefs = snap.data() as PushPreferences;
        } catch {
            // Rule-rejected reads are non-fatal — UI just shows defaults.
        }
    }
    return { available: true, granted, prefs };
}

/** Request permission, subscribe via PushManager, and persist token + prefs.
 *  Returns the resulting status. Throws only on programmer errors;
 *  user-side denials resolve with `granted: false`. */
export async function enablePush(uid: string, prefs: PushPreferences): Promise<PushStatus> {
    if (!isPushConfigured() || !VAPID_KEY) {
        return { available: false, granted: false, prefs: null };
    }
    // 1. Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        return { available: true, granted: false, prefs: null };
    }
    // 2. SW + push subscription
    const reg = await ensureSwRegistration();
    if (!reg) return { available: false, granted: true, prefs: null };

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
        subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
    }
    // 3. Persist to Firestore — the Cloud Function reads from here.
    const json = subscription.toJSON();
    await setDoc(doc(db, 'pushSubscriptions', uid), {
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent.slice(0, 200),
        dailyEnabled: !!prefs.dailyEnabled,
        pingsEnabled: !!prefs.pingsEnabled,
        updatedAt: serverTimestamp(),
    }, { merge: true });
    return { available: true, granted: true, prefs };
}

/** Update only the preference flags without re-subscribing. */
export async function updatePushPreferences(uid: string, prefs: PushPreferences): Promise<void> {
    if (!isPushConfigured()) return;
    await setDoc(doc(db, 'pushSubscriptions', uid), {
        ...prefs,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

/** Unsubscribe locally + remove the Firestore doc so Cloud Functions stop
 *  trying to send to a dead endpoint. */
export async function disablePush(uid: string): Promise<void> {
    if (!isPushConfigured()) return;
    try {
        const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
        const sub = await reg?.pushManager.getSubscription();
        await sub?.unsubscribe();
    } catch {
        // Best-effort — keep going even if browser unsubscribe fails
    }
    try {
        await deleteDoc(doc(db, 'pushSubscriptions', uid));
    } catch {
        // Subscription doc cleanup is best-effort
    }
}
