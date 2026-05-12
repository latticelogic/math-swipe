/**
 * Leaderboard cache rebuilder.
 *
 * The naive league-tab pattern was `onSnapshot(query(users, orderBy
 * totalXP desc, limit 20))` — one live listener per client, each reading
 * 20 user docs every time something on the board changes. At 1K
 * concurrent users that's ~20K reads per leaderboard event.
 *
 * This function pre-aggregates the top-N rows into two static docs:
 *   leaderboards/score-top20      — top 20 by totalXP
 *   leaderboards/speedrun-top10   — top 10 by bestSpeedrunTime ASC
 *
 * Client reads those two docs instead → 1 read per snap-change per
 * client, regardless of how many users are competing. Cost drops by
 * 10-20× at scale.
 *
 * The cache is rebuilt:
 *   - every 1 minute via onSchedule (steady state; Cloud Scheduler's
 *     minimum resolution is 1 minute, so we can't go sub-minute via
 *     the schedule path)
 *   - on demand when stats land (commented-out trigger; enable when
 *     the synchronous staleness cost matters)
 *
 * Staleness: up to ~60s between a user's score landing and the
 * leaderboard reflecting it. For a casual game the lag is invisible;
 * for a competitive ladder we'd wire up the trigger path.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

interface LeaderboardEntry {
    uid: string;
    displayName: string;
    totalXP: number;
    bestStreak: number;
    bestSpeedrunTime: number;
    speedrunHardMode: boolean;
    activeThemeId: string;
    activeCostume: string;
    activeBadgeId: string;
}

/** Cache rebuild interval. Cloud Scheduler's minimum resolution is 1
 *  minute, so we can't go sub-minute via Firebase's onSchedule. 1
 *  minute is plenty: a 1-minute rebuild touching ≤30 user docs is
 *  ~43K reads/day, while the client side drops from N×20 reads-per-view
 *  to N×1. */
const REBUILD_INTERVAL = 'every 1 minutes';

/** Read a row out of the users collection and project to the
 *  LeaderboardEntry shape that the client expects. The client's type
 *  matches this exactly — keep them in sync if you change one. */
function projectUserRow(uid: string, data: admin.firestore.DocumentData): LeaderboardEntry {
    return {
        uid,
        displayName: typeof data.displayName === 'string' ? data.displayName : 'Anonymous',
        totalXP: Number(data.totalXP) || 0,
        bestStreak: Number(data.bestStreak) || 0,
        bestSpeedrunTime: Number(data.bestSpeedrunTime) || 0,
        speedrunHardMode: Boolean(data.speedrunHardMode),
        activeThemeId: typeof data.activeThemeId === 'string' ? data.activeThemeId : 'classic',
        activeCostume: typeof data.activeCostume === 'string' ? data.activeCostume : '',
        activeBadgeId: typeof data.activeBadgeId === 'string' ? data.activeBadgeId : '',
    };
}

/**
 * Cron rebuild of both leaderboard cache docs. Runs every 60s. Each
 * invocation reads up to 30 user docs and writes 2 cache docs — a
 * fixed cost regardless of total user count, so this scales linearly
 * in the number of TOP players rather than total players.
 */
export const rebuildLeaderboardCache = onSchedule(
    {
        schedule: REBUILD_INTERVAL,
        timeZone: 'UTC',
        // Memory/timeout: this is a 2-query, 2-write function. 256MiB and
        // 30s are plenty; setting them explicitly so cold-start cost is
        // predictable rather than picking up Firebase defaults.
        memory: '256MiB',
        timeoutSeconds: 30,
    },
    async () => {
        const db = admin.firestore();
        const now = Date.now();

        try {
            // ── Top 20 by totalXP ──
            const scoreSnap = await db.collection('users')
                .where('totalXP', '>', 0)
                .orderBy('totalXP', 'desc')
                .limit(20)
                .get();
            const scoreTop: LeaderboardEntry[] = scoreSnap.docs.map(d =>
                projectUserRow(d.id, d.data())
            );

            // ── Top 10 by bestSpeedrunTime ASC ──
            const speedSnap = await db.collection('users')
                .where('bestSpeedrunTime', '>', 0)
                .orderBy('bestSpeedrunTime', 'asc')
                .limit(10)
                .get();
            const speedTop: LeaderboardEntry[] = speedSnap.docs.map(d =>
                projectUserRow(d.id, d.data())
            );

            // Write both cache docs in parallel. Both use set with no
            // merge — the cache document IS the snapshot, partial-write
            // would corrupt it.
            await Promise.all([
                db.doc('leaderboards/score-top20').set({
                    entries: scoreTop,
                    rebuiltAt: now,
                    rebuiltAtServerTs: admin.firestore.FieldValue.serverTimestamp(),
                }),
                db.doc('leaderboards/speedrun-top10').set({
                    entries: speedTop,
                    rebuiltAt: now,
                    rebuiltAtServerTs: admin.firestore.FieldValue.serverTimestamp(),
                }),
            ]);

            logger.info(`[leaderboard] rebuilt: ${scoreTop.length} score / ${speedTop.length} speedrun`);
        } catch (err) {
            logger.error('[leaderboard] rebuild failed', err);
            // Don't throw — the next scheduled run will retry. Throwing
            // would only matter if we wanted Pub/Sub to retry sooner,
            // which we don't (clients can read the prior cached state).
        }
    }
);
