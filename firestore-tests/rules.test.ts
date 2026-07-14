/**
 * Firestore Security Rules tests (emulator-backed).
 *
 * These run against the Firestore emulator, NOT the default `vitest run` — the
 * emulator needs Java, which the normal unit-test/CI-build lane doesn't have.
 * Run locally with:  npm run test:rules   (requires Java + firebase-tools)
 * CI runs them in .github/workflows/rules-tests.yml.
 *
 * Why this suite exists: the entitlement self-grant vulnerability (any
 * authenticated client writing its own `paidAt` to unlock the paywall) shipped
 * because `firestore.rules` had ZERO automated coverage — a regression is
 * invisible until a real client hits it. Each assertion below pins a rule that
 * gates money or leaderboard integrity.
 */
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

const PAST = () => Timestamp.fromMillis(1_600_000_000_000); // fixed past ts, clears the 1s write-rate gate

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'demo-mathswipe',
        firestore: {
            rules: readFileSync('firestore.rules', 'utf8'),
            host: '127.0.0.1',
            port: 8080,
        },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

/** Seed a document bypassing rules (for update-path setup). */
async function seed(path: string, data: Record<string, unknown>) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        const db = ctx.firestore();
        const [col, id] = path.split('/');
        await setDoc(doc(db, col, id), data);
    });
}

describe('entitlements/{uid} — payment-state forgery', () => {
    it('lets the owner bootstrap a trial with a NULL paidAt', async () => {
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertSucceeds(setDoc(doc(alice, 'entitlements', 'alice'), {
            trialStartedAt: 1_700_000_000_000,
            paidAt: null,
            source: null,
            originalTransactionId: null,
            updatedAt: serverTimestamp(),
        }));
    });

    it('REJECTS a client creating an entitlement with a non-null paidAt (self-grant)', async () => {
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertFails(setDoc(doc(alice, 'entitlements', 'alice'), {
            trialStartedAt: 1_700_000_000_000,
            paidAt: 1_700_000_000_000,
            source: 'promo',
            originalTransactionId: 'x',
            updatedAt: serverTimestamp(),
        }));
    });

    it('REJECTS a client updating paidAt from null to a number (self-grant)', async () => {
        await seed('entitlements/alice', {
            trialStartedAt: 1_700_000_000_000, paidAt: null, source: null,
            originalTransactionId: null, updatedAt: PAST(),
        });
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertFails(updateDoc(doc(alice, 'entitlements', 'alice'), {
            paidAt: 1_700_000_000_000,
            updatedAt: serverTimestamp(),
        }));
    });

    it('lets the owner update trialStartedAt while payment fields stay unchanged', async () => {
        await seed('entitlements/alice', {
            trialStartedAt: 1_700_000_000_000, paidAt: null, source: null,
            originalTransactionId: null, updatedAt: PAST(),
        });
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertSucceeds(updateDoc(doc(alice, 'entitlements', 'alice'), {
            trialStartedAt: 1_700_000_100_000,
            updatedAt: serverTimestamp(),
        }));
    });

    it('REJECTS creating an entitlement for a DIFFERENT uid', async () => {
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertFails(setDoc(doc(alice, 'entitlements', 'bob'), {
            trialStartedAt: 1_700_000_000_000, paidAt: null, source: null,
            originalTransactionId: null, updatedAt: serverTimestamp(),
        }));
    });

    it('keeps entitlements private: owner reads own, others rejected, admin allowed', async () => {
        await seed('entitlements/alice', {
            trialStartedAt: 1_700_000_000_000, paidAt: null, source: null,
            originalTransactionId: null, updatedAt: PAST(),
        });
        const alice = testEnv.authenticatedContext('alice').firestore();
        const bob = testEnv.authenticatedContext('bob').firestore();
        const admin = testEnv.authenticatedContext('root', { isAdmin: true }).firestore();
        await assertSucceeds(getDoc(doc(alice, 'entitlements', 'alice')));
        await assertFails(getDoc(doc(bob, 'entitlements', 'alice')));
        await assertSucceeds(getDoc(doc(admin, 'entitlements', 'alice')));
    });
});

describe('users/{uid} — leaderboard integrity', () => {
    const baseUser = {
        displayName: 'Alice', totalXP: 0, bestStreak: 0, totalSolved: 0,
        accuracy: 0, isAnonymous: true, createdAt: PAST(), updatedAt: PAST(),
    };

    it('lets the owner create their own user doc', async () => {
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertSucceeds(setDoc(doc(alice, 'users', 'alice'), {
            ...baseUser, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        }));
    });

    it('REJECTS writing another user\'s doc', async () => {
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertFails(setDoc(doc(alice, 'users', 'bob'), {
            ...baseUser, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        }));
    });

    it('allows a normal totalXP increment', async () => {
        await seed('users/alice', { ...baseUser, totalXP: 1000 });
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertSucceeds(updateDoc(doc(alice, 'users', 'alice'), {
            totalXP: 1500, updatedAt: serverTimestamp(),
        }));
    });

    it('REJECTS a one-shot totalXP forge to the 1M cap (delta ceiling)', async () => {
        await seed('users/alice', { ...baseUser, totalXP: 1000 });
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertFails(updateDoc(doc(alice, 'users', 'alice'), {
            totalXP: 1_000_000, updatedAt: serverTimestamp(),
        }));
    });

    it('REJECTS decreasing totalXP to a non-zero value', async () => {
        await seed('users/alice', { ...baseUser, totalXP: 1000 });
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertFails(updateDoc(doc(alice, 'users', 'alice'), {
            totalXP: 500, updatedAt: serverTimestamp(),
        }));
    });

    it('allows a full reset of totalXP to 0', async () => {
        await seed('users/alice', { ...baseUser, totalXP: 1000 });
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertSucceeds(updateDoc(doc(alice, 'users', 'alice'), {
            totalXP: 0, updatedAt: serverTimestamp(),
        }));
    });

    it('REJECTS a bestStreak that exceeds the 1000 magnitude cap', async () => {
        await seed('users/alice', { ...baseUser, bestStreak: 10 });
        const alice = testEnv.authenticatedContext('alice').firestore();
        await assertFails(updateDoc(doc(alice, 'users', 'alice'), {
            bestStreak: 5000, updatedAt: serverTimestamp(),
        }));
    });
});
