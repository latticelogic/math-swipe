/**
 * StreakGarden — a small chalk grid on the Me tab that makes the day-streak
 * *visible*. The last 21 days are drawn as cells; the current consecutive
 * streak (ending on the last day played) is filled in, so the user sees the
 * chain they're building and the gap if they miss a day. "Don't break the
 * chain", drawn instead of stated.
 *
 * Tap (or hover) a day to see its detail — problems, accuracy, points —
 * from the per-day ledger (stats.dayLog, owner request 2026-07-16).
 */

import { useState } from 'react';
import { shortDateLabel, t } from '../i18n';

const CELLS = 21; // 3 weeks

type DayEntry = { solved: number; correct: number; xp: number };

/** Whole-day number (local) for a YYYY-MM-DD string, or null if unparseable. */
function dayNumber(dateStr: string): number | null {
    if (!dateStr) return null;
    const t = Date.parse(`${dateStr}T12:00:00`);
    return Number.isNaN(t) ? null : Math.floor(t / 86_400_000);
}

/** YYYY-MM-DD key for `today` shifted back by `daysAgo`. */
function dateKeyAgo(today: string, daysAgo: number): string {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - daysAgo);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function StreakGarden({
    dayStreak,
    lastPlayedDate,
    today,
    dayLog,
}: {
    dayStreak: number;
    lastPlayedDate: string;
    today: string;
    dayLog?: Record<string, DayEntry>;
}) {
    const [selected, setSelected] = useState<number | null>(null);
    const todayNum = dayNumber(today);
    const lastNum = dayNumber(lastPlayedDate);
    if (todayNum === null) return null;
    // Nothing to show for a brand-new user — don't render an empty garden.
    if (dayStreak <= 0 || lastNum === null) return null;

    // A cell's date is "in the streak" when it falls within
    // [lastPlayed - (dayStreak-1), lastPlayed].
    const streakStart = lastNum - (dayStreak - 1);

    // With a per-day ledger, ONLY days actually played fill gold — a no-play
    // day inside the streak window (a shield/freeze day) must not look like a
    // played day (tester report 2026-07-17: gold cell whose detail said "no
    // play"). Users from before the ledger existed have no dayLog, so fall
    // back to the streak-window fill rather than showing an empty garden.
    const hasLedger = !!dayLog && Object.keys(dayLog).length > 0;
    // The garden starts at the player's FIRST day of play — days before that
    // are pre-install history and must not render at all (owner call
    // 2026-07-17: "Jun 27 — no play" for a day before the app existed for
    // this player is noise). Earliest ledger entry wins; streakStart is the
    // fallback signal for pre-ledger users.
    const ledgerNums = hasLedger
        ? Object.keys(dayLog).map(dayNumber).filter((n): n is number => n !== null)
        : [];
    const firstNum = Math.min(streakStart, ...(ledgerNums.length ? ledgerNums : [streakStart]));
    const cells = Array.from({ length: CELLS }, (_, i) => {
        const daysAgo = CELLS - 1 - i; // oldest → today
        const cellNum = todayNum - daysAgo;
        const key = dateKeyAgo(today, daysAgo);
        const entry = dayLog?.[key];
        const filled = hasLedger
            ? (entry?.solved ?? 0) > 0
            : (cellNum >= streakStart && cellNum <= lastNum);
        const isToday = cellNum === todayNum;
        // Invisible spacer (not a cell): keeps today anchored bottom-right
        // while drawing nothing before the first day of play.
        const preHistory = cellNum < firstNum;
        return { filled, isToday, key, entry, preHistory };
    });

    const sel = selected !== null ? cells[selected] : null;
    const selLabel = sel
        ? (() => {
            const dateLabel = shortDateLabel(new Date(`${sel.key}T12:00:00`));
            if (!sel.entry || sel.entry.solved === 0) return t('streak.dayNoPlay', { date: dateLabel });
            const acc = Math.round((sel.entry.correct / sel.entry.solved) * 100);
            return t('streak.dayDetail', { date: dateLabel, solved: sel.entry.solved, acc, xp: sel.entry.xp });
        })()
        : null;

    return (
        <div className="flex flex-col items-center">
            <div className="grid grid-cols-7 gap-1.5 w-full max-w-[240px] mx-auto">
                {cells.map((c, i) => (
                    c.preHistory ? (
                        <div key={c.key} className="aspect-square" aria-hidden />
                    ) : (
                    <button
                        key={c.key}
                        aria-label={shortDateLabel(new Date(c.key))}
                        onClick={() => setSelected(prev => (prev === i ? null : i))}
                        onMouseEnter={() => setSelected(i)}
                        onMouseLeave={() => setSelected(prev => (prev === i ? null : prev))}
                        className={[
                            'aspect-square rounded-[5px] transition-colors',
                            // Played → gold fill. No play → uncolored, a quiet
                            // SOLID line (owner call 2026-07-17: a missed day
                            // must never read as a played one).
                            c.filled
                                ? 'bg-[var(--color-gold)]/80'
                                : 'border border-solid border-[rgb(var(--color-fg))]/20',
                            c.isToday && !c.filled ? 'border-[var(--color-gold)]/60' : '',
                            c.isToday && c.filled ? 'ring-1 ring-[rgb(var(--color-fg))]/40' : '',
                            selected === i ? 'ring-2 ring-[rgb(var(--color-fg))]/50' : '',
                        ].join(' ')}
                    />
                    )
                ))}
            </div>
            {/* Per-day detail — a quiet line under the grid (no floating
                tooltip: it must work identically for touch and mouse). */}
            <div className="h-5 mt-2 text-[11px] ui text-[rgb(var(--color-fg))]/55" aria-live="polite">
                {selLabel ?? ''}
            </div>
        </div>
    );
}
