import { defineConfig } from 'vitest/config';

/**
 * Emulator-backed Firestore rules tests. Run via `npm run test:rules`, which
 * wraps this in `firebase emulators:exec` so the emulator is up on port 8080.
 * Kept separate from the default vitest run because it needs Java + the
 * emulator, which the normal unit-test lane doesn't have.
 */
export default defineConfig({
    test: {
        include: ['firestore-tests/**/*.test.ts'],
        environment: 'node',
        testTimeout: 20_000,
        hookTimeout: 30_000,
        fileParallelism: false,
    },
});
