/**
 * SettingsSheet — the app's settings surface, opened from the gear at the
 * top-right of the Me tab (owner call 2026-07-16: Me is for identity +
 * progress; maintenance lives here). Contains:
 *
 *   - Language picker (shipped locales; switching persists + reloads —
 *     see src/i18n design decision 1)
 *   - Sound effects toggle (opt-in, default off)
 *   - Notifications opt-in (PushOptIn)
 *   - Version / force-update escape hatch
 *   - Legal links + reCAPTCHA attribution
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PushOptIn } from './PushOptIn';
import { LegalFooterRow } from './LegalPages';
import { RecaptchaNotice } from './RecaptchaNotice';
import { t, getLocale, setLocale, SHIPPED_LOCALES } from '../i18n';
import { isSoundOn, setSoundOn, soundCorrect } from '../utils/sound';

declare const __APP_VERSION__: string;

interface Props {
    open: boolean;
    onClose: () => void;
    uid: string | null;
}

export function SettingsSheet({ open, onClose, uid }: Props) {
    const locale = getLocale();
    const [soundOn, setSoundOnState] = useState(isSoundOn());

    // Latest deployed version — /version.json is emitted at build time, so
    // comparing it to the baked-in __APP_VERSION__ says whether THIS running
    // bundle is current ("up to date") or stale ("tap to get vX"). null =
    // check unavailable (offline) → fall back to the neutral label.
    const [latest, setLatest] = useState<string | null>(null);
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        fetch('/version.json', { cache: 'no-store' })
            .then(r => r.json())
            .then((j: { version?: string }) => { if (!cancelled && j.version) setLatest(j.version); })
            .catch(() => { /* offline — keep neutral label */ });
        return () => { cancelled = true; };
    }, [open]);
    const versionLabel = latest === null
        ? t('settings.versionTap', { v: __APP_VERSION__ })
        : latest === __APP_VERSION__
            ? t('settings.upToDate', { v: __APP_VERSION__ })
            : t('settings.updateAvailable', { v: __APP_VERSION__, n: latest });

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

                        {/* ── Sound ── (opt-in; a tap plays a sample so the
                            user hears what they're enabling) */}
                        <button
                            onClick={() => {
                                const next = !soundOn;
                                setSoundOn(next);       // persists + warms the AudioContext on this gesture
                                setSoundOnState(next);
                                if (next) soundCorrect(); // preview the "correct" tone
                            }}
                            role="switch"
                            aria-checked={soundOn}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[rgb(var(--color-fg))]/10 mb-4 hover:border-[rgb(var(--color-fg))]/25 transition-colors"
                        >
                            <span className="text-sm ui text-[rgb(var(--color-fg))]/80">{t('settings.sound')}</span>
                            <span className={`relative w-10 h-6 rounded-full transition-colors ${soundOn ? 'bg-[var(--color-gold)]/70' : 'bg-[rgb(var(--color-fg))]/15'}`}>
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[var(--color-board)] transition-all ${soundOn ? 'left-[18px]' : 'left-0.5'}`} />
                            </span>
                        </button>

                        {/* ── Notifications ── */}
                        <div className="mb-6">
                            <PushOptIn uid={uid} />
                        </div>

                        {/* (Reset stats removed 2026-07-16 — owner call.) */}

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
                            className={`w-full text-center text-[10px] ui tracking-widest transition-colors mb-3 ${latest !== null && latest !== __APP_VERSION__
                                ? 'text-[var(--color-gold)]/70 active:text-[var(--color-gold)]'
                                : 'text-[rgb(var(--color-fg))]/25 active:text-[rgb(var(--color-fg))]/50'}`}
                            aria-label={versionLabel}
                        >
                            {versionLabel}
                        </button>

                        {/* ── Legal ── */}
                        <LegalFooterRow />
                        <RecaptchaNotice />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
