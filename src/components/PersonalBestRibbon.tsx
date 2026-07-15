/**
 * PersonalBestRibbon — the moment you pass your own all-time best streak.
 * Replaces the old generic "NEW PERSONAL BEST!" text with a hand-drawn award
 * ribbon and the specific number you just beat, so it celebrates *you*, not a
 * threshold. Hand-drawn SVG, no emoji, warm + specific copy.
 */

import { motion } from 'framer-motion';

export function PersonalBestRibbon({ streak }: { streak: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="absolute left-1/2 -translate-x-1/2 top-[16%] z-40 flex flex-col items-center pointer-events-none"
        >
            {/* Hand-drawn award ribbon: a medallion with two tails. */}
            <svg
                viewBox="0 0 48 60"
                width="48" height="60"
                fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden
                className="text-[var(--color-gold)]"
            >
                {/* Tails */}
                <path d="M18 34 L 13 54 L 20 49 L 24 55 L 28 49 L 35 54 L 30 34" />
                {/* Medallion */}
                <circle cx="24" cy="20" r="15" />
                <circle cx="24" cy="20" r="9" className="opacity-60" />
                {/* Little star spark in the centre */}
                <path d="M24 15 L 25.5 19 L 29.5 20 L 25.5 21 L 24 25 L 22.5 21 L 18.5 20 L 22.5 19 Z" />
            </svg>

            <div className="mt-1 text-base chalk text-[var(--color-gold)] whitespace-nowrap">
                New personal best
            </div>
            <div className="text-xs ui text-[rgb(var(--color-fg))]/70 whitespace-nowrap">
                {streak === 1 ? 'Your best yet' : `${streak} in a row`}
            </div>
        </motion.div>
    );
}
