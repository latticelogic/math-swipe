/**
 * SettingsSheet — the app's settings surface, opened from the gear at the
 * top-right of the Me tab (owner call 2026-07-16: Me is for identity +
 * progress; maintenance lives here). Contains:
 *
 *   - Language picker (shipped locales; switching persists + reloads —
 *     see src/i18n design decision 1)
 *   - Notifications opt-in (PushOptIn)
 *   - Reset stats (with the randomized confirm prompt)
 *   - Version / force-update escape hatch
 *   - Legal links + reCAPTCHA attribution
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PushOptIn } from './PushOptIn';
import { LegalFooterRow } from './LegalPages';
import { RecaptchaNotice } from './RecaptchaNotice';
import { countLabel } from '../utils/formatNumber';
import { t, getLocale, setLocale, SHIPPED_LOCALES } from '../i18n';

declare const __APP_VERSION__: string;

interface Props {
    open: boolean;
    onClose: () => void;
    uid: string | null;
    /** For the reset-confirm prompts (specific numbers > generic warnings). */
    stats: { totalXP: number; bestStreak: number; totalSolved: number };
    onReset: () => void;
}

export function SettingsSheet({ open, onClose, uid, stats, onReset }: Props) {
    const [resetConfirm, setResetConfirm] = useState<string | null>(null);
    const locale = getLocale();

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-[var(--color-overlay-dim)] z-[110] backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('settings.title')}
                        className="fixed inset-x-0 bottom-0 z-[111] bg-[var(--color-board)] border-t border-[rgb(var(--color-fg))]/15 rounded-t-3xl px-6 pt-5 pb-[calc(env(safe-area-inset-bottom,16px)+20px)] max-w-md mx-auto max-h-[85vh] overflow-y-auto md:max-w-lg md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border"
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl chalk text-[var(--color-gold)]">{t('settings.title')}</h2>
                            <button
                                onClick={onClose}
                                className="text-sm ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/75 transition-colors px-2 py-1"
                            >
                                {t('settings.done')}
                            </button>
                        </div>

                        {/* ── Language ── */}
                        <div className="mb-6">
                            <div className="text-xs ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest mb-2">
                                {t('me.language')}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {SHIPPED_LOCALES.map(l => (
                                    <button
                                        key={l.id}
                                        onClick={() => { if (l.id !== locale) setLocale(l.id); }}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm ui border transition-colors ${l.id === locale
                                            ? 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                                            : 'border-[rgb(var(--color-fg))]/10 text-[rgb(var(--color-fg))]/70 hover:border-[rgb(var(--color-fg))]/25'
                                            }`}
                                        aria-pressed={l.id === locale}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Notifications ── */}
                        <div className="mb-6">
                            <PushOptIn uid={uid} />
                        </div>

                        {/* ── Reset stats ── */}
                        <button
                            onClick={() => {
                                const prompts = [
                                    `You've earned ${stats.totalXP.toLocaleString()} points. Are you sure you want to start fresh?`,
                                    `Your ${stats.bestStreak}-streak record will be lost. Reset anyway?`,
                                    `${countLabel(stats.totalSolved, 'problem')} solved. Wipe it all?`,
                                    'A fresh start. Ready to begin again?',
                                    'All progress will be erased. Really reset?',
                                ];
                                setResetConfirm(prompts[Math.floor(Math.random() * prompts.length)]);
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-sm ui border border-[var(--color-streak-fire)]/25 text-[var(--color-streak-fire)]/80 hover:bg-[var(--color-streak-fire)]/10 transition-colors mb-6"
                        >
                            {t('settings.reset')}
                        </button>

                        {/* ── Version / force update ── */}
                        <button
                            onClick={async () => {
                                try {
                                    if ('serviceWorker' in navigator) {
                                        const regs = await navigator.serviceWorker.getRegistrations();
                                        for (const r of regs) {
                                            await r.update();
                                            if (r.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' });
                                        }
                                    }
                                } catch (err) {
                                    console.warn('[force-update] SW update failed:', err);
                                } finally {
                                    window.location.reload();
                                }
                            }}
                            className="w-full text-center text-[10px] ui text-[rgb(var(--color-fg))]/25 tracking-widest active:text-[rgb(var(--color-fg))]/50 transition-colors mb-3"
                            aria-label={t('settings.versionTap', { v: __APP_VERSION__ })}
                        >
                            {t('settings.versionTap', { v: __APP_VERSION__ })}
                        </button>

                        {/* ── Legal ── */}
                        <LegalFooterRow />
                        <RecaptchaNotice />

                        {/* Reset confirm — inside the sheet so it stacks above it */}
                        <AnimatePresence>
                            {resetConfirm && (
                                <>
                                    <motion.div
                                        className="fixed inset-0 bg-[var(--color-overlay-dim)] z-[120]"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setResetConfirm(null)}
                                    />
                                    <motion.div
                                        role="alertdialog"
                                        aria-modal="true"
                                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[121] w-[300px] bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-6 py-6 text-center"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                    >
                                        <p className="text-sm ui text-[rgb(var(--color-fg))]/75 mb-5 leading-relaxed">{resetConfirm}</p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setResetConfirm(null)}
                                                className="flex-1 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/15 text-sm ui text-[rgb(var(--color-fg))]/60 hover:bg-[rgb(var(--color-fg))]/5 transition-colors"
                                            >
                                                {t('settings.neverMind')}
                                            </button>
                                            <button
                                                onClick={() => { onReset(); setResetConfirm(null); onClose(); }}
                                                className="flex-1 py-2.5 rounded-xl border border-[var(--color-streak-fire)]/40 bg-[var(--color-streak-fire)]/10 text-sm ui text-[var(--color-streak-fire)] hover:bg-[var(--color-streak-fire)]/20 transition-colors"
                                            >
                                                {t('settings.resetCta')}
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
