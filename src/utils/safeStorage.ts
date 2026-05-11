/**
 * localStorage wrapper that swallows quota / SecurityError exceptions.
 *
 * On iOS Safari Private Browsing and some embedded WebViews, every
 * `localStorage.setItem` throws QuotaExceededError. Without this wrapper
 * the entire app crashes the first time we try to persist something.
 *
 * Reads and writes degrade silently — callers stay functional, they just
 * lose persistence for the rest of the session.
 */

export function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function safeSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* silent — quota / private mode / disabled */
    }
}

export function safeRemoveItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        /* silent */
    }
}
