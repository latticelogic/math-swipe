/**
 * StreakGarden — a small chalk grid on the Me tab that makes the day-streak
 * *visible*. The last 21 days are drawn as cells; the current consecutive
 * streak (ending on the last day played) is filled in, so the user sees the
 * chain they're building and the gap if they miss a day. "Don't break the
 * chain", drawn instead of stated.
 *
 * Derived purely from dayStreak + lastPlayedDate — no extra stored history,
 * so nothing new to sync or gate in the rules.
 *
 * Tone/aesthetic: hand-drawn, no emoji, warm + specific caption.
 */

const CELLS = 21; // 3 weeks

/** Whole-day number (local) for a YYYY-MM-DD string, or null if unparseable. */
function dayNumber(dateStr: string): number | null {
    if (!dateStr) return null;
    const t = Date.parse(`${dateStr}T12:00:00`);
    return Number.isNaN(t) ? null : Math.floor(t / 86_400_000);
}

export function StreakGarden({
    dayStreak,
    lastPlayedDate,
    today,
}: {
    dayStreak: number;
    lastPlayedDate: string;
    today: string;
}) {
    const todayNum = dayNumber(today);
    const lastNum = dayNumber(lastPlayedDate);
    if (todayNum === null) return null;
    // Nothing to show for a brand-new user — don't render an empty garden.
    if (dayStreak <= 0 || lastNum === null) return null;

    // A cell's date is "in the streak" when it falls within
    // [lastPlayed - (dayStreak-1), lastPlayed].
    const streakStart = lastNum !== null && dayStreak > 0 ? lastNum - (dayStreak - 1) : null;

    const cells = Array.from({ length: CELLS }, (_, i) => {
        const cellNum = todayNum - (CELLS - 1 - i); // oldest → today
        const filled = streakStart !== null && lastNum !== null && cellNum >= streakStart && cellNum <= lastNum;
        const isToday = cellNum === todayNum;
        return { filled, isToday };
    });

    // Header + caption removed 2026-07-16 (owner calls: "your practice" was
    // self-explanatory; "N days in a row. Sketched in." was noise). The grid
    // speaks for itself.
    return (
        <div className="flex flex-col items-center">
            <div className="grid grid-cols-7 gap-1.5 w-full max-w-[240px] mx-auto">
                {cells.map((c, i) => (
                    <div
                        key={i}
                        aria-hidden
                        className={[
                            'aspect-square rounded-[5px] transition-colors',
                            c.filled
                                ? 'bg-[var(--color-gold)]/80'
                                : 'border border-dashed border-[rgb(var(--color-fg))]/15',
                            c.isToday && !c.filled ? 'border-solid border-[var(--color-gold)]/60' : '',
                            c.isToday && c.filled ? 'ring-1 ring-[rgb(var(--color-fg))]/40' : '',
                        ].join(' ')}
                    />
                ))}
            </div>
        </div>
    );
}
