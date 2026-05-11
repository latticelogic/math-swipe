import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { STORAGE_KEYS, FIRESTORE } from '../config';
import { QUESTION_TYPES } from '../domains/math/mathCategories';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

interface TypeStat {
    solved: number;
    correct: number;
}

export interface Stats {
    lastDailyDate: string;      // YYYY-MM-DD of the last daily session
    todayDailySolved: number;   // problems answered in today's daily session
    todayDailyCorrect: number;  // correct in today's daily session
    totalXP: number;
    totalSolved: number;
    totalCorrect: number;
    bestStreak: number;
    sessionsPlayed: number;
    dayStreak: number;
    streakShields: number;
    lastPlayedDate: string; // YYYY-MM-DD
    byType: Record<string, TypeStat>;
    // Hard mode tracking
    hardModeSolved: number;
    hardModeCorrect: number;
    hardModeBestStreak: number;
    hardModeSessions: number;
    hardModePerfects: number;
    // Timed mode tracking
    timedModeSolved: number;
    timedModeCorrect: number;
    timedModeBestStreak: number;
    timedModeSessions: number;
    timedModePerfects: number;
    // Ultimate mode (hard + timed) tracking
    ultimateSolved: number;
    ultimateCorrect: number;
    ultimateBestStreak: number;
    ultimateSessions: number;
    ultimatePerfects: number;

    // Cosmetics for Leaderboard broadcast
    activeThemeId?: string;
    activeCostume?: string;
    activeTrailId?: string;
    activeBadgeId?: string; // Achievement badge shown on leaderboard

    // Speedrun tracking
    bestSpeedrunTime: number; // Stored in ms. 0 means unplayed.
    speedrunHardMode: boolean; // true if best speedrun was on hard mode
}

const STORAGE_KEY = STORAGE_KEYS.stats;

const EMPTY_TYPE: TypeStat = { solved: 0, correct: 0 };

/** Build byType from the authoritative QUESTION_TYPES list — no per-key hardcoding */
function buildEmptyByType(): Record<string, TypeStat> {
    const out: Record<string, TypeStat> = {};
    for (const qt of QUESTION_TYPES) {
        out[qt.id] = { ...EMPTY_TYPE };
    }
    // Add meta types not in the picker list
    for (const id of ['speedrun', 'challenge', 'ghost']) {
        out[id] = { ...EMPTY_TYPE };
    }
    return out;
}

const EMPTY_STATS: Stats = {
    lastDailyDate: '',
    todayDailySolved: 0,
    todayDailyCorrect: 0,
    totalXP: 0,
    totalSolved: 0,
    totalCorrect: 0,
    bestStreak: 0,
    sessionsPlayed: 0,
    dayStreak: 0,
    streakShields: 0,
    lastPlayedDate: '',
    byType: buildEmptyByType(),
    hardModeSolved: 0,
    hardModeCorrect: 0,
    hardModeBestStreak: 0,
    hardModeSessions: 0,
    hardModePerfects: 0,
    timedModeSolved: 0,
    timedModeCorrect: 0,
    timedModeBestStreak: 0,
    timedModeSessions: 0,
    timedModePerfects: 0,
    ultimateSolved: 0,
    ultimateCorrect: 0,
    ultimateBestStreak: 0,
    ultimateSessions: 0,
    ultimatePerfects: 0,
    bestSpeedrunTime: 0,
    speedrunHardMode: false,
};

/** Normalize a YYYY-M-D or YYYY-MM-DD string to zero-padded YYYY-MM-DD.
 *  Older saves wrote unpadded dates; we migrate on read so all comparisons
 *  are calendar-correct. */
