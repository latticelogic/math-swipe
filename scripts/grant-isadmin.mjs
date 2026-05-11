/**
 * One-shot admin script: grant the `isAdmin` custom claim to a uid.
 * Run with:
 *   node scripts/grant-isadmin.mjs <uid>
 *
 * Auth: uses Application Default Credentials (run `gcloud auth application-default login`
 * first if you haven't, OR set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON).
 *
 * After running, sign out + back in on the web app so the next ID token includes
 * the new claim. You can verify via the browser console:
 *   firebase.auth().currentUser.getIdTokenResult(true).then(r => console.log(r.claims))
 */

// We import firebase-admin from the functions/ workspace so we don't need
// a duplicate install at the root. Run from the repo root.
import admin from '../functions/node_modules/firebase-admin/lib/index.js';

const uid = process.argv[2];
if (!uid) {
    console.error('Usage: node scripts/grant-isadmin.mjs <uid>');
    process.exit(1);
}

admin.initializeApp({ projectId: 'math-swipe-prod' });

const auth = admin.auth();
const before = await auth.getUser(uid).catch(() => null);
if (!before) {
    console.error(`User ${uid} not found in math-swipe-prod`);
    process.exit(2);
}

const existing = before.customClaims ?? {};
await auth.setCustomUserClaims(uid, { ...existing, isAdmin: true });
console.log(`Granted isAdmin to ${uid}`);
console.log(`Current claims:`, { ...existing, isAdmin: true });
console.log(`Sign out + back in on the web app for the new ID token to take effect.`);
