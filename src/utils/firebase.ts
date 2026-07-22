/**
 * Lazy Firebase bootstrap.
 *
 * Firebase web SDK keys are intentionally public (embedded in every client),
 * so they're not "secrets" in the cryptographic sense. We still source them
 * from environment variables so:
 *   - forks pointing at their own Firebase project don't accidentally write
 *     to this project's database
 *   - misconfiguration fails loudly in dev rather than silently using a
 *     stale hardcoded fallback
 *   - the build artifact is reproducible from .env alone
 *
 * Security model: enforced by Firestore Security Rules + (planned) App Check.
 *
 * Why lazy: the game's first paint (render a problem, take input, adapt
 * difficulty) is 100% local — no uid or network needed. The Firebase SDK is
 * ~132KB gzipped and only powers background sync (auth uid, Firestore stats,
 * entitlement, leaderboard). Importing it statically forced the browser to
 * fetch+parse that chunk before React could mount. `getFirebase()` defers the
 * SDK import until a consumer first needs it (from an effect, after paint), so
 * it loads off the critical path. The promise is memoised, so every consumer
 * shares one initialised app — preserving Firestore's requirement that
 * `initializeFirestore` (persistent cache) run before any other Firestore use.
 */
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';

export interface FirebaseBundle {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
    functions: Functions;
}

const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

function buildConfig() {
    const env = import.meta.env as Record<string, string | undefined>;
    const missing = requiredKeys.filter(k => !env[k]);
    if (missing.length > 0) {
        throw new Error(
            `Missing required Firebase env vars: ${missing.join(', ')}. ` +
            `Copy .env.example to .env and fill in values from the Firebase console.`,
        );
    }
    return {
        apiKey: env.VITE_FIREBASE_API_KEY!,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
        projectId: env.VITE_FIREBASE_PROJECT_ID!,
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
        appId: env.VITE_FIREBASE_APP_ID!,
    };
}

let bundlePromise: Promise<FirebaseBundle> | null = null;

/**
 * Initialise (once) and return the Firebase services. The heavy SDK modules
 * are dynamically imported here so they stay off the app's initial JS payload.
 * Safe to call from anywhere, any number of times — the first call performs
 * initialisation and every later call resolves to the same instances.
 */
export function getFirebase(): Promise<FirebaseBundle> {
    if (!bundlePromise) {
        bundlePromise = (async () => {
            const [{ initializeApp }, { getAuth }, firestore, { getFunctions }] = await Promise.all([
                import('firebase/app'),
                import('firebase/auth'),
                import('firebase/firestore'),
                import('firebase/functions'),
            ]);
            const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = firestore;

            const app = initializeApp(buildConfig());

            // App Check — attestation that requests come from the genuine app,
            // not a scripted client hitting Firestore/Functions directly with
            // the public web keys. This is the PRIMARY control behind the
            // leaderboard-integrity and write-spam gaps (rules alone can't stop
            // a determined script; App Check can). Env-gated: with no site key
            // set (local dev / preview before provisioning) it's a no-op, so
            // nothing breaks. Registered via reCAPTCHA Enterprise; enforcement
            // is toggled per-service in the Firebase console once App Check
            // metrics show ~100% verified traffic (see next-app-playbook.md §3).
            const appCheckSiteKey = (import.meta.env as Record<string, string | undefined>).VITE_APPCHECK_SITE_KEY;
            if (appCheckSiteKey) {
                // Enterprise provider: the key is a project-based reCAPTCHA key
                // on math-swipe-prod (created 2026-07-22 — Google's console no
                // longer issues classic v3 site/secret pairs).
                const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');
                // In dev, register a debug token so localhost (not a registered
                // reCAPTCHA domain) still passes. The token is printed to the
                // console on first load; add it under App Check → Debug tokens.
                if (import.meta.env.DEV) {
                    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
                }
                initializeAppCheck(app, {
                    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
                    isTokenAutoRefreshEnabled: true,
                });
            }

            const auth = getAuth(app);
            // Firestore with multi-tab persistent cache. Must be initialised
            // before any other Firestore call — the memoised promise guarantees
            // this runs exactly once, ahead of every consumer.
            const db = initializeFirestore(app, {
                localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
            });
            const functions = getFunctions(app);
            return { app, auth, db, functions };
        })();
    }
    return bundlePromise;
}
