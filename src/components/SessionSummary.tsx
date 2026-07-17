import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValueEvent } from 'framer-motion';
import { buildProfileSlug } from '../utils/profileSlug';
import { IosSessionEndPrompt } from './InstallPrompt';
// Share text/URL composition is shared with the game-rail share button —
// single source of truth in utils/sharePayload.ts.
import { buildSharePayload, formatTime } from '../utils/sharePayload';
import { t } from '../i18n';

interface Props {
    solved: number;
    correct: number;
    bestStreak: number;
    accuracy: number;
    xpEarned: number;
    answerHistory: boolean[];
    questionType: string;
    visible: boolean;
    onDismiss: () => void;
    hardMode?: boolean;
    timedMode?: boolean;
    speedrunFinalTime?: number | null;
    isNewSpeedrunRecord?: boolean;
    /** Used to build the public profile URL in the share payload — when both
     *  are present, the share link points at /u/<name>-<uid4> instead of a
     *  one-shot challenge URL. The profile page has higher hook conversion
     *  because visitors see the brag *before* the math screen. */
    displayName?: string;
    uid?: string | null;
    /** Player's claimed @handle — when present, the share URL uses the
     *  clean `/u/<handle>` form instead of `/u/<displayName>-<uid4>`. */
    claimedHandle?: string | null;
    /** When the just-finished session was itself a seeded challenge, this
     *  is the seed the receiver should replay. Lets "Challenge a Friend"
     *  forward the *same* problems instead of minting a fresh, unrelated
     *  seed (which made the old "challenge" link asymmetric in name only). */
    challengeId?: string | null;
    /** When THIS session was played against a friend's target (arrived via
     *  ?target=/?targetTime=), the number they set — so we can resolve the
     *  head-to-head ("You won by 12") at the end instead of dropping the
     *  comparison silently. */
    challengeTarget?: { score: number | null; timeMs: number | null } | null;
    /** Running lifetime XP (post-session) — drives the "N XP from <rank>"
     *  one-more teaser at peak momentum. */
    totalXP?: number;
    /** Called after a share completes successfully (native share resolved
     *  OR clipboard write succeeded OR modal share confirmed). Drives the
     *  "Spread the Word" first-share achievement. */
    onShared?: () => void;
}

