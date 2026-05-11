/**
 * utils/achievements.ts
 *
 * Generic achievement engine — subject-agnostic.
 * Math-specific achievements and AchievementStats live in
 * src/domains/math/mathAchievements.ts.
 *
 * For backward compatibility this file also re-exports the math achievements
 * under their original names (ACHIEVEMENTS, EVERY_ACHIEVEMENT, etc.) so
 * existing code compiles without changes.
 */
import { STORAGE_KEYS, FIRESTORE } from '../config';
import { EVERY_MATH_ACHIEVEMENT } from '../domains/math/mathAchievements';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { safeGetItem, safeSetItem } from './safeStorage';

// ── Generic Achievement interface ─────────────────────────────────────────────

/** Generic achievement that works with any stats shape TStats */
export interface Achievement<TStats = Record<string, unknown>> {
    id: string;
    name: string;
    desc: string;
    check: (s: TStats) => boolean;
}

// ── Storage helpers (engine-level, key from config) ───────────────────────────

const STORAGE_KEY = STORAGE_KEYS.achievements;

/** Load unlocked achievement IDs from localStorage (sync fast path) */
export function loadUnlocked(): Set<string> {
    try {
        const raw = safeGetItem(STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

/** Restore from Firestore if localStorage is empty */
export async function restoreUnlockedFromCloud(uid: string): Promise<Set<string> | null> {
    try {
        const snap = await getDoc(doc(db, FIRESTORE.USERS, uid));
        if (snap.exists() && snap.data().achievements) {
            const cloudIds = new Set<string>(snap.data().achievements);
            const local = loadUnlocked();
            const merged = new Set([...local, ...cloudIds]);
            safeSetItem(STORAGE_KEY, JSON.stringify([...merged]));
            return merged;
        }
    } catch (err) {
        console.warn('Failed to restore achievements from cloud:', err);
    }
    return null;
}

/** Save unlocked achievement IDs — localStorage + Firestore */
export function saveUnlocked(ids: Set<string>, uid?: string | null) {
    safeSetItem(STORAGE_KEY, JSON.stringify([...ids]));
    if (uid) {
        setDoc(doc(db, FIRESTORE.USERS, uid), {
            achievements: [...ids],
        }, { merge: true }).catch(err => {
            console.warn('Failed to sync achievements to cloud:', err);
        });
    }
}

/** Check all achievements against stats, returns newly unlocked IDs */
export function checkAchievements<TStats>(
    achievements: Achievement<TStats>[],
    stats: TStats,
    unlocked: Set<string>,
): string[] {
    const newlyUnlocked: string[] = [];
    for (const a of achievements) {
        if (!unlocked.has(a.id) && a.check(stats)) {
            newlyUnlocked.push(a.id);
        }
    }
    return newlyUnlocked;
}

// ── Backward-compatible re-exports ────────────────────────────────────────────
// These keep existing imports in App.tsx and MePage.tsx working unchanged.

export type { MathAchievementStats as AchievementStats } from '../domains/math/mathAchievements';
export { EVERY_MATH_ACHIEVEMENT as EVERY_ACHIEVEMENT } from '../domains/math/mathAchievements';

/** @deprecated Named individual list — full list. Use EVERY_MATH_ACHIEVEMENT directly. */
export const ACHIEVEMENTS = EVERY_MATH_ACHIEVEMENT;

/** @deprecated Import from domains/math/mathAchievements instead */
export const HARD_MODE_ACHIEVEMENTS = EVERY_MATH_ACHIEVEMENT.filter(a => a.id.startsWith('skull-'));

/** @deprecated Import from domains/math/mathAchievements instead */
export const TIMED_MODE_ACHIEVEMENTS = EVERY_MATH_ACHIEVEMENT.filter(a =>
    ['speed-demon', 'blitz-master', 'lightning', 'time-lord'].includes(a.id)
);

/** @deprecated Import from domains/math/mathAchievements instead */
export const ULTIMATE_ACHIEVEMENTS = EVERY_MATH_ACHIEVEMENT.filter(a => a.id.startsWith('ultimate-'));
