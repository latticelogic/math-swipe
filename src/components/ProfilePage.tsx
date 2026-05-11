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

import { memo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { getRank } from '../domains/math/ranks';
import { getTeacher } from '../domains/math/teachers';
import { getThemeColor } from '../utils/chalkThemes';
import { AchievementBadge } from './AchievementBadge';
import { EVERY_ACHIEVEMENT } from '../utils/achievements';
import { createChallengeId } from '../utils/dailyChallenge';
import { parseProfileSlug } from '../utils/profileSlug';

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

function formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(2)}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

interface Props {
    slug: string;
    onChallenge: (challengeId: string) => void;
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
            setError('Invalid profile link.');
            setLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const q = query(
                    collection(db, 'users'),
                    where('displayName', '==', parsed.name),
                    limit(8),
                );
                const snap = await getDocs(q);
                if (cancelled) return;
                if (snap.empty) {
                    setError(`No player found for "${parsed.name}".`);
                    setLoading(false);
                    return;
                }
                // Find the doc whose uid starts with the suffix
                const match = snap.docs.find(d => d.id.toLowerCase().startsWith(parsed.uidPrefix));
                if (!match) {
                    setError(`No player matches that link.`);
                    setLoading(false);
                    return;
                }
                const data = match.data();
                setProfile({
                    uid: match.id,
                    displayName: data.displayName ?? parsed.name,
                    totalXP: data.totalXP ?? 0,
                    bestStreak: data.bestStreak ?? 0,
                    totalSolved: data.totalSolved ?? 0,
                    accuracy: data.accuracy ?? 0,
                    bestSpeedrunTime: data.bestSpeedrunTime ?? 0,
                    speedrunHardMode: data.speedrunHardMode ?? false,
                    activeThemeId: data.activeThemeId,
                    activeCostume: data.activeCostume,
                    activeBadgeId: data.activeBadgeId,
                    activeTeacher: data.preferences?.teacher,
                    achievements: Array.isArray(data.achievements) ? data.achievements : [],
                });
                setLoading(false);
            } catch (err) {
                if (cancelled) return;
                console.warn('Profile load failed:', err);
                setError('Couldn\'t load profile. Try again later.');
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
                    Loading profile…
                </motion.div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="text-4xl">🔍</div>
                <div className="chalk text-xl text-[var(--color-gold)]">Profile not found</div>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/50 max-w-xs">{error}</p>
                <button
                    onClick={onBackToGame}
                    className="mt-4 px-6 py-2.5 rounded-xl border border-[var(--color-gold)]/30 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors"
                >
                    ← Back to game
                </button>
            </div>
        );
    }

    const { rank, nextRank, progress } = getRank(profile.totalXP);
    const teacher = getTeacher(profile.activeTeacher);
    const themeColor = getThemeColor(profile.activeThemeId) ?? 'var(--color-chalk)';
    const trophies = (profile.achievements ?? [])
        .map(id => EVERY_ACHIEVEMENT.find(a => a.id === id))
        .filter(Boolean)
        .slice(0, 8);

    const handleChallenge = () => {
        const challengeId = createChallengeId();
        onChallenge(challengeId);
    };

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top,16px)+24px)] pb-20">
            <button
                onClick={onBackToGame}
                aria-label="Back to game"
                className="self-start text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors mb-4"
            >
                ← Back
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
                    Taught by {teacher.name}
                </div>
            </motion.div>

            {/* Rank pill */}
            <motion.div
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <span className="text-lg">{rank.emoji}</span>
                <span className="chalk text-[var(--color-gold)]">{rank.name}</span>
            </motion.div>

            {/* Progress bar */}
            {nextRank && (
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
                        {profile.totalXP.toLocaleString()} / {nextRank.xp.toLocaleString()} XP
                    </div>
                </div>
            )}

            {/* Core stats */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-8 mb-2">
                <Stat label="✅ solved" value={profile.totalSolved.toLocaleString()} color="rgb(var(--color-fg))/0.85" />
                <Stat label="🎯 accuracy" value={`${profile.accuracy}%`} color="var(--color-correct)" />
                <Stat label="🔥 best streak" value={profile.bestStreak.toString()} color="var(--color-streak-fire)" />
                <Stat
                    label={`⏱️ speedrun${profile.speedrunHardMode ? ' 💀' : ''}`}
                    value={profile.bestSpeedrunTime && profile.bestSpeedrunTime > 0 ? formatTime(profile.bestSpeedrunTime) : '—'}
                    color="#FF00FF"
                />
            </div>

            {/* Trophies */}
            {trophies.length > 0 && (
                <div className="mt-8 w-full max-w-sm">
                    <div className="text-xs ui text-[rgb(var(--color-fg))]/40 uppercase tracking-widest text-center mb-3">
                        recent trophies
                    </div>
                    <div className="grid grid-cols-4 gap-3 justify-items-center">
                        {trophies.map(a => a && (
                            <AchievementBadge
                                key={a.id}
                                achievementId={a.id}
                                unlocked
                                name={a.name}
                                desc={a.desc}
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
                aria-label={`Challenge ${profile.displayName}`}
            >
                <span>⚔️</span>
                <span>Challenge {profile.displayName}</span>
            </motion.button>

            <button
                onClick={onBackToGame}
                className="mt-4 text-xs ui text-[rgb(var(--color-fg))]/35 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
            >
                or play your own game →
            </button>
        </div>
    );
});

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="text-center">
            <div className="chalk text-3xl tabular-nums" style={{ color }}>{value}</div>
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-0.5">{label}</div>
        </div>
    );
}
