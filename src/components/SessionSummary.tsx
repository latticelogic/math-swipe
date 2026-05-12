import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValueEvent } from 'framer-motion';
import { createChallengeId } from '../utils/dailyChallenge';
import { ShareSheet } from './ShareSheet';
import { buildProfileSlug } from '../utils/profileSlug';
import { IosSessionEndPrompt } from './InstallPrompt';

/** Short, human-readable date stamp for the daily-challenge share card.
 *  "May 12" — used as a Wordle-style conversation hook so the artifact
 *  signals *which* daily was solved. */
function shortDateStamp(): string {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
    /** Called after a share completes successfully (native share resolved
     *  OR clipboard write succeeded OR modal share confirmed). Drives the
     *  "Spread the Word" first-share achievement. */
    onShared?: () => void;
}

function formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(2)}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s}s`;
}

/** Compose the share payload + URL together so callers don't fork on URL
 *  generation. Returning both lets the modal show the URL separately (one-tap
 *  copy) while the text remains the full social-friendly caption.
 *
 *  When `profileUrl` is provided we use the profile page; otherwise we fall
 *  back to a one-shot challenge URL. The profile route is the better hook —
 *  visitors see the brag *before* the math screen, so click-through to play
 *  is higher. */
function buildSharePayload(
    xp: number, streak: number, accuracy: number,
    history: boolean[], questionType: string,
    hardMode?: boolean, timedMode?: boolean,
    speedrunTime?: number | null,
    profileUrl?: string | null,
): { text: string; url: string } {
    const emojis = history.map(ok => ok ? '🟩' : '🟥');
    const emojiRows: string[] = [];
    for (let i = 0; i < emojis.length; i += 10) {
        emojiRows.push(emojis.slice(i, i + 10).join(''));
    }

    const typeLabel = questionType.startsWith('mix-') ? 'Mix' : questionType.charAt(0).toUpperCase() + questionType.slice(1);
    const modeTag = hardMode && timedMode ? ' 💀⏱️ ULTIMATE' : hardMode ? ' 💀 HARD' : timedMode ? ' ⏱️ TIMED' : '';
    // Punchier headlines — first line is what platforms show as preview, so make
    // it count. Leads with the score/streak/time, brand fades to second line.
    // The daily case gets a date stamp so the artifact carries social context
    // ("got the May 12") — same trick Wordle uses to make shares conversational.
    const headline = questionType === 'daily'
        ? `Math Swipe Daily · ${shortDateStamp()} — ${xp} pts, ${accuracy}% ${streak > 1 ? `, ${streak}🔥` : ''}`
        : questionType === 'speedrun' && speedrunTime
            ? `⏱️ Cleared 10 in ${formatTime(speedrunTime)} on Math Swipe`
            : accuracy === 100
                ? `💯 ${xp} pts, ${streak}🔥 — perfect run on Math Swipe${modeTag}`
                : `${xp} pts · ${streak}🔥 streak · ${accuracy}% — Math Swipe ${typeLabel}${modeTag}`;

    const url = profileUrl ?? `${window.location.origin}?c=${createChallengeId()}`;

    const text = [
        headline,
        '',
        ...emojiRows,
        '',
        `Can you beat me? 👉 ${url}`,
    ].join('\n');

    return { text, url };
}

export const SessionSummary = memo(function SessionSummary({
    solved, bestStreak: streak, accuracy, xpEarned, answerHistory, questionType, visible, onDismiss,
    hardMode, timedMode, speedrunFinalTime, isNewSpeedrunRecord,
    displayName, uid, claimedHandle, challengeId, onShared,
}: Props) {
    const [isSharing, setIsSharing] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    // Desktop share modal state
    const [shareSheetOpen, setShareSheetOpen] = useState(false);
    const [shareImage, setShareImage] = useState<Blob | null>(null);
    const [shareText, setShareText] = useState('');
    const [shareUrl, setShareUrl] = useState('');

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

    /** Render the off-screen share card to a PNG blob. Heavy (lazy-loads
     *  html-to-image) but only runs on demand. */
    const generateImage = useCallback(async (): Promise<Blob | null> => {
        if (!cardRef.current) return null;
        try {
            const { toBlob } = await import('html-to-image');
            return await toBlob(cardRef.current, {
                cacheBust: true,
                type: 'image/png',
                pixelRatio: 2,
                filter: (node: Node) => {
                    // Skip cross-origin <link> stylesheets to avoid CORS errors
                    if (node instanceof HTMLLinkElement && node.rel === 'stylesheet' && node.href) {
                        try { return new URL(node.href).origin === window.location.origin; }
                        catch { return true; }
                    }
                    return true;
                },
            });
        } catch {
            return null;
        }
    }, []);

    const regenerateForSheet = useCallback(async () => {
        const blob = await generateImage();
        setShareImage(blob);
    }, [generateImage]);

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
        // Capture for the sheet in case we fall through
        setShareText(text);
        setShareUrl(challengeUrl);

        try {
            // Mobile: try native OS share first — one-tap is the gold standard
            // when it's available.
            if (typeof navigator.share === 'function') {
                const blob = await generateImage();
                if (blob) {
                    const file = new File([blob], 'math-swipe-share.png', { type: 'image/png' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], text });
                        onShared?.();
                        setIsSharing(false);
                        return;
                    }
                }
                // Files unsupported but native share works — text-only path
                await navigator.share({ text, url: challengeUrl });
                onShared?.();
                setIsSharing(false);
                return;
            }

            // Desktop (or any browser without navigator.share): open the
            // proper share modal so the user actually picks a destination.
            const blob = await generateImage();
            setShareImage(blob);
            setShareSheetOpen(true);
        } catch (err) {
            // User cancelled OR native share threw — fall back to opening
            // the modal so they always have a path to actually post the card.
            // Log so real failures (permissions, file encoding, missing APIs)
            // are diagnosable from a tester's DevTools instead of silent.
            // AbortError = user-cancelled and isn't actually a problem.
            if (!(err instanceof Error) || err.name !== 'AbortError') {
                console.error('[share] native share failed, falling back to modal:', err);
            }
            setShareSheetOpen(true);
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
                        {/* Hidden Share Card for Image Generation */}
                        <div className="absolute left-[-9999px] top-[-9999px]">
                            <div
                                ref={cardRef}
                                className="w-[1080px] h-[1920px] flex flex-col items-center justify-center relative overflow-hidden chalkboard-bg p-16"
                                style={{ background: '#1a1a24' /* fallback solid for html-to-image */ }}
                            >
                                <div className="absolute inset-0 opacity-10 blur-[80px] bg-gradient-to-br from-[var(--color-speedrun)] via-transparent to-[#00FFFF]" />

                                <div className="z-10 text-center flex flex-col items-center w-full">
                                    <h1 className="text-8xl chalk text-[var(--color-gold)] mb-6">Math Swipe</h1>
                                    {/* Daily gets a date stamp instead of the plain mode tag — same Wordle
                                        trick that turns shares into "got the May 12 yet?" conversations. */}
                                    <div className="text-4xl ui text-white/50 mb-12 tracking-widest uppercase">
                                        {questionType === 'daily'
                                            ? `DAILY · ${shortDateStamp().toUpperCase()}`
                                            : hardMode && timedMode ? 'ULTIMATE'
                                            : hardMode ? 'HARD MODE'
                                            : timedMode ? 'TIMED MODE'
                                            : questionType.toUpperCase()}
                                    </div>

                                    {/* Big icon — hand-drawn SVG, matches the rest of the app's no-emoji look */}
                                    <div className="mb-6 text-white/90">
                                        {questionType === 'speedrun' ? (
                                            <svg viewBox="0 0 24 24" width="180" height="180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-speedrun)]" aria-hidden>
                                                <circle cx="12" cy="14" r="7" />
                                                <line x1="12" y1="14" x2="15" y2="11" />
                                                <line x1="10" y1="2" x2="14" y2="2" />
                                                <line x1="12" y1="2" x2="12" y2="5" />
                                            </svg>
                                        ) : accuracy === 100 ? (
                                            <svg viewBox="0 0 24 24" width="180" height="180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-gold)]" aria-hidden>
                                                <path d="M7 3 L 7 11 C 7 14 9 16 12 16 C 15 16 17 14 17 11 L 17 3 Z" />
                                                <path d="M7 5 C 4 5 3 7 3 9 C 3 11 5 12 7 12" />
                                                <path d="M17 5 C 20 5 21 7 21 9 C 21 11 19 12 17 12" />
                                                <line x1="12" y1="16" x2="12" y2="19" />
                                                <line x1="9" y1="19" x2="15" y2="19" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" width="180" height="180" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-chalk)]" aria-hidden>
                                                <rect x="5" y="3" width="14" height="18" rx="1" />
                                                <line x1="9" y1="8" x2="15" y2="8" />
                                                <line x1="9" y1="12" x2="15" y2="12" />
                                                <line x1="9" y1="16" x2="13" y2="16" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="text-8xl chalk text-white mb-14">
                                        {questionType === 'speedrun' ? 'SPEEDRUN CLEAR' : accuracy === 100 ? 'PERFECT SCORE' : 'SESSION COMPLETED'}
                                    </div>

                                    <div className="flex justify-between items-center w-[80%] mb-14 px-8 py-12 border-2 border-white/20 rounded-[3rem] bg-black/20">
                                        <div className="text-center flex-1">
                                            <div className="text-9xl chalk text-white/80">{solved}</div>
                                            <div className="text-3xl ui text-white/40 mt-4">SOLVED</div>
                                        </div>
                                        <div className="text-center flex-1">
                                            {questionType === 'speedrun' && speedrunFinalTime ? (
                                                <>
                                                    <div className="text-7xl chalk text-[var(--color-correct)] mt-4">{formatTime(speedrunFinalTime)}</div>
                                                    <div className="text-3xl ui text-white/40 mt-6">CLEAR TIME</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="text-9xl chalk text-[var(--color-correct)]">{accuracy}%</div>
                                                    <div className="text-3xl ui text-white/40 mt-4">ACCURACY</div>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-center flex-1">
                                            {/* Number + flame on one line — explicit flexbox prevents the emoji
                                                from wrapping when streak is two digits at text-9xl. */}
                                            <div className="flex items-center justify-center gap-3">
                                                <span className="text-9xl chalk text-[var(--color-streak-fire)] tabular-nums">{streak}</span>
                                                <svg viewBox="0 0 24 24" width="60" height="72" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-streak-fire)] -mb-2" aria-hidden>
                                                    <path d="M12 3 C 12 8 7 9 7 14 C 7 18 9 21 12 21 C 15 21 17 18 17 14 C 17 11 14 10 14 7 C 13 8.5 12.5 9 12 3 Z" />
                                                </svg>
                                            </div>
                                            <div className="text-3xl ui text-white/40 mt-4">STREAK</div>
                                        </div>
                                    </div>

                                    {/* Answer history grid — the Wordle hook. Big squares are the
                                        visual pattern non-players recognise; small ones don't read
                                        on a feed thumbnail. Cap at 920px so 10 squares (10×72 +
                                        9×16 = 864) sit on one line for the canonical "result row"
                                        silhouette; longer histories wrap cleanly. */}
                                    {answerHistory.length > 0 && (
                                        <div className="flex flex-wrap justify-center gap-[16px] mb-12 max-w-[920px] mx-auto">
                                            {answerHistory.map((ok, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-[72px] h-[72px] rounded-2xl ${ok ? 'bg-[var(--color-correct)]' : 'bg-[var(--color-wrong)]'}`}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="text-7xl chalk text-[var(--color-gold)] tabular-nums mb-20">
                                        + {xpEarned} XP
                                    </div>

                                    <div className="text-4xl ui text-white/60 tracking-wider">
                                        {window.location.host}
                                    </div>
                                </div>
                            </div>
                        </div>

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
                                <motion.svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 mx-auto text-[var(--color-speedrun)]" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }} aria-hidden>
                                    <circle cx="12" cy="14" r="7" />
                                    <line x1="12" y1="14" x2="15" y2="11" />
                                    <line x1="10" y1="2" x2="14" y2="2" />
                                    <line x1="12" y1="2" x2="12" y2="5" />
                                </motion.svg>
                                <motion.h3 className="text-2xl chalk text-[var(--color-gold)] mb-1">
                                    Speedrun Cleared!
                                </motion.h3>
                                {isNewSpeedrunRecord && (
                                    <div className="text-xs ui font-bold text-[var(--color-speedrun)] uppercase tracking-widest mb-4">
                                        New Record!
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
                                    Perfect
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
                                    <div className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-1">
                                        {hardMode && timedMode ? '💀⏱️ ULTIMATE MODE' : hardMode ? '💀 HARD MODE' : '⏱️ TIMED MODE'}
                                    </div>
                                )}
                                <h3 className="text-xl chalk text-[var(--color-gold)] mb-4">Session Complete</h3>
                            </>
                        )}

                        <div className="flex justify-center gap-6 mb-4">
                            <div className="text-center">
                                <div className="text-2xl chalk text-[rgb(var(--color-fg))]/80">{solved}</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">solved</div>
                            </div>
                            <div className="text-center min-w-[60px]">
                                {questionType === 'speedrun' && speedrunFinalTime ? (
                                    <>
                                        <div className="text-xl mt-1 chalk text-[var(--color-correct)]">{formatTime(speedrunFinalTime)}</div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">clear time</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-2xl chalk text-[var(--color-correct)]">{accuracy}%</div>
                                        <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">accuracy</div>
                                    </>
                                )}
                            </div>
                            <div className="text-center">
                                <div className="text-2xl chalk text-[var(--color-streak-fire)]">{streak}🔥</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">best streak</div>
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

                        <div className="text-lg chalk text-[var(--color-gold)] mb-4 tabular-nums">+{xpDisplay} pts</div>

                        {/* Share button */}
                        <motion.button
                            onClick={handleShare}
                            disabled={isSharing}
                            className={`w-full py-2.5 rounded-xl border text-sm ui mb-3 transition-colors ${isSharing ? 'bg-[var(--color-gold)]/10 border-[var(--color-gold)]/10 text-[var(--color-gold)]/50' :
                                'bg-[var(--color-gold)]/20 border-[var(--color-gold)]/30 text-[var(--color-gold)] active:bg-[var(--color-gold)]/30'
                                }`}
                            whileTap={!isSharing ? { scale: 0.95 } : undefined}
                        >
                            {isSharing ? 'Generating image…' : '📤 Share Result'}
                        </motion.button>

                        {/* "Challenge a Friend" is only shown when we can build a
                            link the friend can ACTUALLY race against:
                              • seeded challenge — replay the same seed + target score
                              • speedrun — fixed 10 problems, target the clear time
                              • daily — friend opens today's daily directly
                            For topical sessions (multiply, fractions, …) the
                            sender's problems were generated ad-hoc, so there's
                            no fair shared set; we drop the button rather than
                            mint a misleading new seed. */}
                        {(challengeId || questionType === 'speedrun' || questionType === 'daily') && (
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    let url: string;
                                    let text: string;
                                    if (questionType === 'speedrun' && speedrunFinalTime) {
                                        // Speedrun: the 10 problems aren't shareable
                                        // (they're random), but the *time target* is —
                                        // the friend starts their own speedrun and
                                        // sees "Beat 47.2s" until they do.
                                        url = `${window.location.origin}?c=${createChallengeId()}&targetTime=${Math.round(speedrunFinalTime)}`;
                                        text = `Cleared Math Swipe Speedrun in ${formatTime(speedrunFinalTime)}. Try it: ${url}`;
                                    } else if (questionType === 'daily') {
                                        // Daily: friend lands directly on today's
                                        // daily challenge — no seed needed because
                                        // generateDailyChallenge() is date-keyed.
                                        url = `${window.location.origin}?daily=1&target=${xpEarned}`;
                                        text = `Got ${xpEarned} pts on today's Math Swipe Daily. Beat me: ${url}`;
                                    } else {
                                        // Challenge: forward the seed the sender
                                        // actually played + target score so the
                                        // banner shows "Beat 145 pts".
                                        url = `${window.location.origin}?c=${challengeId}&target=${xpEarned}`;
                                        text = `Beat my ${xpEarned} pts on this Math Swipe challenge: ${url}`;
                                    }
                                    try {
                                        if (navigator.share) {
                                            await navigator.share({ text, url });
                                        } else {
                                            await navigator.clipboard.writeText(text);
                                        }
                                    } catch { /* cancelled */ }
                                }}
                                className="w-full py-2 rounded-xl border text-xs ui mb-3 border-[rgb(var(--color-fg))]/10 text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors flex items-center justify-center gap-1.5"
                            >
                                {/* Crossed swords — hand-drawn, replaces ⚔️ emoji */}
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <line x1="4" y1="4" x2="14" y2="14" />
                                    <line x1="20" y1="4" x2="10" y2="14" />
                                    <line x1="11" y1="17" x2="13" y2="19" />
                                    <line x1="13" y1="17" x2="11" y2="19" />
                                </svg>
                                <span>Challenge a Friend</span>
                            </button>
                        )}

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
                            tap to continue
                        </button>
                    </motion.div>
                </motion.div>
            )}
            {/* Desktop / fallback share modal — sibling of the summary so it
                can render above other UI even when the summary itself is
                dismissed. */}
            <ShareSheet
                open={shareSheetOpen}
                onClose={() => setShareSheetOpen(false)}
                text={shareText}
                url={shareUrl}
                imageBlob={shareImage}
                onRegenerate={regenerateForSheet}
                onShared={onShared}
            />
        </AnimatePresence>
    );
});
