import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Stats } from '../hooks/useStats';

interface Props {
    stats: Stats;
    /** When true, the recap is hidden — used to keep it off non-Game tabs and
     *  out of the way of in-progress lessons. The "already shown this week"
     *  flag is still set on the next eligible render so it doesn't pop later. */
    suppress?: boolean;
}

const RECAP_KEY = 'math-swipe-last-recap-week';

function getWeekId(): string {
    const now = new Date();
    // ISO week: Monday-based
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return `${d.getFullYear()}-W${weekNum}`;
}

/** Always-positive weekly recap card shown on first open of the week */
export function WeeklyRecap({ stats, suppress = false }: Props) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (suppress) return;
        const currentWeek = getWeekId();
        const lastShown = localStorage.getItem(RECAP_KEY);
        // Only show if it's a new week AND user has played at least one session
        if (lastShown !== currentWeek && stats.sessionsPlayed > 0) {
            queueMicrotask(() => setVisible(true));
        }
    }, [stats.sessionsPlayed, suppress]);

    // If we get suppressed while open (e.g. user navigated away), close it.
    // The setState here is a one-shot derived edge — not a feedback loop.
    useEffect(() => {
        if (suppress && visible) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVisible(false);
        }
    }, [suppress, visible]);

    const dismiss = () => {
        setVisible(false);
        localStorage.setItem(RECAP_KEY, getWeekId());
    };

    const acc = stats.totalSolved > 0 ? Math.round((stats.totalCorrect / stats.totalSolved) * 100) : 0;

    // Build the recap lines. Tone: specific facts in the user's own
    // numbers, no motivational-poster phrasing, no emoji (per the
    // chalkboard aesthetic rules in CLAUDE.md). Each line is a single
    // observation, not a cheer.
    const messages: string[] = [];
    if (stats.totalSolved > 0) messages.push(`${stats.totalSolved.toLocaleString()} problems solved.`);
    if (acc >= 90) messages.push(`${acc}% accuracy. Sharp.`);
    else if (acc >= 70) messages.push(`${acc}% accuracy — steady.`);
    else if (stats.totalSolved >= 5) messages.push(`${acc}% accuracy — getting your reps in.`);
    if (stats.bestStreak >= 10) messages.push(`Best streak: ${stats.bestStreak} in a row.`);
    if (stats.dayStreak >= 3) messages.push(`${stats.dayStreak} days in a row. A real habit.`);
    if (stats.sessionsPlayed >= 5) messages.push(`${stats.sessionsPlayed} sessions in.`);

    // Quietly-positive default for users who only just started this week
    if (messages.length === 0) messages.push(`A few problems in. The shape of a habit starting.`);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay-dim)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={dismiss}
                >
                    <motion.div
                        className="bg-[var(--color-board)] border border-[var(--color-gold)]/20 rounded-3xl px-8 py-6 max-w-xs w-full text-center"
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Hand-drawn bar chart — chalkboard aesthetic, replaces the
                            📊 emoji previously used here. Three uneven bars rising
                            left-to-right read as "growth this week" without saying it. */}
                        <svg
                            viewBox="0 0 24 24" width="32" height="32"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden
                            className="mx-auto mb-2 text-[var(--color-gold)]"
                        >
                            <line x1="4" y1="21" x2="20" y2="21" />
                            <rect x="6" y="14" width="3" height="7" />
                            <rect x="11" y="9" width="3" height="12" />
                            <rect x="16" y="5" width="3" height="16" />
                        </svg>
                        <h3 className="text-lg chalk text-[var(--color-gold)] mb-4">Your Week So Far</h3>

                        <div className="space-y-2 mb-5">
                            {messages.slice(0, 4).map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + i * 0.15 }}
                                    className="text-sm ui text-[rgb(var(--color-fg))]/60"
                                >
                                    {msg}
                                </motion.div>
                            ))}
                        </div>

                        <div className="flex justify-center gap-6 mb-4">
                            <div className="text-center">
                                <div className="text-xl chalk text-[var(--color-gold)]">{stats.totalXP.toLocaleString()}</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">total XP</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xl chalk text-[var(--color-correct)]">{acc}%</div>
                                <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">accuracy</div>
                            </div>
                            {stats.dayStreak >= 3 && (
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                        <span className="text-xl chalk text-[var(--color-streak-fire)] tabular-nums">{stats.dayStreak}</span>
                                        {/* Hand-drawn flame, matches the share-card streak cell */}
                                        <svg viewBox="0 0 24 24" width="14" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-[var(--color-streak-fire)] -mb-0.5">
                                            <path d="M12 3 C 12 8 7 9 7 14 C 7 18 9 21 12 21 C 15 21 17 18 17 14 C 17 11 14 10 14 7 C 13 8.5 12.5 9 12 3 Z" />
                                        </svg>
                                    </div>
                                    <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30">day streak</div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={dismiss}
                            className="text-xs ui text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/50 transition-colors"
                        >
                            Let's go! →
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
