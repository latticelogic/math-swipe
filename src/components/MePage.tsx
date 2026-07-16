import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { useStats } from '../hooks/useStats';
import { typesForBand, type AgeBand } from '../utils/questionTypes';
import { t } from '../i18n';
import { ACHIEVEMENTS, HARD_MODE_ACHIEVEMENTS, TIMED_MODE_ACHIEVEMENTS, ULTIMATE_ACHIEVEMENTS, EVERY_ACHIEVEMENT } from '../utils/achievements';
import { AchievementBadge } from './AchievementBadge';
import { StreakGarden } from './StreakGarden';
import { CHALK_THEMES, type ChalkTheme } from '../utils/chalkThemes';
import { SWIPE_TRAILS } from '../utils/trails';
import { TEACHERS, DEFAULT_TEACHER_ID } from '../domains/math/teachers';
import { RANKS, getRank, getMastery } from '../domains/math/ranks';
import { TrialCountdownChip } from './TrialModals';
import { SettingsSheet } from './SettingsSheet';
import { InstallPill } from './InstallPrompt';
import { RankIcon } from './RankIcon';
import { TrailIcon } from './TrailIcon';
import { FlameIcon, TargetIcon, CheckIcon, CalendarIcon, LockIcon } from './icons';
import { CategoryIcon } from './CategoryIcon';
import { todayKey } from '../utils/dateKey';

interface Props {
    stats: ReturnType<typeof useStats>['stats'];
    accuracy: number;
    sessionScore: number;
    sessionStreak: number;
    unlocked: Set<string>;
    activeCostume: string;
    onCostumeChange: (id: string) => void;
    activeTheme: string;
    onThemeChange: (theme: ChalkTheme) => void;
    activeTrailId?: string;
    onTrailChange: (id: string) => void;
    displayName: string;
    onDisplayNameChange: (name: string) => Promise<void>;
    isAnonymous: boolean;
    onLinkGoogle: () => Promise<void>;
    onLinkApple?: () => Promise<void>;
    onSendEmailLink: (email: string) => Promise<void>;
    /** Transient outcome of the last sign-in action (success/error), shown as a
     *  small banner and auto-cleared. */
    authMessage?: string | null;
    onClearAuthMessage?: () => void;
    ageBand: AgeBand;
    activeTeacherId: string;
    onTeacherChange: (id: string) => void;
    uid: string | null;
    /** 14-day-trial state. When 'trial', a small countdown chip renders
     *  below the profile area so users always know where they stand.
     *  'paid' and 'expired' both render no chip (paid: no chrome cost,
     *  expired: the paywall is already taking over the surface). */
    entitlementStatus?: import('../utils/entitlement').EntitlementStatus;
    entitlementDaysLeft?: number;
    /** Pro-pack gating: the pro-tagged cosmetics unlock only when paid; tapping
     *  a locked one opens the upsell. */
    hasPro?: boolean;
    onRequestPro?: () => void;
    /** Called when the user taps the countdown chip → triggers unlock
     *  flow (mock in dev, Stripe Checkout in Phase 4). */
    onUnlock?: () => void;
}

