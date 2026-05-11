/**
 * Firebase Cloud Messaging service worker (FCM-compatible).
 *
 * This file is served at /firebase-messaging-sw.js per FCM convention. It
 * runs ALONGSIDE the Workbox-generated /sw.js — they handle different events
 * and don't conflict because each is registered with its own scope.
 *
 * What it does:
 *  - Receives push messages from FCM
 *  - Shows a system notification with the right title/body/icon
 *  - On click, focuses an existing tab if one is open, otherwise opens
 *    the deep-link from `data.url` (e.g. a player's profile)
 *
 * What it doesn't do:
 *  - Initialize the full Firebase JS SDK. We rely on the lightweight FCM SW
 *    handlers below; the heavyweight app-level Firebase instance lives in
 *    the main thread, not here.
 *
 * Required env to actually deliver messages: VITE_VAPID_PUBLIC_KEY plus a
 * deployed Cloud Function (or App Engine task) that pushes via FCM. Until
 * those exist, this SW is registered but never fires.
 */

// Service-worker globals (`self`, `clients`, etc.) are present at runtime;
// the file isn't part of the TS app build so the ambient types are absent
// at lint time. ESLint passes via the global serviceworker scope.

self.addEventListener('install', (event) => {
    // Activate immediately on first install so the first push works without
    // a page reload.
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;
    let payload;
    try {
        payload = event.data.json();
    } catch {
        // Fallback to text body
        payload = { notification: { title: 'Math Swipe', body: event.data.text() } };
    }
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || 'Math Swipe';
    const options = {
        body: notif.body || '',
        icon: notif.icon || '/icon-192.png',
        badge: '/icon-192.png',
        // Deep-link URL travels in data.url so we can route on click.
        data: { url: data.url || '/', kind: data.kind || 'generic' },
        // Tag collapses duplicate notifications of the same kind so the
        // user doesn't see 5 "daily reminders" stacked.
        tag: data.kind || 'generic',
        renotify: false,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

/** Stash an analytics event in IndexedDB so the next live tab can flush it
 *  to Firestore. We can't write to Firestore from the SW (no SDK), and we
 *  can't guarantee a tab is currently open to handle a postMessage — so
 *  IDB is the durable buffer. The main app drains it on boot. */
async function recordPushEvent(kind, event) {
    try {
        const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('math-swipe-push-events', 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        const tx = db.transaction('events', 'readwrite');
        tx.objectStore('events').add({ kind, event, ts: Date.now() });
        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch {
        // IDB might be disabled (private mode); analytics loss is acceptable
    }
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    const kind = (event.notification.data && event.notification.data.kind) || 'generic';
    event.waitUntil((async () => {
        // Stash the click event for the next tab to flush
        await recordPushEvent(kind, 'clicked');

        const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        // If a tab is already open at our origin, focus it and navigate
        for (const client of allClients) {
            if (client.url.startsWith(self.location.origin)) {
                await client.focus();
                if ('navigate' in client) {
                    try { await client.navigate(url); } catch { /* navigate not always allowed */ }
                }
                // Wake the tab so it flushes pending events from IDB
                client.postMessage({ type: 'push-event-flush' });
                return;
            }
        }
        // No tab open — open a new one; the app will flush IDB on boot
        await self.clients.openWindow(url);
    })());
});
