/**
 * Push-event analytics flusher (client side).
 *
 * The service worker can't write to Firestore directly (no SDK in the SW
 * context). It records `clicked` events into IndexedDB; this module drains
 * that buffer to Firestore on app boot, and also reacts to a "flush" signal
 * from the SW when a notification click wakes a tab.
 *
 * Server-side `sent` and `failed` events are written by the Cloud Function
 * directly via the admin SDK — those don't pass through this path.
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const DB_NAME = 'math-swipe-push-events';
const STORE = 'events';

interface QueuedEvent {
    id?: number;
    kind: string;
    event: 'clicked';
    ts: number;
}

async function openIdb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
}

async function readAndClear(database: IDBDatabase): Promise<QueuedEvent[]> {
    return new Promise((resolve) => {
        try {
            const tx = database.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            const out: QueuedEvent[] = [];
            const cursorReq = store.openCursor();
            cursorReq.onsuccess = () => {
                const cursor = cursorReq.result;
                if (cursor) {
                    out.push(cursor.value as QueuedEvent);
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve(out);
                }
            };
            cursorReq.onerror = () => resolve([]);
        } catch {
            resolve([]);
        }
    });
}

/** Flush any queued push events to Firestore. Safe to call multiple times.
 *  Requires `uid` so the rule can attribute the event to the current user. */
export async function flushPendingPushEvents(uid: string | null): Promise<number> {
    if (!uid) return 0;
    const database = await openIdb();
    if (!database) return 0;
    const queued = await readAndClear(database);
    if (queued.length === 0) return 0;
    let written = 0;
    for (const ev of queued) {
        try {
            await addDoc(collection(db, 'pushEvents'), {
                uid,
                kind: ev.kind,
                event: ev.event,
                clientTs: ev.ts,
                timestamp: serverTimestamp(),
            });
            written++;
        } catch {
            // Rule rejection or offline — drop and continue. We only have
            // best-effort delivery for analytics; aggregates remain useful.
        }
    }
    return written;
}

/** Listen for the SW's "flush" message and drain IDB whenever it arrives. */
export function attachPushEventFlushListener(uid: string | null): () => void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return () => { /* noop */ };
    }
    const handler = (event: MessageEvent) => {
        if (event.data?.type === 'push-event-flush') {
            void flushPendingPushEvents(uid);
        }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
}
