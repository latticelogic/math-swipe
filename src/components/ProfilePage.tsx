/**
 * ProfilePage — public profile at /u/<displayName>-<uid4>.
 *
 * Renders any player's public stats from a shareable URL. Anyone with the
 * link can land here (anonymous Firebase auth fires automatically), see the
 * player's rank, totals, active teacher portrait, and tap "Challenge me" to
 * start a fresh challenge round.
 *
 * Lookup strategy: URL slug is `<displayName>-<uid.slice(0,4)>`. We query
 * `users` for the matching displayName (cheap, single-field index already in
 * place), then narrow to the doc whose uid starts with the suffix. For 99%
 * of names there's only one match anyway; the suffix dedupes the rest.
 */

import { memo, useState, useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, limit, getDoc, getDocs, doc } from 'firebase/firestore';
import { getFirebase } from '../utils/firebase';
import { getRank, getMastery, rankLabel } from '../domains/math/ranks';
import { getTeacher, teacherName } from '../domains/math/teachers';
import { getThemeDisplayColor } from '../utils/chalkThemes';
import { AchievementBadge } from './AchievementBadge';
import { achName, achDesc } from '../domains/math/mathAchievements';
import { RankIcon } from './RankIcon';
import { EVERY_ACHIEVEMENT } from '../utils/achievements';
import { opponentChallengeSeed } from '../utils/dailyChallenge';
import { parseProfileSlug, profileNameCandidates } from '../utils/profileSlug';
import { lookupUidBySlug } from '../utils/username';
import { formatTime } from '../utils/formatTime';
import { t } from '../i18n';

interface ProfileData {
    uid: string;
    displayName: string;
    totalXP: number;
    bestStreak: number;
    totalSolved: number;
    accuracy: number;
    bestSpeedrunTime?: number;
    speedrunHardMode?: boolean;
    activeThemeId?: string;
    activeCostume?: string;
    activeBadgeId?: string;
    activeTeacher?: string;
    achievements?: string[];
}

/** Normalize a Firestore user-doc snapshot into ProfileData.
 *  `fallbackName` is the slug-derived name used when the doc has no
 *  displayName (shouldn't happen, but safer than rendering 'undefined'). */
function toProfileData(uid: string, fallbackName: string, data: Record<string, unknown>): ProfileData {
    const num = (k: string): number => typeof data[k] === 'number' ? data[k] as number : 0;
    return {
        uid,
        displayName: typeof data.displayName === 'string' ? data.displayName as string : fallbackName,
        totalXP: num('totalXP'),
        bestStreak: num('bestStreak'),
        totalSolved: num('totalSolved'),
        accuracy: num('accuracy'),
        bestSpeedrunTime: num('bestSpeedrunTime'),
        speedrunHardMode: !!data.speedrunHardMode,
        activeThemeId: typeof data.activeThemeId === 'string' ? data.activeThemeId as string : undefined,
        activeCostume: typeof data.activeCostume === 'string' ? data.activeCostume as string : undefined,
        activeBadgeId: typeof data.activeBadgeId === 'string' ? data.activeBadgeId as string : undefined,
        activeTeacher: (data.preferences as { teacher?: string } | undefined)?.teacher,
        achievements: Array.isArray(data.achievements) ? data.achievements as string[] : [],
    };
}

interface Props {
    slug: string;
    onChallenge: (challengeId: string, targetTimeMs?: number) => void;
    onBackToGame: () => void;
}

