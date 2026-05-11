import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

/**
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
 */
const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
] as const;

const env = import.meta.env as Record<string, string | undefined>;
const missing = requiredKeys.filter(k => !env[k]);
if (missing.length > 0) {
    throw new Error(
        `Missing required Firebase env vars: ${missing.join(', ')}. ` +
        `Copy .env.example to .env and fill in values from the Firebase console.`,
    );
}

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY!,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: env.VITE_FIREBASE_APP_ID!,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with multi-tab persistent cache
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
