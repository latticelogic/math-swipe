import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '../i18n';
import { LegalFooterRow } from './LegalPages';

/**
 * The purchase-success celebration. Shown once, right after a lifetime unlock
 * completes on ANY channel (native Play billing, TWA Digital Goods, or the
 * Airwallex web return). The person just paid — this makes it a moment instead
 * of a silent state flip.
 *
 * Design: the app's core motif is the compass/beacon (the launcher icon, the
 * "Beacon" referral trail). Buying lights the beacon — the whole map is yours.
 * A hand-drawn compass rose draws itself and glows inside a gold particle
 * burst, in the same visual language as MilestoneBurst (radial framer-motion
 * particles, --color-gold, chalk display type). This is the ONE place outside
 * streak milestones + achievement unlocks that earns particles — a purchase is
 * the biggest milestone there is.
 *
 * Tone: warm, specific, grateful. Not hype. "Lifetime" is accurate (it's a
 * one-time lifetime unlock), so "yours for good" is a fact, not a forward-
 * binding "free forever" promise about the free tier.
 */
export const PurchaseCelebration = memo(function PurchaseCelebration({ onClose }: { onClose: () => void }) {
    const reduce = useReducedMotion();

    return (
        <motion.div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-8 text-center bg-[rgb(var(--color-board))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            role="dialog"
            aria-modal="true"
            aria-label={t('celebrate.title')}
        >
            {/* Beacon: compass rose + gold burst */}
            <div className="relative mb-10 flex items-center justify-center" style={{ color: 'var(--color-gold)' }}>
                {!reduce && BURST.map((p, i) => (
                    <motion.span
                        key={i}
                        className="absolute"
                        initial={{ x: 0, y: 0, opacity: 0, scale: 0.2 }}
                        animate={{ x: p.dx, y: p.dy, opacity: [0, 1, 1, 0], scale: [0.2, 1, 1, 0.4] }}
                        transition={{ duration: 1.8, ease: 'easeOut', times: [0, 0.2, 0.7, 1], delay: 0.15 }}
                    >
                        <Spark />
                    </motion.span>
                ))}
                {/* Soft radiant ring behind the compass */}
                <motion.span
                    className="absolute rounded-full"
                    style={{ width: 180, height: 180, boxShadow: '0 0 60px 12px rgba(var(--color-gold-rgb, 214 178 74), 0.35)' }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 0.9, 0.5], scale: [0.6, 1.15, 1] }}
                    transition={{ duration: 1.4, ease: 'easeOut' }}
                />
                <motion.div
                    className="relative drop-shadow-[0_0_28px_currentColor]"
                    initial={{ scale: 0, rotate: -35, opacity: 0 }}
                    animate={{ scale: [0, 1.18, 1], rotate: [-35, 4, 0], opacity: 1 }}
                    transition={{ duration: reduce ? 0.2 : 1.1, times: [0, 0.55, 1], ease: 'easeOut' }}
                >
                    <CompassRose />
                </motion.div>
            </div>

            <motion.h2
                className="chalk text-5xl mb-4 text-[var(--color-gold)]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.4, duration: 0.4 }}
            >
                {t('celebrate.title')}
            </motion.h2>

            <motion.p
                className="ui text-base leading-relaxed text-[rgb(var(--color-fg))]/75 max-w-xs mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.55, duration: 0.4 }}
            >
                {t('celebrate.body')}
            </motion.p>

            {/* What just opened up — specific, not "everything". These are the
                real Pro set (see CLAUDE.md): full trick library, advanced modes,
                Pro cosmetics. Teachers are NOT gated, so they're not listed. */}
            <motion.ul
                className="ui text-sm text-[rgb(var(--color-fg))]/70 space-y-2.5 mb-9 text-left"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.62, duration: 0.4 }}
            >
                {['celebrate.unlockTricks', 'celebrate.unlockModes', 'celebrate.unlockCosmetics'].map((k) => (
                    <li key={k} className="flex items-center gap-2.5">
                        <Check />
                        <span>{t(k as Parameters<typeof t>[0])}</span>
                    </li>
                ))}
            </motion.ul>

            <motion.button
                onClick={onClose}
                className="w-full max-w-xs py-3.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-board)] text-base ui font-semibold hover:bg-[var(--color-gold)]/90 transition-colors active:scale-[0.98]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.7, duration: 0.4 }}
            >
                {t('celebrate.cta')}
            </motion.button>

            <div className="absolute bottom-6 left-0 right-0">
                <LegalFooterRow />
            </div>
        </motion.div>
    );
});

/** The app's compass/beacon motif: a 4-point rose inside a ring of beads. */
function CompassRose() {
    const beads = Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        return { cx: 50 + Math.cos(a) * 40, cy: 50 + Math.sin(a) * 40 };
    });
    return (
        <svg viewBox="0 0 100 100" width="120" height="120" fill="none"
            stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            {beads.map((b, i) => (
                <circle key={i} cx={b.cx} cy={b.cy} r="2.4" fill="currentColor" stroke="none" />
            ))}
            {/* Four-point compass star */}
            <path d="M50 12 L 57 43 L 88 50 L 57 57 L 50 88 L 43 57 L 12 50 L 43 43 Z" />
            <circle cx="50" cy="50" r="4.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

const Spark = () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="2" x2="8" y2="14" />
        <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
);

/** Small hand-drawn check for the unlock list. */
const Check = () => (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="var(--color-gold)"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M4 11 L 8 15 L 16 5" />
    </svg>
);

/** Two rings of sparks, like the higher MilestoneBurst tiers. */
const BURST = (() => {
    const ring = (count: number, radius: number) =>
        Array.from({ length: count }, (_, i) => {
            const a = (i / count) * Math.PI * 2 - Math.PI / 2;
            return { dx: Math.cos(a) * radius, dy: Math.sin(a) * radius };
        });
    return [...ring(10, 120), ...ring(14, 190)];
})();