export const ProfilePage = memo(function ProfilePage({ slug, onChallenge, onBackToGame }: Props) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const parsed = parseProfileSlug(slug);
        if (!parsed) {
            // Synchronous failure path — the slug is malformed before we even
            // hit Firestore. Lint rule mis-classifies this; treat as edge.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError(t('profile.errInvalid'));
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { db } = await getFirebase();
                if (cancelled) return;
                // Path 1: pure-handle lookup. Single get on usernames/{slug},
                // then a single get on the resolved user doc — fast and
                // unique. Falls through to legacy lookup if the handle is
                // unclaimed (shouldn't happen for well-formed handle URLs,
                // but it makes the migration period painless).
                if (parsed.kind === 'handle') {
                    const uid = await lookupUidBySlug(parsed.handle);
                    if (cancelled) return;
                    if (!uid) {
                        setError(t('profile.errNoHandle', { handle: parsed.handle }));
                        setLoading(false);
                        return;
                    }
                    const userSnap = await getDoc(doc(db, 'users', uid));
                    if (cancelled) return;
                    if (!userSnap.exists()) {
                        setError(t('profile.errNoHandle', { handle: parsed.handle }));
                        setLoading(false);
                        return;
                    }
                    setProfile(toProfileData(uid, parsed.handle, userSnap.data()));
                    setLoading(false);
                    return;
                }

                // Path 2: legacy `<displayName>-<uid4>` lookup. Filter by
                // displayName, then find the doc whose uid starts with the
                // 4-char suffix. O(N) on duplicates but capped at 8. We match
                // BOTH the parsed name and its '_'→space form so names with
                // spaces (slugged to underscores) resolve — see
                // profileNameCandidates.
                const q = query(
                    collection(db, 'users'),
                    where('displayName', 'in', profileNameCandidates(parsed.name)),
                    limit(8),
                );
                const snap = await getDocs(q);
                if (cancelled) return;
                if (snap.empty) {
                    setError(t('profile.errNoName', { name: parsed.name }));
                    setLoading(false);
                    return;
                }
                const match = snap.docs.find(d => d.id.toLowerCase().startsWith(parsed.uidPrefix));
                if (!match) {
                    setError(t('profile.errNoMatch'));
                    setLoading(false);
                    return;
                }
                setProfile(toProfileData(match.id, parsed.name, match.data()));
                setLoading(false);
            } catch (err) {
                if (cancelled) return;
                console.warn('Profile load failed:', err);
                setError(t('profile.errLoad'));
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <motion.div
                    className="text-sm ui text-[rgb(var(--color-fg))]/30"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {t('profile.loading')}
                </motion.div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                {/* Magnifier — hand-drawn, replaces 🔍 emoji */}
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[rgb(var(--color-fg))]/40" aria-hidden>
                    <circle cx="10" cy="10" r="6" />
                    <line x1="14.5" y1="14.5" x2="20" y2="20" />
                </svg>
                <div className="chalk text-xl text-[var(--color-gold)]">{t('profile.notFound')}</div>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/50 max-w-xs">{error}</p>
                <button
                    onClick={onBackToGame}
                    className="mt-4 px-6 py-2.5 rounded-xl border border-[var(--color-gold)]/30 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors"
                >
                    ← {t('profile.backToGame')}
                </button>
            </div>
        );
    }

    const { rank, nextRank, progress } = getRank(profile.totalXP);
    const mastery = !nextRank ? getMastery(profile.totalXP) : null;
    const teacher = getTeacher(profile.activeTeacher);
    const themeColor = getThemeDisplayColor(profile.activeThemeId) ?? 'var(--color-chalk)';
    const trophies = (profile.achievements ?? [])
        .map(id => EVERY_ACHIEVEMENT.find(a => a.id === id))
        .filter(Boolean)
        .slice(0, 8);

    // Real head-to-head: same deterministic set seeded from THIS player, and —
    // if they've set a speedrun time — that time as the number to beat.
    const raceTime = profile.bestSpeedrunTime && profile.bestSpeedrunTime > 0 ? profile.bestSpeedrunTime : undefined;
    const handleChallenge = () => {
        onChallenge(opponentChallengeSeed(profile.uid), raceTime);
    };

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top,16px)+24px)] pb-20">
            <button
                onClick={onBackToGame}
                aria-label={t('profile.backToGame')}
                className="self-start text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors mb-4"
            >
                ← {t('me.back')}
            </button>

            {/* Hero: teacher portrait + name in their chalk colour */}
            <motion.div
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <svg viewBox="0 0 100 130" className="w-32 h-40 mb-2" style={{ color: themeColor }}>
                    <teacher.Portrait state="success" streak={Math.min(profile.bestStreak, 10)} />
                </svg>
                <h1 className="chalk text-3xl mb-1" style={{ color: themeColor }}>
                    {profile.displayName}
                </h1>
                <div className="text-xs ui text-[rgb(var(--color-fg))]/50 mb-1">
                    {t('profile.taughtBy', { name: teacherName(teacher.id) })}
                </div>
            </motion.div>

            {/* Rank pill */}
            <motion.div
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <span className="text-[var(--color-gold)]"><RankIcon rank={rank.name} size={18} /></span>
                <span className="chalk text-[var(--color-gold)]">{rankLabel(rank)}</span>
                {mastery && (
                    <span className="chalk text-[var(--color-skull)] border-l border-[var(--color-gold)]/30 pl-2 ml-1">
                        {t('profile.masteryPill', { level: mastery.level })}
                    </span>
                )}
            </motion.div>

            {/* Progress bar — rank progress, or mastery progress once maxed */}
            {nextRank ? (
                <div className="mt-3 w-56">
                    <div className="h-1.5 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-[var(--color-gold)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(progress * 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-1.5 text-center">
                        {t('profile.xpProgress', { xp: profile.totalXP.toLocaleString(), next: nextRank.xp.toLocaleString() })}
                    </div>
                </div>
            ) : mastery && (
                <div className="mt-3 w-56">
                    <div className="h-1.5 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-[var(--color-skull)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.round(mastery.progress * 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-1.5 text-center">
                        {t('profile.masteryProgress', { xp: profile.totalXP.toLocaleString(), level: mastery.level + 1, next: mastery.xpForNext.toLocaleString() })}
                    </div>
                </div>
            )}

            {/* Core stats */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-8 mb-2">
                <Stat
                    label={<><StatIcon>{/* check — replaces ✅ */}<path d="M5 12 l4 4 l10 -10" /></StatIcon><span>{t('me.statSolved')}</span></>}
                    value={profile.totalSolved.toLocaleString()}
                    color="rgba(var(--color-fg), 0.85)"
                />
                <Stat
                    label={<><StatIcon>{/* target — replaces 🎯 */}<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" /></StatIcon><span>{t('me.statAccuracy')}</span></>}
                    value={`${profile.accuracy}%`}
                    color="var(--color-correct)"
                />
                <Stat
                    label={<><StatIcon>{/* flame — replaces 🔥 */}<path d="M12 3 C 12 8 7 9 7 14 C 7 18 9 21 12 21 C 15 21 17 18 17 14 C 17 11 14 10 14 7 C 13 8.5 12.5 9 12 3 Z" /></StatIcon><span>{t('summary.bestStreak')}</span></>}
                    value={profile.bestStreak.toString()}
                    color="var(--color-streak-fire)"
                />
                <Stat
                    label={<>
                        <StatIcon>{/* stopwatch — replaces ⏱️ */}<circle cx="12" cy="14" r="7" /><line x1="12" y1="14" x2="15" y2="11" /><line x1="10" y1="2" x2="14" y2="2" /><line x1="12" y1="2" x2="12" y2="5" /></StatIcon>
                        <span>{t('profile.statSpeedrun')}</span>
                        {profile.speedrunHardMode && (
                            <StatIcon>{/* skull — replaces 💀 */}<path d="M20 11 C 20 6.6 16.4 4 12 4 C 7.6 4 4 6.6 4 11 C 4 13.5 5.2 14.8 6 15.5 L 6 18 C 6 19 6.5 19.5 7.5 19.5 L 16.5 19.5 C 17.5 19.5 18 19 18 18 L 18 15.5 C 18.8 14.8 20 13.5 20 11 Z" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><line x1="10" y1="19.5" x2="10" y2="16.5" /><line x1="12" y1="19.5" x2="12" y2="16.5" /><line x1="14" y1="19.5" x2="14" y2="16.5" /></StatIcon>
                        )}
                    </>}
                    value={profile.bestSpeedrunTime && profile.bestSpeedrunTime > 0 ? formatTime(profile.bestSpeedrunTime) : '—'}
                    color="var(--color-speedrun)"
                />
            </div>

            {/* Trophies */}
            {trophies.length > 0 && (
                <div className="mt-8 w-full max-w-sm">
                    <div className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase tracking-widest text-center mb-3">
                        {t('profile.recentTrophies')}
                    </div>
                    <div className="grid grid-cols-4 gap-3 justify-items-center">
                        {trophies.map(a => a && (
                            <AchievementBadge
                                key={a.id}
                                achievementId={a.id}
                                unlocked
                                name={achName(a.id)}
                                desc={achDesc(a.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Challenge CTA */}
            <motion.button
                onClick={handleChallenge}
                className="mt-10 px-8 py-3.5 rounded-2xl bg-[var(--color-gold)] text-[#1a1a2e] ui font-bold text-base shadow-[0_4px_0_rgb(var(--color-fg),0.2)] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                aria-label={t('profile.challengeCta', { name: profile.displayName })}
            >
                {/* Crossed swords — hand-drawn, replaces ⚔️ emoji */}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="4" y1="4" x2="14" y2="14" />
                    <line x1="20" y1="4" x2="10" y2="14" />
                    <line x1="11" y1="17" x2="13" y2="19" />
                    <line x1="13" y1="17" x2="11" y2="19" />
                </svg>
                <span>{raceTime
                    ? t('profile.challengeCtaBeat', { name: profile.displayName, time: formatTime(raceTime) })
                    : t('profile.challengeCta', { name: profile.displayName })}</span>
            </motion.button>

            {/* Receiver-conversion CTA — the visitor is at peak intent here
                (they came for someone's brag). Give them a real, value-led way
                in, not a throwaway text link. */}
            <button
                onClick={onBackToGame}
                className="mt-4 px-7 py-2.5 rounded-2xl border border-[var(--color-chalk)]/30 text-[rgb(var(--color-fg))]/75 ui text-sm active:scale-95 transition-all"
            >
                {t('profile.startOwn')}
            </button>
            <span className="mt-1.5 text-[10px] ui text-[rgb(var(--color-fg))]/35">
                {t('profile.sameDailyHint', { name: profile.displayName })}
            </span>
        </div>
    );
});

/** Small inline chalk icon for stat labels — shares the app's SVG conventions
 *  (24×24 viewBox, currentColor stroke). Children are the path/circle/line
 *  elements for the specific glyph. */
function StatIcon({ children }: { children: ReactNode }) {
    return (
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {children}
        </svg>
    );
}

function Stat({ label, value, color }: { label: ReactNode; value: string; color: string }) {
    return (
        <div className="text-center">
            <div className="chalk text-3xl tabular-nums" style={{ color }}>{value}</div>
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-0.5 flex items-center justify-center gap-1">{label}</div>
        </div>
    );
}
