/**
 * Lightweight error monitor — catches unhandled errors and rejections,
 * logs them to Firestore for visibility into prod crashes.
 * Capped at 10 reports per session to avoid spamming.
 *
 * Field set is constrained to exactly what the `errors/{errorId}` Firestore
 * rule allows. Adding a field that the rule doesn't permit causes the entire
 * write to fail silently — so this list must stay in sync with firestore.rules.
 */
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

let reportCount = 0;
const MAX_REPORTS = 10;

interface ErrorPayload {
    message: string;
    stack?: string;
    source?: string;
}

function reportError(error: ErrorPayload) {
    if (reportCount >= MAX_REPORTS) return;
    reportCount++;

    const errorId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Fire and forget — don't block the main thread
    setDoc(doc(db, 'errors', errorId), {
        message: (error.message || 'Unknown error').slice(0, 500),
        stack: (error.stack || '').slice(0, 2000),
        source: (error.source || 'unknown').slice(0, 200),
        userAgent: navigator.userAgent.slice(0, 200),
        url: window.location.href.slice(0, 500),
        timestamp: serverTimestamp(),
    }).catch(() => {
        // Silently fail — error monitoring shouldn't cause more errors
    });
}

export function initErrorMonitor() {
    // Skip in dev: noisy and creates throwaway Firestore writes during HMR
    if (import.meta.env.DEV) return;

    window.addEventListener('error', (event) => {
        reportError({
            message: event.message || 'Unknown error',
            stack: event.error?.stack,
            source: `${event.filename}:${event.lineno}:${event.colno}`,
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const message = reason instanceof Error
            ? reason.message
            : typeof reason === 'string'
                ? reason
                : (() => { try { return JSON.stringify(reason); } catch { return String(reason); } })();
        reportError({
            message: (message || 'Unhandled rejection').slice(0, 500),
            stack: reason instanceof Error ? reason.stack : undefined,
            source: 'unhandledrejection',
        });
    });
}