// A proper toothed cog for the settings gear, computed once. 8 trapezoidal
// teeth (rise from valley radius r to tip radius R over ±w), closed into one
// path; the SVG adds the hub hole. Replaces the old 8-spoke shape that read
// as a sun.
const GEAR_PATH = (() => {
    const cx = 12, cy = 12, R = 9, r = 6.2, w = (13 * Math.PI) / 180;
    const p = (a: number, rad: number) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`;
    let d = '';
    for (let i = 0; i < 8; i++) {
        const c = (i * 45 * Math.PI) / 180;
        d += `${i === 0 ? 'M' : 'L'}${p(c - w, r)}L${p(c - w, R)}L${p(c + w, R)}L${p(c + w, r)}`;
    }
    return `${d}Z`;
})();

// Rank ladder + getRank/getMastery helpers extracted to ../domains/math/ranks
// so the public profile page and share card can reuse them.

/** A grid of badges for one mode's achievement set (Hard / Timed / Ultimate).
 *  Pure display — the leaderboard badge-equip interaction was removed
 *  2026-07-16 (owner call). */
function ModeAchievementGrid({ achievements, cols, unlocked }: {
    achievements: readonly { id: string; name: string; desc: string }[];
    cols: string;
    unlocked: Set<string>;
}) {
    return (
        <div className={`grid ${cols} gap-3 justify-items-center`}>
            {achievements.map(a => (
                <div key={a.id}>
                    <AchievementBadge achievementId={a.id} unlocked={unlocked.has(a.id)} name={a.name} desc={a.desc} />
                </div>
            ))}
        </div>
    );
}

export const MePage = memo(function MePage({ stats, accuracy, unlocked, activeCostume, onCostumeChange, activeTheme, onThemeChange, activeTrailId, onTrailChange, displayName, onDisplayNameChange, isAnonymous, onLinkGoogle, onLinkApple, onSendEmailLink, authMessage, onClearAuthMessage, ageBand, activeTeacherId, onTeacherChange, uid, entitlementStatus, entitlementDaysLeft, onUnlock, hasPro = true, onRequestPro }: Props) {
    const [showRanks, setShowRanks] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameInput, setNameInput] = useState(displayName);
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const { rank, nextRank, progress } = getRank(stats.totalXP);
    const mastery = !nextRank ? getMastery(stats.totalXP) : null;

    const today = todayKey();
    const dailyDoneToday = stats.lastDailyDate === today && stats.todayDailySolved > 0;
    const dailyAcc = dailyDoneToday ? Math.round((stats.todayDailyCorrect / stats.todayDailySolved) * 100) : null;

    // Auto-clear the sign-in outcome banner after a few seconds.
    useEffect(() => {
        if (!authMessage) return;
        const t = setTimeout(() => onClearAuthMessage?.(), 4500);
        return () => clearTimeout(t);
    }, [authMessage, onClearAuthMessage]);

    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 pt-4 pb-20 relative">
            {/* Settings gear — top-right of Me (owner call: maintenance lives
                in the sheet, the page itself is identity + progress) */}
            <button
                onClick={() => setSettingsOpen(true)}
                aria-label={t('settings.gearAria')}
                className="absolute top-3 right-4 z-10 w-10 h-10 flex items-center justify-center text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors"
            >
                {/* Hand-drawn gear (a toothed cog — not the old radial-spoke
                    shape, which read as a sun). Body is a closed 8-tooth path;
                    the inner circle is the hub hole. */}
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={GEAR_PATH} />
                    <circle cx="12" cy="12" r="2.6" />
                </svg>
            </button>

            {/* Display name + edit */}
            <div className="flex items-center gap-2 mb-2">
                {editingName ? (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (nameInput.trim()) {
                            await onDisplayNameChange(nameInput.trim());
                        }
                        setEditingName(false);
                    }} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            maxLength={20}
                            autoFocus
                            className="bg-transparent border-b border-[var(--color-chalk)]/30 text-center text-sm ui text-[rgb(var(--color-fg))]/70 outline-none w-32 py-1"
                        />
                        <button type="submit" className="text-xs ui text-[var(--color-gold)]">✓</button>
                        <button type="button" onClick={() => { setEditingName(false); setNameInput(displayName); }} className="text-xs ui text-[rgb(var(--color-fg))]/30">✕</button>
                    </form>
                ) : (
                    <>
                        {/* The name is the page's identity anchor — big chalk type;
                            the pencil alone signals editability (owner call: the
                            old "Claim a @username" line below was noise). */}
                        <span className="text-2xl chalk text-[rgb(var(--color-fg))]/85">{displayName}</span>
                        <button
                            onClick={() => { setNameInput(displayName); setEditingName(true); }}
                            aria-label="Edit name"
                            className="text-[rgb(var(--color-fg))]/25 hover:text-[rgb(var(--color-fg))]/45 transition-colors"
                        >
                            {/* Pencil — hand-drawn, matches the chalk aesthetic */}
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21 L 9 19 L 19 9 L 15 5 L 5 15 Z" />
                                <line x1="14" y1="6" x2="18" y2="10" />
                            </svg>
                        </button>
                    </>
                )}
            </div>


            {/* Trial countdown chip — only renders during the 14-day window.
                Tappable to open the unlock flow directly. */}
            {entitlementStatus && entitlementDaysLeft !== undefined && (
                <div className="flex justify-center">
                    <TrialCountdownChip
                        status={entitlementStatus}
                        daysLeft={entitlementDaysLeft}
                        onClick={onUnlock}
                    />
                </div>
            )}

            {/* Sign-in outcome banner — success or a human-readable error, so
                auth failures are no longer silent console.warns. Kept outside
                the card so a success still shows after the user is signed in. */}
            {authMessage && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 text-xs ui text-[var(--color-gold)] text-center max-w-sm">
                    {authMessage}
                </div>
            )}

            {/* ── Save-progress / sign-in card ── One clear, always-visible block
                for anonymous users (replaces the old split nudge + escape hatch).
                Purpose-led CTA + first-class method buttons. */}
            {isAnonymous && (() => {
                // Name what actually lives only on this device so signing in
                // reads as protecting real progress. Falls back to a generic
                // line for a brand-new player with nothing yet.
                const bits: string[] = [];
                if (stats.dayStreak >= 2) bits.push(`${stats.dayStreak}-day streak`);
                if (stats.totalXP > 0) bits.push(`${stats.totalXP.toLocaleString()} XP`);
                if (unlocked.size > 0) bits.push(`${unlocked.size} achievement${unlocked.size === 1 ? '' : 's'}`);
                const summary = bits.join(' · ');
                // The composed progress summary ("7-day streak · 230 XP") stays
                // English-only for now (Tier 2 — dynamic fragment composition
                // doesn't translate safely without per-language templates).
                const line = summary
                    ? `Your ${summary} live only on this device.`
                    : t('me.signinBody');
                const appleEnabled = import.meta.env.VITE_ENABLE_APPLE === '1';
                const btn = 'w-full flex items-center justify-center gap-2 text-sm ui font-semibold rounded-xl py-2.5 border transition-colors';

                return (
                    <div className="w-full max-w-sm mb-5 rounded-2xl border border-[rgb(var(--color-fg))]/10 bg-[rgb(var(--color-fg))]/[0.03] p-4">
                        {showEmailInput ? (
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!emailInput.includes('@')) return;
                                    try { await onSendEmailLink(emailInput); setEmailSent(true); setShowEmailInput(false); }
                                    catch (err) { console.warn('Email link failed:', err); }
                                }}
                            >
                                <div className="text-sm ui font-semibold text-[rgb(var(--color-fg))]/85 text-center mb-1">{t('me.emailTitle')}</div>
                                <div className="text-[11px] ui text-[rgb(var(--color-fg))]/45 text-center mb-3">{t('me.emailHint')}</div>
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                    placeholder="your@email.com"
                                    autoFocus
                                    className="w-full text-sm ui bg-[rgb(var(--color-fg))]/5 border border-[rgb(var(--color-fg))]/10 rounded-xl px-3 py-2.5 text-center text-[rgb(var(--color-fg))]/80 placeholder:text-[rgb(var(--color-fg))]/25 outline-none focus:border-[var(--color-gold)]/40 mb-2"
                                />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setShowEmailInput(false)} className="flex-1 text-xs ui text-[rgb(var(--color-fg))]/50 rounded-xl py-2 border border-[rgb(var(--color-fg))]/10">{t('me.back')}</button>
                                    <button type="submit" className="flex-1 text-sm ui font-semibold text-[var(--color-gold)] bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 rounded-xl py-2">{t('me.sendLink')}</button>
                                </div>
                            </form>
                        ) : emailSent ? (
                            <div className="text-center py-2">
                                <div className="text-sm ui font-semibold text-[var(--color-correct)] mb-1">{t('me.checkEmail')}</div>
                                <div className="text-[11px] ui text-[rgb(var(--color-fg))]/45">{t('me.checkEmailHint')}</div>
                            </div>
                        ) : (
                            <>
                                <div className="text-sm ui font-semibold text-[rgb(var(--color-fg))]/85 text-center mb-1">{t('me.signinTitle')}</div>
                                <div className="text-[11px] ui text-[rgb(var(--color-fg))]/50 text-center mb-3.5 leading-relaxed">{line} {t('me.signinCta')}</div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={onLinkGoogle} className={`${btn} border-[rgb(var(--color-fg))]/20 text-[rgb(var(--color-fg))]/85 hover:border-[rgb(var(--color-fg))]/35`}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                        {t('me.google')}
                                    </button>
                                    {appleEnabled && onLinkApple && (
                                        <button onClick={onLinkApple} className={`${btn} border-[rgb(var(--color-fg))]/20 text-[rgb(var(--color-fg))]/85 hover:border-[rgb(var(--color-fg))]/35`}>
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16.365 1.43c0 1.14-.42 2.2-1.12 3-.76.9-2 1.6-3.05 1.52-.13-1.1.42-2.27 1.08-3 .74-.83 2.06-1.46 3.09-1.52.02.16.02.32.02.5zM20.5 17.2c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.78-4.04-3.34C-.06 16.1-.4 11.02 1.9 8.3c.9-1.08 2.32-1.76 3.66-1.76 1.36 0 2.22.75 3.35.75 1.09 0 1.76-.75 3.33-.75 1.19 0 2.45.65 3.35 1.77-2.94 1.61-2.46 5.82.91 6.89z" /></svg>
                                            {t('me.apple')}
                                        </button>
                                    )}
                                    <button onClick={() => setShowEmailInput(true)} className={`${btn} border-[rgb(var(--color-fg))]/20 text-[rgb(var(--color-fg))]/85 hover:border-[rgb(var(--color-fg))]/35`}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                                        {t('me.email')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );
            })()}

            <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="mb-2 flex justify-center text-[var(--color-gold)]"><RankIcon rank={rank.name} size={52} /></div>
                <button
                    onClick={() => setShowRanks(true)}
                    className="text-2xl chalk text-[var(--color-gold)] leading-tight hover:opacity-80 transition-opacity"
                >
                    {rank.name}
                </button>
                {/* Progress to next rank */}
                {nextRank && (
                    <div className="mt-3 w-48 mx-auto">
                        <div className="h-1.5 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-[var(--color-gold)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round(progress * 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                        {/* Next rank's NAME stays hidden (owner call) — the
                            reveal is part of the reward. */}
                        <div className="text-xs ui text-[rgb(var(--color-fg))]/50 mt-1.5">
                            {stats.totalXP.toLocaleString()} / {nextRank.xp.toLocaleString()}
                        </div>
                    </div>
                )}
                {!nextRank && mastery && (
                    <div className="mt-3 w-52 mx-auto">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs ui font-semibold text-[var(--color-skull)]">Mastery Lv. {mastery.level}</span>
                            <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{stats.totalXP.toLocaleString()} XP</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[rgb(var(--color-fg))]/10 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full bg-[var(--color-skull)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.round(mastery.progress * 100)}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                        </div>
                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/35 mt-1">
                            → Mastery Lv. {mastery.level + 1} at {mastery.xpForNext.toLocaleString()} XP
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Core stats — horizontal, chalk style */}
            <div className="flex gap-6 mb-8">
                <div className="text-center">
                    <div className="text-2xl chalk text-[var(--color-streak-fire)]">
                        {stats.bestStreak}
                    </div>
                    <div className="text-xs ui text-[rgb(var(--color-fg))]/60 flex items-center justify-center gap-1"><FlameIcon size={12} /> {t('me.statStreak')}</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl chalk text-[var(--color-correct)]">
                        {accuracy}%
                    </div>
                    <div className="text-xs ui text-[rgb(var(--color-fg))]/40 flex items-center justify-center gap-1"><TargetIcon size={12} /> {t('me.statAccuracy')}</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl chalk text-[rgb(var(--color-fg))]/70">
                        {stats.totalSolved}
                    </div>
                    <div className="text-xs ui text-[rgb(var(--color-fg))]/40 flex items-center justify-center gap-1"><CheckIcon size={12} /> {t('me.statSolved')}</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl chalk text-[var(--color-gold)]">
                        {dailyAcc !== null ? `${dailyAcc}%` : '-'}
                    </div>
                    <div className="text-xs ui text-[rgb(var(--color-fg))]/60 flex items-center justify-center gap-1"><CalendarIcon size={12} /> {t('me.statDaily')}</div>
                </div>
            </div>

            {/* Streak garden — the day-streak, drawn */}
            <div className="w-full max-w-sm mb-3">
                <StreakGarden dayStreak={stats.dayStreak} lastPlayedDate={stats.lastPlayedDate} today={today} dayLog={stats.dayLog} />
            </div>

            {/* (Daily-streak chip removed 2026-07-16 — owner call. The streak
                still accrues + rewards; the grid above already shows the habit.) */}

            {/* ("Invite a friend" button removed 2026-07-16 — owner call. The
                referral loop lives on through shared results/challenge links.) */}

            {/* Per question type row */}
            <div className="w-full max-w-sm">
                <div className="text-xs ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                    {t('me.byType')}
                </div>
                <div className="grid grid-cols-5 gap-2 justify-items-center">
                    {typesForBand(ageBand).filter(t => !t.id.startsWith('mix-') && t.id !== 'daily' && t.id !== 'challenge').map(t => {
                        const ts = stats.byType[t.id] ?? { solved: 0, correct: 0 };
                        const pct = ts.solved > 0 ? Math.round((ts.correct / ts.solved) * 100) : 0;
                        return (
                            <div key={t.id} className="flex flex-col items-center gap-1">
                                <div className="text-[rgb(var(--color-fg))]/50">
                                    <CategoryIcon id={t.id} size={22} />
                                </div>
                                <div className={`text-sm ui font-semibold ${ts.solved === 0 ? 'text-[rgb(var(--color-fg))]/20' :
                                    pct >= 80 ? 'text-[var(--color-correct)]' :
                                        pct >= 50 ? 'text-[var(--color-gold)]' :
                                            'text-[rgb(var(--color-fg))]/50'
                                    }`}>
                                    {ts.solved === 0 ? '—' : `${pct}%`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Teacher (companion) picker — drives the in-game character + voice.
                Customizations (teacher / chalk / trail) sit ABOVE the long
                achievements list — owner call 2026-07-16. */}
            <div className="w-full max-w-sm mt-8">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-1">
                    TEACHER
                </div>
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 text-center mb-3">
                    Each one has their own voice. Some auto-swap when you change modes.
                </div>
                <div className="grid grid-cols-4 gap-3 justify-items-center">
                    {TEACHERS.map(t => {
                        // Free tier = the default teacher only (owner call
                        // 2026-07-16); paid users still EARN the rest via the
                        // existing unlock checks.
                        const isUnlocked = t.isDefault || (hasPro && (t.unlock?.check(stats) ?? false));
                        const isActive = (activeTeacherId || DEFAULT_TEACHER_ID) === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => isUnlocked && onTeacherChange(t.id)}
                                disabled={!isUnlocked}
                                title={isUnlocked ? `${t.name} — ${t.tagline}` : (t.unlock?.reason ?? 'Locked')}
                                aria-label={isUnlocked ? `Pick ${t.name}` : `Locked: ${t.name}`}
                                className={`relative w-16 h-20 rounded-xl border flex flex-col items-center justify-end px-1 pb-1 transition-all ${isActive
                                    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/8'
                                    : isUnlocked
                                        ? 'border-[rgb(var(--color-fg))]/15 hover:border-[rgb(var(--color-fg))]/35 active:scale-95'
                                        : 'border-[rgb(var(--color-fg))]/8 opacity-40 cursor-not-allowed'}`}
                            >
                                <svg viewBox="0 0 100 130" className="w-12 h-14" style={{ color: 'var(--color-chalk)' }}>
                                    <t.Portrait state="idle" streak={0} />
                                </svg>
                                <span className={`text-[9px] ui leading-tight text-center mt-0.5 ${isActive ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/55'}`}>
                                    {t.name.replace(/^(Mr\.?|Ms\.?|Dr\.?|Coach) /, '')}
                                </span>
                                {!isUnlocked && (
                                    <span className="absolute top-1 right-1 text-[rgb(var(--color-fg))]/50"><LockIcon size={10} /></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Chalk Themes — locked ones faded like achievements */}
            <div className="w-full max-w-sm mt-6">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                    CHALK COLOR
                </div>
                <div className="grid grid-cols-6 gap-2.5 justify-items-center max-w-[300px] mx-auto">
                    {CHALK_THEMES.map(t => {
                        const rankIdx = RANKS.findIndex(r => r.name === rank.name);
                        const rankOk = rankIdx >= (t.minLevel - 1);
                        // Mode-exclusive unlock checks
                        const hardOk = !t.hardModeOnly || (stats.hardModeSolved >= (t.hardModeMin ?? 0));
                        const timedOk = !t.timedModeOnly || (stats.timedModeSolved >= (t.timedModeMin ?? 0));
                        const ultimateOk = !t.ultimateOnly || (stats.ultimateSolved >= (t.ultimateMin ?? 0));
                        const masteryOk = !t.masteryMin || ((mastery?.level ?? 0) >= t.masteryMin);
                        // Free tier = classic + sky only (owner call 2026-07-16);
                        // everything beyond is part of the Pro set. Paid users
                        // still earn the rank/mode-gated colors by playing.
                        const freeTier = t.id === 'classic' || t.id === 'sky';
                        const proOk = hasPro || freeTier;
                        const isAvailable = rankOk && hardOk && timedOk && ultimateOk && masteryOk && proOk;
                        const isActive = activeTheme === t.id;
                        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                        const swatchColor = isLight ? t.lightColor : t.color;
                        return (
                            <button
                                key={t.id}
                                onClick={() => { if (isAvailable) onThemeChange(t); else if (!proOk) onRequestPro?.(); }}
                                title={`${t.name}${!isAvailable ? ' (locked)' : ''}`}
                                className={`w-8 h-8 rounded-full border-2 transition-all relative ${isActive ? 'border-[var(--color-gold)] scale-110' :
                                    isAvailable ? 'border-[rgb(var(--color-fg))]/20 hover:border-[rgb(var(--color-fg))]/40' :
                                        'border-[rgb(var(--color-fg))]/8 opacity-40 cursor-not-allowed'
                                    }`}
                                style={{ backgroundColor: swatchColor }}
                            >
                                {!isAvailable && (
                                    <span className="absolute -top-1 -right-1 text-[rgb(var(--color-fg))]/60"><LockIcon size={9} /></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Swipe Trails */}
            <div className="w-full max-w-sm mt-6">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                    SWIPE TRAIL
                </div>
                <div className="flex justify-center gap-2.5 flex-wrap">
                    {SWIPE_TRAILS.map(t => {
                        const rankIdx = RANKS.findIndex(r => r.name === rank.name);
                        // Free tier = the default chalk-dust trail only (owner
                        // call 2026-07-16); the rest is Pro, with progression
                        // gates still applying for paid users.
                        const isUnlocked =
                            (hasPro || t.id === 'chalk-dust') &&
                            (!t.minLevel || rankIdx >= t.minLevel - 1) &&
                            (!t.minStreak || stats.bestStreak >= t.minStreak) &&
                            (!t.hardModeOnly || stats.hardModeSessions > 0) &&
                            (!t.timedModeOnly || stats.timedModeSessions > 0) &&
                            (!t.ultimateOnly || stats.ultimateSessions > 0);

                        const isActive = (activeTrailId || 'chalk-dust') === t.id;

                        return (
                            <button
                                key={t.id}
                                onClick={() => { if (isUnlocked) onTrailChange(t.id); else if (!hasPro && t.id !== 'chalk-dust') onRequestPro?.(); }}
                                title={`${t.name}${!isUnlocked ? ' (Locked)' : ''}`}
                                className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all 
                                    ${isActive ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 scale-105' :
                                        isUnlocked ? 'border-[rgb(var(--color-fg))]/20 hover:border-[rgb(var(--color-fg))]/40' :
                                            'border-[rgb(var(--color-fg))]/5 opacity-30 cursor-not-allowed bg-[var(--color-surface)]'
                                    }`}
                            >
                                <span className={isActive ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/70'}>
                                    <TrailIcon id={t.id} size={24} />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Achievements — after the customizations (owner call) */}
            <div className="w-full max-w-sm mt-8">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-1">
                    achievements · {[...unlocked].length}/{EVERY_ACHIEVEMENT.length}
                </div>
                {/* (Badge-equip on the leaderboard was removed 2026-07-16 —
                    owner call. Achievements are trophies; costumes still equip.) */}
                <div className="grid grid-cols-4 gap-3 justify-items-center">
                    {ACHIEVEMENTS.map(a => {
                        const isUnlocked = unlocked.has(a.id);
                        const hasCostume = ['streak-5', 'streak-20', 'sharpshooter', 'math-machine', 'century'].includes(a.id);
                        const isActive = activeCostume === a.id;
                        return (
                            <div
                                key={a.id}
                                onClick={() => {
                                    if (!isUnlocked || !hasCostume) return;
                                    onCostumeChange(isActive ? '' : a.id);
                                }}
                                className={isUnlocked && hasCostume ? 'cursor-pointer' : ''}
                            >
                                <AchievementBadge
                                    achievementId={a.id}
                                    unlocked={isUnlocked}
                                    equipped={isActive}
                                    name={a.name}
                                    desc={isActive ? 'costume on' : a.desc}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Hard Mode */}
                <div className="mt-5 text-xs ui text-[var(--color-skull)] uppercase tracking-widest text-center mb-2">
                    hard mode
                </div>
                <ModeAchievementGrid achievements={HARD_MODE_ACHIEVEMENTS} cols="grid-cols-3" unlocked={unlocked} />

                {/* Timed Mode */}
                <div className="mt-5 text-xs ui text-[var(--color-timed)] uppercase tracking-widest text-center mb-2">
                    timed mode
                </div>
                <ModeAchievementGrid achievements={TIMED_MODE_ACHIEVEMENTS} cols="grid-cols-4" unlocked={unlocked} />

                {/* Ultimate Mode */}
                <div className="mt-5 text-xs ui text-[var(--color-ultimate)] uppercase tracking-widest text-center mb-2">
                    ultimate
                </div>
                <ModeAchievementGrid achievements={ULTIMATE_ACHIEVEMENTS} cols="grid-cols-3" unlocked={unlocked} />
            </div>

            {/* Rank list modal */}
            <AnimatePresence>
                {showRanks && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowRanks(false)}
                        />
                        <motion.div
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 max-h-[75vh] overflow-y-auto w-[300px]"
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            transition={{ duration: 0.15 }}
                        >
                            <h3 className="text-lg chalk text-[var(--color-gold)] text-center mb-4">Ranks</h3>
                            <div className="space-y-2">
                                {RANKS.map((r) => {
                                    const isCurrent = r.name === rank.name;
                                    const isReached = stats.totalXP >= r.xp;
                                    return (
                                        <div
                                            key={r.name}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isCurrent
                                                ? 'bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30'
                                                : ''
                                                }`}
                                        >
                                            <span className="text-[rgb(var(--color-fg))]/70"><RankIcon rank={r.name} size={22} /></span>
                                            <div className="flex-1">
                                                <div className={`text-sm ui font-semibold ${isCurrent ? 'text-[var(--color-gold)]' :
                                                    isReached ? 'text-[rgb(var(--color-fg))]/70' : 'text-[rgb(var(--color-fg))]/30'
                                                    }`}>
                                                    {r.name}
                                                    {isCurrent && <span className="ml-1 text-xs">← you</span>}
                                                </div>
                                                <div className="text-[11px] ui text-[rgb(var(--color-fg))]/25">
                                                    {r.xp === 0 ? 'Starting rank' : `${r.xp.toLocaleString()} points`}
                                                </div>
                                            </div>
                                            {isReached && (
                                                <span className="text-xs text-[var(--color-correct)]">✓</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setShowRanks(false)}
                                className="w-full mt-4 py-2 text-sm ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                            >
                                close
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Settings sheet — language, notifications, version, legal */}
            <SettingsSheet
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                uid={uid}
            />
            {/* "Install app" pill — only renders when the browser supports
                install AND the app isn't already running standalone AND
                the user hasn't permanently dismissed. iOS Safari gets a
                tap-to-show-instructions modal since iOS has no install API. */}
            <InstallPill />
        </div>
    );
});