function padIsoDate(s: unknown): string {
    if (typeof s !== 'string' || !s) return '';
    const parts = s.split('-');
    if (parts.length !== 3) return s;
    const [y, m, d] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Load from localStorage (fast, synchronous) */
function loadStatsLocal(): Stats {
    try {
        const raw = safeGetItem(STORAGE_KEY);
        if (!raw) return EMPTY_STATS;
        const parsed = JSON.parse(raw);
        return {
            ...EMPTY_STATS,
            ...parsed,
            byType: { ...EMPTY_STATS.byType, ...parsed.byType },
            // Migrate legacy unpadded date strings on read
            lastPlayedDate: padIsoDate(parsed.lastPlayedDate),
            lastDailyDate: padIsoDate(parsed.lastDailyDate),
        };
    } catch {
        return EMPTY_STATS;
    }
}

/** Save to localStorage (fast, synchronous, never throws) */
function saveStatsLocal(s: Stats) {
    safeSetItem(STORAGE_KEY, JSON.stringify(s));
}

/** Save to Firestore (async, background — includes leaderboard fields at top level) */
async function saveStatsCloud(uid: string, s: Stats) {
    try {
        const accuracy = s.totalSolved > 0 ? Math.round((s.totalCorrect / s.totalSolved) * 100) : 0;
        // bestSpeedrunTime rule: must be 0 or >= 5000. Defensively clamp tiny values
        // that could only arise from clock skew or a corrupted local store.
        const safeSpeedrun = !s.bestSpeedrunTime || s.bestSpeedrunTime >= 5000 ? (s.bestSpeedrunTime || 0) : 0;
        await setDoc(doc(db, FIRESTORE.USERS, uid), {
            // Top-level leaderboard-queryable fields
            totalXP: s.totalXP,
            bestStreak: Math.max(s.bestStreak || 0, s.hardModeBestStreak || 0, s.timedModeBestStreak || 0, s.ultimateBestStreak || 0),
            totalSolved: s.totalSolved,
            accuracy,
            activeThemeId: s.activeThemeId || 'classic',
            activeCostume: s.activeCostume || '',
            activeTrailId: s.activeTrailId || '',
            activeBadgeId: s.activeBadgeId || '',
            bestSpeedrunTime: safeSpeedrun,
            speedrunHardMode: s.speedrunHardMode || false,
            streakShields: s.streakShields || 0,
            // Full stats blob — strip undefined values (Firestore rejects them)
            stats: JSON.parse(JSON.stringify(s)),
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        console.warn('Failed to sync stats to cloud:', err);
    }
}

/** Load from Firestore (async fallback) */
async function loadStatsCloud(uid: string): Promise<Stats | null> {
    try {
        const snap = await getDoc(doc(db, FIRESTORE.USERS, uid));
        if (snap.exists() && snap.data().stats) {
            const cloud = snap.data().stats;
            return {
                ...EMPTY_STATS,
                ...cloud,
                byType: { ...EMPTY_STATS.byType, ...cloud.byType },
                // Migrate legacy unpadded date strings
                lastPlayedDate: padIsoDate(cloud.lastPlayedDate),
                lastDailyDate: padIsoDate(cloud.lastDailyDate),
            };
        }
    } catch (err) {
        console.warn('Failed to load stats from cloud:', err);
    }
    return null;
}

/** Merge stats from local + cloud — take the best of each field */
function mergeStats(local: Stats, cloud: Stats): Stats {
    // Merge byType per-key (take max of each)
    const mergedByType = { ...EMPTY_STATS.byType };
    for (const key of Object.keys(mergedByType) as string[]) {
        const l = local.byType[key] || EMPTY_TYPE;
        const c = cloud.byType[key] || EMPTY_TYPE;
        mergedByType[key] = {
            solved: Math.max(l.solved, c.solved),
            correct: Math.max(l.correct, c.correct),
        };
    }

    return {
        ...EMPTY_STATS,
        lastDailyDate: local.lastDailyDate > cloud.lastDailyDate ? local.lastDailyDate : cloud.lastDailyDate,
        todayDailySolved: local.lastDailyDate > cloud.lastDailyDate ? local.todayDailySolved : cloud.todayDailySolved,
        todayDailyCorrect: local.lastDailyDate > cloud.lastDailyDate ? local.todayDailyCorrect : cloud.todayDailyCorrect,
        totalXP: Math.max(local.totalXP, cloud.totalXP),
        totalSolved: Math.max(local.totalSolved, cloud.totalSolved),
        totalCorrect: Math.max(local.totalCorrect, cloud.totalCorrect),
        bestStreak: Math.max(local.bestStreak, cloud.bestStreak),
        sessionsPlayed: Math.max(local.sessionsPlayed, cloud.sessionsPlayed),
        dayStreak: Math.max(local.dayStreak, cloud.dayStreak),
        streakShields: Math.max(local.streakShields, cloud.streakShields),
        lastPlayedDate: local.lastPlayedDate > cloud.lastPlayedDate ? local.lastPlayedDate : cloud.lastPlayedDate,
        byType: mergedByType,
        hardModeSolved: Math.max(local.hardModeSolved, cloud.hardModeSolved),
        hardModeCorrect: Math.max(local.hardModeCorrect, cloud.hardModeCorrect),
        hardModeBestStreak: Math.max(local.hardModeBestStreak, cloud.hardModeBestStreak),
        hardModeSessions: Math.max(local.hardModeSessions, cloud.hardModeSessions),
        hardModePerfects: Math.max(local.hardModePerfects, cloud.hardModePerfects),
        timedModeSolved: Math.max(local.timedModeSolved, cloud.timedModeSolved),
        timedModeCorrect: Math.max(local.timedModeCorrect, cloud.timedModeCorrect),
        timedModeBestStreak: Math.max(local.timedModeBestStreak, cloud.timedModeBestStreak),
        timedModeSessions: Math.max(local.timedModeSessions, cloud.timedModeSessions),
        timedModePerfects: Math.max(local.timedModePerfects, cloud.timedModePerfects),
        ultimateSolved: Math.max(local.ultimateSolved, cloud.ultimateSolved),
        ultimateCorrect: Math.max(local.ultimateCorrect, cloud.ultimateCorrect),
        ultimateBestStreak: Math.max(local.ultimateBestStreak, cloud.ultimateBestStreak),
        ultimateSessions: Math.max(local.ultimateSessions, cloud.ultimateSessions),
        ultimatePerfects: Math.max(local.ultimatePerfects, cloud.ultimatePerfects),
        bestSpeedrunTime: local.bestSpeedrunTime > 0 && cloud.bestSpeedrunTime > 0
            ? Math.min(local.bestSpeedrunTime, cloud.bestSpeedrunTime)
            : local.bestSpeedrunTime || cloud.bestSpeedrunTime,
        speedrunHardMode: (local.bestSpeedrunTime > 0 && cloud.bestSpeedrunTime > 0
            ? (local.bestSpeedrunTime <= cloud.bestSpeedrunTime ? local : cloud)
            : local.bestSpeedrunTime ? local : cloud
        ).speedrunHardMode,
        // Preserve cosmetics from whichever side has them
        activeThemeId: local.activeThemeId || cloud.activeThemeId,
        activeCostume: local.activeCostume || cloud.activeCostume,
        activeTrailId: local.activeTrailId || cloud.activeTrailId,
        activeBadgeId: local.activeBadgeId || cloud.activeBadgeId,
    };
}

export function useStats(uid: string | null) {
    const [stats, setStats] = useState<Stats>(loadStatsLocal);
    const uidRef = useRef(uid);
    useEffect(() => {
        uidRef.current = uid;
    }, [uid]);

    // Cloud restoration gate — prevents the local debounced cloud-write from
    // overwriting cloud data with empty local stats before the merge completes.
    // Per-uid: a fresh sign-in resets the gate so we re-fetch.
    const cloudRestoredForRef = useRef<string | null>(null);

    // On uid change, restore from Firestore (and merge into local) before
    // permitting any cloud writes for this user.
    useEffect(() => {
        if (!uid) return;
        let cancelled = false;
        loadStatsCloud(uid).then(cloud => {
            if (cancelled) return;
            if (cloud) {
                setStats(prev => {
                    const merged = mergeStats(prev, cloud);
                    saveStatsLocal(merged); // update local cache
                    return merged;
                });
            }
            // Open the cloud-write gate for this uid (whether or not a cloud doc existed)
            cloudRestoredForRef.current = uid;
        }).catch(() => {
            // Even on cloud error, open the gate so writes aren't blocked forever
            cloudRestoredForRef.current = uid;
        });
        return () => { cancelled = true; };
    }, [uid]);

    // Save to localStorage on every change + debounced Firestore sync
    const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    useEffect(() => {
        saveStatsLocal(stats);
        const currentUid = uidRef.current;
        // Only write to cloud if we've completed the restore handshake for this uid
        if (currentUid && cloudRestoredForRef.current === currentUid) {
            // Debounce Firestore writes to reduce costs during rapid gameplay
            clearTimeout(cloudTimerRef.current);
            cloudTimerRef.current = setTimeout(() => {
                if (uidRef.current && cloudRestoredForRef.current === uidRef.current) {
                    saveStatsCloud(uidRef.current, stats);
                }
            }, 2000);
        }
        return () => clearTimeout(cloudTimerRef.current);
    }, [stats]);

    const updateCosmetics = useCallback((themeId: string, costumeId: string, trailId: string) => {
        setStats(prev => ({
            ...prev,
            activeThemeId: themeId,
            activeCostume: costumeId,
            activeTrailId: trailId,
        }));
    }, []);

    const recordSession = useCallback((
        score: number, correct: number, answered: number,
        bestStreak: number, questionType: string, hardMode = false, timedMode = false
    ) => {
        setStats(prev => {
            const prevType = prev.byType[questionType] || { ...EMPTY_TYPE };
            const today = new Date();
            // Use zero-padded YYYY-MM-DD so lexicographic compare matches calendar order
            const pad = (n: number) => String(n).padStart(2, '0');
            const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
            let dayStreak = prev.dayStreak;
            let streakShields = prev.streakShields || 0;

            if (prev.lastPlayedDate !== todayStr) {
                const yest = new Date(today);
                yest.setDate(yest.getDate() - 1);
                const yesterdayStr = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

                if (prev.lastPlayedDate === yesterdayStr) {
                    dayStreak = prev.dayStreak + 1;
                    if (dayStreak % 7 === 0) {
                        streakShields = Math.min(3, streakShields + 1);
                    }
                } else if (prev.lastPlayedDate !== '') {
                    // We're past yesterday — at least one day was missed.
                    // Compute the missed-day count via UTC midnights to be DST-safe:
                    // both Date.UTC values correspond to local Y/M/D at UTC 00:00,
                    // so the divide is always an integer.
                    const lastParts = prev.lastPlayedDate.split('-').map(Number);
                    const lastUTC = Date.UTC(lastParts[0], lastParts[1] - 1, lastParts[2]);
                    const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
                    const daysSinceLast = Math.round((todayUTC - lastUTC) / 86400000);
                    // daysMissed = number of full calendar days where the user did not play.
                    // 1 = "skipped exactly one day" (lastPlayed = day before yesterday).
                    const daysMissed = daysSinceLast - 1;

                    // Shield can rescue at most one missed day.
                    if (daysMissed === 1 && streakShields > 0) {
                        streakShields -= 1;
                        dayStreak = prev.dayStreak + 1; // Shield consumed! Forgive and extend.
                        if (dayStreak % 7 === 0) {
                            streakShields = Math.min(3, streakShields + 1);
                        }
                    } else {
                        dayStreak = 1; // Streak broken (too many days missed or no shield)
                    }
                } else {
                    dayStreak = 1; // First session ever
                }
            }
            // Track today's daily progress (reset each new day)
            const isDaily = questionType === 'daily';
            const dailySameDay = prev.lastDailyDate === todayStr;
            const todayDailySolved = isDaily ? (dailySameDay ? prev.todayDailySolved : 0) + answered : prev.todayDailySolved;
            const todayDailyCorrect = isDaily ? (dailySameDay ? prev.todayDailyCorrect : 0) + correct : prev.todayDailyCorrect;
            const lastDailyDate = isDaily ? todayStr : prev.lastDailyDate;

            const isPerfect = answered > 0 && correct === answered;
            const isUltimate = hardMode && timedMode;
            return {
                ...prev,
                lastDailyDate,
                todayDailySolved,
                todayDailyCorrect,
                totalXP: prev.totalXP + score,
                totalSolved: prev.totalSolved + answered,
                totalCorrect: prev.totalCorrect + correct,
                bestStreak: Math.max(prev.bestStreak, bestStreak),
                sessionsPlayed: prev.sessionsPlayed + 1,
                dayStreak,
                streakShields,
                lastPlayedDate: todayStr,
                byType: {
                    ...prev.byType,
                    [questionType]: {
                        solved: prevType.solved + answered,
                        correct: prevType.correct + correct,
                    },
                },
                hardModeSolved: prev.hardModeSolved + (hardMode ? answered : 0),
                hardModeCorrect: prev.hardModeCorrect + (hardMode ? correct : 0),
                hardModeBestStreak: hardMode ? Math.max(prev.hardModeBestStreak, bestStreak) : prev.hardModeBestStreak,
                hardModeSessions: prev.hardModeSessions + (hardMode ? 1 : 0),
                hardModePerfects: prev.hardModePerfects + (hardMode && isPerfect ? 1 : 0),
                timedModeSolved: prev.timedModeSolved + (timedMode ? answered : 0),
                timedModeCorrect: prev.timedModeCorrect + (timedMode ? correct : 0),
                timedModeBestStreak: timedMode ? Math.max(prev.timedModeBestStreak, bestStreak) : prev.timedModeBestStreak,
                timedModeSessions: prev.timedModeSessions + (timedMode ? 1 : 0),
                timedModePerfects: prev.timedModePerfects + (timedMode && isPerfect ? 1 : 0),
                ultimateSolved: prev.ultimateSolved + (isUltimate ? answered : 0),
                ultimateCorrect: prev.ultimateCorrect + (isUltimate ? correct : 0),
                ultimateBestStreak: isUltimate ? Math.max(prev.ultimateBestStreak, bestStreak) : prev.ultimateBestStreak,
                ultimateSessions: prev.ultimateSessions + (isUltimate ? 1 : 0),
                ultimatePerfects: prev.ultimatePerfects + (isUltimate && isPerfect ? 1 : 0),
            };
        });
    }, []);

    const resetStats = useCallback(() => {
        setStats(EMPTY_STATS);
    }, []);

    const updateBestSpeedrunTime = useCallback((timeMs: number, hardMode = false) => {
        setStats(prev => {
            if (prev.bestSpeedrunTime > 0 && timeMs >= prev.bestSpeedrunTime) return prev;
            return { ...prev, bestSpeedrunTime: timeMs, speedrunHardMode: hardMode };
        });
    }, []);

    const updateBadge = useCallback((badgeId: string) => {
        setStats(prev => ({ ...prev, activeBadgeId: badgeId }));
    }, []);

    const consumeShield = useCallback(() => {
        setStats(prev => ({
            ...prev,
            streakShields: Math.max(0, prev.streakShields - 1),
        }));
    }, []);

    const accuracy = stats.totalSolved > 0
        ? Math.round((stats.totalCorrect / stats.totalSolved) * 100)
        : 0;

    return { stats, accuracy, recordSession, resetStats, updateCosmetics, updateBestSpeedrunTime, updateBadge, consumeShield };
}