export const SessionSummary = memo(function SessionSummary({
    solved, bestStreak: streak, accuracy, xpEarned, answerHistory, questionType, visible, onDismiss,
    hardMode, timedMode, speedrunFinalTime, isNewSpeedrunRecord,
    displayName, uid, claimedHandle, challengeTarget, onShared,
}: Props) {
    const [isSharing, setIsSharing] = useState(false);

    // Rolling count-up for XP
    const xpSpring = useSpring(0, { stiffness: 60, damping: 20 });
    const [xpDisplay, setXpDisplay] = useState(0);

    useMotionValueEvent(xpSpring, 'change', (v) => {
        setXpDisplay(Math.round(v));
    });

    useEffect(() => {
        if (visible) {
            xpSpring.jump(0);
            // Small delay so the modal animates in first
            const t = setTimeout(() => xpSpring.set(xpEarned), 300);
            return () => clearTimeout(t);
        }
    }, [visible, xpEarned, xpSpring]);

    // Sharing is DIRECT (owner calls 2026-07-16, after tester sessions):
    // no PNG card generation (nobody waits for an image; the text artifact —
    // headline + green/red grid + link — works everywhere instantly) and no
    // destination-picker sheet (native OS share on mobile; instant clipboard
    // copy on desktop). See docs/README.md "Sharing decisions".
    const [copied, setCopied] = useState(false);
    const handleShare = async () => {
        if (isSharing) return;
        setIsSharing(true);
        // Prefer the public profile URL when we have a uid + name — the
        // visitor lands on the brag page first, which converts way better
        // than dropping them straight into a math problem.
        const profileUrl = (uid && displayName)
            ? `${window.location.origin}/u/${buildProfileSlug(displayName, uid, claimedHandle ?? null)}`
            : null;
        const { text, url: challengeUrl } = buildSharePayload(
            xpEarned, streak, accuracy, answerHistory, questionType,
            hardMode, timedMode, speedrunFinalTime, profileUrl,
        );
        try {
            if (typeof navigator.share === 'function') {
                // Mobile: native OS share, text-only — instant.
                await navigator.share({ text, url: challengeUrl });
                onShared?.();
            } else {
                // Desktop: copy the full artifact and confirm inline.
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
                onShared?.();
            }
        } catch (err) {
            // AbortError = user-cancelled and isn't actually a problem.
            if (!(err instanceof Error) || err.name !== 'AbortError') {
                console.error('[share] share failed:', err);
                // Last resort: clipboard.
                try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                    onShared?.();
                } catch { /* nothing left to try */ }
            }
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-dim)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onDismiss}
                >
                    <motion.div
                        className="bg-[var(--color-board)] border border-[rgb(var(--color-fg))]/15 rounded-3xl px-8 py-6 max-w-xs w-full text-center relative overflow-hidden"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* (The off-screen 1080×1920 share-card render was removed
                            2026-07-16 with image generation — owner call.) */}

                        {/* Emoji rain — performance-based floating emojis */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                            {(() => {
                                const emojis: string[] = [];
                                if (streak >= 5) emojis.push('🔥');
                                if (accuracy >= 90) emojis.push('⭐');
                                if (accuracy === 100) emojis.push('🎯', '💯');
                                if (solved >= 20) emojis.push('💪');
                                if (emojis.length === 0) emojis.push('✨');
                                return Array.from({ length: 12 }, (_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute text-lg"
                                        style={{ left: `${8 + (i * 7.5) % 84}%` }}
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 300, opacity: [0, 0.7, 0.7, 0] }}
                                        transition={{
                                            duration: 2.5 + Math.random() * 1.5,
                                            delay: 0.3 + i * 0.15,
                                            ease: 'easeIn',
                                        }}
                                    >
                                        {emojis[i % emojis.length]}
                                    </motion.div>
                                ));
                            })()}
                        </div>
                        {questionType === 'speedrun' && speedrunFinalTime ? (
                            <>
                                {/* Stopwatch — hand-drawn, replaces ⏱️ emoji */}
                                <motion.svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 mx-auto text-[var(--color-gold)]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden>
                                    <circle cx="12" cy="14" r="7" />
                                    <line x1="12" y1="14" x2="15" y2="11" />
                                    <line x1="10" y1="2" x2="14" y2="2" />
                                    <line x1="12" y1="2" x2="12" y2="5" />
                                </motion.svg>
                                <motion.h3 className="text-2xl chalk text-[var(--color-gold)] mb-1">
                                    {t('summary.speedrunCleared')}
                                </motion.h3>
                                {isNewSpeedrunRecord && (
                                    <div className="text-xs ui font-bold text-[var(--color-gold)] uppercase tracking-widest mb-4">
                                        {t('summary.newRecord')}
                                    </div>
                                )}
                                {!isNewSpeedrunRecord && <div className="mb-4" />}
                            </>
                        ) : accuracy === 100 ? (
                            <>
                                {/* Trophy — hand-drawn, replaces 🏆 emoji */}
                                <motion.svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 mx-auto text-[var(--color-gold)]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} aria-hidden>
                                    <path d="M7 3 L 7 11 C 7 14 9 16 12 16 C 15 16 17 14 17 11 L 17 3 Z" />
                                    <path d="M7 5 C 4 5 3 7 3 9 C 3 11 5 12 7 12" />
                                    <path d="M17 5 C 20 5 21 7 21 9 C 21 11 19 12 17 12" />
                                    <line x1="12" y1="16" x2="12" y2="19" />
                                    <line x1="9" y1="19" x2="15" y2="19" />
                                </motion.svg>
                                <motion.h3
                                    className="text-2xl chalk text-[var(--color-gold)] mb-4"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.3, 1] }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                >
                                    {t('summary.perfect')}
                                </motion.h3>
                            </>
                        ) : (
                            <>
                                {/* Notebook — hand-drawn, replaces 📝 emoji */}
                                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 mx-auto text-[var(--color-chalk)]" aria-hidden>
                                    <rect x="5" y="3" width="14" height="18" rx="1" />
                                    <line x1="9" y1="8" x2="15" y2="8" />
                                    <line x1="9" y1="12" x2="15" y2="12" />
                                    <line x1="9" y1="16" x2="13" y2="16" />
                                </svg>
                                {(hardMode || timedMode) && (
                                    <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-1 flex items-center justify-center gap-1">
                                        {/* Skull (hard) + stopwatch (timed) — hand-drawn, replace 💀/⏱️ emoji */}
                                        {hardMode && (
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                <path d="M20 11 C 20 6.6 16.4 4 12 4 C 7.6 4 4 6.6 4 11 C 4 13.5 5.2 14.8 6 15.5 L 6 18 C 6 19 6.5 19.5 7.5 19.5 L 16.5 19.5 C 17.5 19.5 18 19 18 18 L 18 15.5 C 18.8 14.8 20 13.5 20 11 Z" />
                                                <circle cx="9" cy="12" r="1.5" />
                                                <circle cx="15" cy="12" r="1.5" />
                                                <line x1="10" y1="19.5" x2="10" y2="16.5" />
                                                <line x1="12" y1="19.5" x2="12" y2="16.5" />
                                                <line x1="14" y1="19.5" x2="14" y2="16.5" />
                                            </svg>
                                        )}
                                        {timedMode && (
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                                <circle cx="12" cy="14" r="7" />
                                                <line x1="12" y1="14" x2="15" y2="11" />
                                                <line x1="10" y1="2" x2="14" y2="2" />
                                                <line x1="12" y1="2" x2="12" y2="5" />
                                            </svg>
                                        )}
                                        <span className="uppercase">{hardMode && timedMode ? t('summary.modeUltimate') : hardMode ? t('summary.modeHard') : t('summary.modeTimed')}</span>
                                    </div>
                                )}
                                <h3 className="text-xl chalk text-[var(--color-gold)] mb-4">{t('summary.complete')}</h3>
                            </>
                        )}

                        <div className="flex justify-center gap-6 mb-4">
                            <div className="text-center">
                                <div className="text-2xl chalk text-[rgb(var(--color-fg))]/80">{solved}</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{t('me.statSolved')}</div>
                            </div>
                            <div className="text-center min-w-[60px]">
                                {questionType === 'speedrun' && speedrunFinalTime ? (
                                    <>
                                        <div className="text-xl mt-1 chalk text-[var(--color-correct)]">{formatTime(speedrunFinalTime)}</div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{t('summary.clearTime')}</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-2xl chalk text-[var(--color-correct)]">{accuracy}%</div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{t('me.statAccuracy')}</div>
                                    </>
                                )}
                            </div>
                            <div className="text-center">
                                {/* Number + flame — hand-drawn SVG replaces the 🔥 emoji */}
                                <div className="text-2xl chalk text-[var(--color-streak-fire)] flex items-center justify-center gap-1">
                                    <span>{streak}</span>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <path d="M12 3 C 12 8 7 9 7 14 C 7 18 9 21 12 21 C 15 21 17 18 17 14 C 17 11 14 10 14 7 C 13 8.5 12.5 9 12 3 Z" />
                                    </svg>
                                </div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">{t('summary.bestStreak')}</div>
                            </div>
                        </div>

                        {/* Answer history grid */}
                        {answerHistory.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-[3px] mb-4 max-w-[220px] mx-auto">
                                {answerHistory.map((ok, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.02 }}
                                        className={`w-4 h-4 rounded-sm ${ok ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-wrong)]'}`}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="text-lg chalk text-[var(--color-gold)] mb-4 tabular-nums">{t('summary.points', { points: xpDisplay })}</div>

                        {/* (Next-rank teaser removed 2026-07-16 — owner call:
                            the next rank's name stays a surprise.) */}

                        {/* Head-to-head resolution — when this session was played
                            against a friend's target, settle it out loud instead
                            of dropping the comparison. Closes the daily/challenge
                            "you vs them" loop and nudges a rematch. */}
                        {challengeTarget && (challengeTarget.score != null || (challengeTarget.timeMs != null && !!speedrunFinalTime)) && (() => {
                            const byScore = challengeTarget.score != null;
                            const won = byScore
                                ? xpEarned >= (challengeTarget.score ?? 0)
                                : !!(speedrunFinalTime && challengeTarget.timeMs != null && speedrunFinalTime <= challengeTarget.timeMs);
                            const mine = byScore ? t('summary.unitPts', { pts: xpEarned }) : (speedrunFinalTime ? formatTime(speedrunFinalTime) : '—');
                            const theirs = byScore ? t('summary.unitPts', { pts: challengeTarget.score ?? 0 }) : formatTime(challengeTarget.timeMs ?? 0);
                            const diff = byScore
                                ? Math.abs(xpEarned - (challengeTarget.score ?? 0))
                                : Math.abs((speedrunFinalTime ?? 0) - (challengeTarget.timeMs ?? 0));
                            const diffLabel = byScore ? t('summary.unitPts', { pts: diff }) : formatTime(diff);
                            return (
                                <div className={`w-full rounded-xl border mb-3 px-3 py-2.5 ${won ? 'border-[var(--color-correct)]/40 bg-[var(--color-correct)]/5' : 'border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5'}`}>
                                    <div className={`text-sm ui font-semibold ${won ? 'text-[var(--color-correct)]' : 'text-[var(--color-gold)]'}`}>
                                        {won ? t('summary.wonBy', { diff: diffLabel }) : t('summary.shortBy', { diff: diffLabel })}
                                    </div>
                                    <div className="text-[11px] ui text-[rgb(var(--color-fg))]/50 mt-0.5">
                                        {won ? t('summary.headToHead.won', { mine, theirs }) : t('summary.headToHead.lost', { mine, theirs })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Share button */}
                        <motion.button
                            onClick={handleShare}
                            disabled={isSharing}
                            className={`w-full py-2.5 rounded-xl border text-sm ui mb-3 transition-colors flex items-center justify-center gap-1.5 ${isSharing ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/10 text-[var(--color-gold)]/50' :
                                'bg-[var(--color-gold)]/20 border-[var(--color-gold)]/30 text-[var(--color-gold)] active:bg-[var(--color-gold)]/30'
                                }`}
                            whileTap={!isSharing ? { scale: 0.95 } : undefined}
                        >
                            {/* Share glyph — hand-drawn box + up-arrow, replaces 📤 emoji */}
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M12 3 L 12 15" />
                                <path d="M8 7 L 12 3 L 16 7" />
                                <path d="M5 12 L 5 20 L 19 20 L 19 12" />
                            </svg>
                            <span>{copied ? t('rail.resultCopied') : t('summary.shareResult')}</span>
                        </motion.button>

                        {/* ("Challenge a Friend" removed 2026-07-16 — owner call
                            after testing: it duplicated Share Result while implying
                            real in-game PvP that doesn't exist. Incoming ?c=/?target=
                            links still work; Share Result carries the loop.) */}

                        {/* iOS-only end-of-session install nudge. Only renders on
                            iOS Safari when the app isn't already installed and
                            the user hasn't dismissed this specific prompt. The
                            highest-attention moment in the app for the strongest
                            install pitch ("save your streak"). See
                            InstallPrompt.tsx for the rules. */}
                        <IosSessionEndPrompt visible={visible} />

                        <button
                            onClick={onDismiss}
                            className="text-xs ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 transition-colors"
                        >
                            {t('summary.tapContinue')}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
});
