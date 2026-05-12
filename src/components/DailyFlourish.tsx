import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * Quiet one-per-day moment when the player gets their first correct answer
 * of the day. Smaller than a milestone burst — a subtle banner that
 * appears, says "Day N • welcome back", and fades out in ~2 seconds.
 *
 * Design intent: dignified, not loud. We want returning players to feel
 * noticed, not bombarded. Lower-stakes than streak milestones (which
 * earn flashier theatre because they're harder to reach).
 */
interface Props {
    /** The current day-streak count to display. 0 or 1 = first day. */
    dayStreak: number;
}

export const DailyFlourish = memo(function DailyFlourish({ dayStreak }: Props) {
    // Pick a copy variant that fits the streak — first-time vs returning vs
    // long-streak. All tone-matched: warm but not childish.
    const label =
        dayStreak <= 1 ? 'First answer of the day' :
            dayStreak < 7 ? `Day ${dayStreak} · welcome back` :
                dayStreak < 30 ? `Day ${dayStreak} · streak strong` :
                    `Day ${dayStreak} · legendary streak`;

    return (
        <motion.div
            className="pointer-events-none absolute left-1/2 top-[36%] -translate-x-1/2 z-40"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -4], scale: [0.96, 1, 1, 1] }}
            transition={{ duration: 2.0, times: [0, 0.15, 0.7, 1], ease: 'easeOut' }}
        >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)] backdrop-blur-sm">
                {/* Small sunrise/dawn icon — feels apropos for "of the day" */}
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 16 L 20 16" />
                    <path d="M6 16 A 6 6 0 0 1 18 16" />
                    <line x1="12" y1="4" x2="12" y2="6" />
                    <line x1="4.5" y1="8" x2="6" y2="9" />
                    <line x1="19.5" y1="8" x2="18" y2="9" />
                    <line x1="2" y1="16" x2="4" y2="16" />
                    <line x1="20" y1="16" x2="22" y2="16" />
                </svg>
                <span className="text-xs ui font-semibold whitespace-nowrap">{label}</span>
            </div>
        </motion.div>
    );
});
