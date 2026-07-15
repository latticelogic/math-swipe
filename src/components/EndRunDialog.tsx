/**
 * EndRunDialog — the free-play session boundary.
 *
 * Free play is infinite, so a run has no natural end — the one place it ends
 * is when the player leaves the game tab. Instead of silently banking the run
 * (the old behavior — testers lost their share moment), we ask: end the run
 * (bank it + show the summary/share screen, then continue to the tab they
 * chose) or keep playing (stay in the run).
 *
 * Only shown for INFINITE play with answers on the board. Finite modes
 * (daily / challenge / speedrun) end themselves and never route here.
 * Backdrop tap = keep playing (the non-destructive default).
 */

import { motion, AnimatePresence } from 'framer-motion';
import { t, tCount } from '../i18n';

interface Props {
    open: boolean;
    /** Problems answered this run — shown so the choice is informed. */
    answered: number;
    /** Points on the board this run. */
    score: number;
    /** Bank the run → summary → navigate. */
    onEnd: () => void;
    /** Cancel: stay on the game tab, run untouched. */
    onKeepPlaying: () => void;
}

export function EndRunDialog({ open, answered, score, onEnd, onKeepPlaying }: Props) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-[var(--color-overlay-dim)] z-[220] backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onKeepPlaying}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="end-run-title"
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[221] w-[300px] bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-6 py-6 text-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                    >
                        <h2 id="end-run-title" className="text-xl chalk text-[var(--color-gold)] mb-1.5">
                            {t('endRun.title')}
                        </h2>
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/55 mb-5">
                            {t('endRun.stats', { problems: tCount('count.problem', answered), pts: score })}
                        </p>
                        <button
                            onClick={onEnd}
                            className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-[var(--color-board)] text-sm ui font-semibold active:scale-[0.98] transition-transform"
                        >
                            {t('endRun.end')}
                        </button>
                        <button
                            onClick={onKeepPlaying}
                            className="w-full mt-2.5 py-2 text-sm ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70 transition-colors"
                        >
                            {t('endRun.keep')}
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
