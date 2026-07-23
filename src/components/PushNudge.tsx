import { useState } from 'react';
import { motion } from 'framer-motion';
import { enablePush } from '../utils/push';
import { t } from '../i18n';

/**
 * A soft, once-per-user prompt to turn on the daily reminder — shown at a good
 * moment (after an engaged session, between sessions), NOT on launch. Daily
 * reminders are the retention lever for a daily game, but only if we ask
 * warmly and honor what the player's built: the copy leads with their streak
 * when they have one. Restrained, dismissible, and never shown again once
 * answered (App.tsx guards on localStorage).
 */
export function PushNudge({ uid, dayStreak, onClose }: { uid: string; dayStreak: number; onClose: () => void }) {
    const [busy, setBusy] = useState(false);
    const hasStreak = dayStreak >= 2;

    async function enable() {
        setBusy(true);
        try { await enablePush(uid, { dailyEnabled: true, pingsEnabled: false }); }
        catch { /* denial/failure is fine — the toggle still lives in Settings */ }
        finally { setBusy(false); onClose(); }
    }

    return (
        <motion.div
            className="fixed inset-0 z-[58] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-6 sm:pb-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} role="dialog" aria-modal="true"
        >
            <motion.div
                className="w-full max-w-sm rounded-3xl bg-[rgb(var(--color-board))] border border-[rgb(var(--color-fg))]/10 p-6 text-center"
                initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="text-[var(--color-gold)] mb-4 flex justify-center">
                    <svg viewBox="0 0 80 80" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M40 72 C 22 72 14 56 18 42 C 22 48 26 48 28 44 C 24 30 32 14 40 6 C 40 20 52 22 56 32 C 60 26 64 26 64 32 C 70 46 60 72 40 72 Z" />
                    </svg>
                </div>
                <h3 className="chalk text-2xl text-[var(--color-gold)] mb-2">
                    {hasStreak ? t('push.nudgeTitleStreak', { days: dayStreak }) : t('push.nudgeTitleNew')}
                </h3>
                <p className="ui text-sm text-[rgb(var(--color-fg))]/70 leading-relaxed mb-5">
                    {t('push.nudgeBody')}
                </p>
                <button
                    onClick={enable}
                    disabled={busy}
                    className="w-full py-3 rounded-2xl bg-[var(--color-gold)] text-[var(--color-board)] text-base ui font-semibold active:scale-[0.98] disabled:opacity-60"
                >
                    {t('push.nudgeYes')}
                </button>
                <button onClick={onClose} className="w-full py-2.5 mt-2 text-sm ui text-[rgb(var(--color-fg))]/45">
                    {t('push.nudgeNo')}
                </button>
            </motion.div>
        </motion.div>
    );
}
