/**
 * SettingsSheet — the app's settings surface, opened from the gear at the
 * top-right of the Me tab (owner call 2026-07-16: Me is for identity +
 * progress; maintenance lives here).
 *
 * Layout contract (owner call 2026-07-16): every setting is ONE consistent
 * row — attribute label on the LEFT, control (picker value / on-off) on the
 * RIGHT. Rows:
 *   - Language  → expandable row; right side shows the current language +
 *     chevron, taps open the full list (switching persists + reloads, see
 *     src/i18n design decision 1)
 *   - Sound effects → right-side on/off toggle (opt-in, default off)
 *   - Notifications → right-side on/off toggle (PushOptIn, same row style)
 * Below the rows: a subtle version/build stamp (force-update escape hatch)
 * and the legal links + reCAPTCHA attribution.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PushOptIn } from './PushOptIn';
import { LegalFooterRow } from './LegalPages';
import { RecaptchaNotice } from './RecaptchaNotice';
import { t, getLocale, setLocale, SHIPPED_LOCALES } from '../i18n';
import { isSoundOn, setSoundOn, soundCorrect } from '../utils/sound';
import { TIMED_DURATION_PRESETS } from '../engine/domain';

declare const __APP_VERSION__: string;

interface Props {
    open: boolean;
    onClose: () => void;
    uid: string | null;
    /** Dark/light mode. Dark is the default; the on-board toggle was removed
     *  (owner call 2026-07-17) — this row is now the only switch. */
    themeMode: string;
    onToggleTheme: () => void;
    /** Timed-mode countdown, seconds (one of TIMED_DURATION_PRESETS). */
    timedSecs: number;
    onTimedSecsChange: (secs: number) => void;
}

export function SettingsSheet({ open, onClose, uid, themeMode, onToggleTheme, timedSecs, onTimedSecsChange }: Props) {
    const locale = getLocale();
    const [soundOn, setSoundOnState] = useState(isSoundOn());
    const [langOpen, setLangOpen] = useState(false);
    const currentLangLabel = SHIPPED_LOCALES.find(l => l.id === locale)?.label ?? 'English';

    // Latest deployed version — /version.json is emitted at build time, so
    // comparing it to the baked-in __APP_VERSION__ says whether THIS running
    // bundle is current. null = check unavailable (offline, or dev where the
    // file isn't emitted) → we show a PLAIN version stamp, never "tap to
    // update" (owner call: the update prompt appears ONLY when a strictly
    // newer build actually exists).
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

    const updateAvailable = latest !== null && latest !== __APP_VERSION__;
    const versionLabel = updateAvailable
        ? t('settings.updateAvailable', { v: __APP_VERSION__, n: latest as string })
        : latest === __APP_VERSION__
            ? t('settings.upToDate', { v: __APP_VERSION__ })
            : t('settings.version', { v: __APP_VERSION__ });

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

                        {/* Consistent setting rows: label left, control right. */}
                        <div className="flex flex-col gap-2.5 mb-6">

                            {/* ── Language (expandable row) ── */}
                            <div className="rounded-xl border border-[rgb(var(--color-fg))]/10 overflow-hidden">
                                <button
                                    onClick={() => setLangOpen(o => !o)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-[rgb(var(--color-fg))]/[0.03] transition-colors"
                                    aria-expanded={langOpen}
                                >
                                    <span className="text-sm ui text-[rgb(var(--color-fg))]/80">{t('settings.language')}</span>
                                    <span className="flex items-center gap-1.5 text-sm ui text-[var(--color-gold)]">
                                        {currentLangLabel}
                                        <Chevron open={langOpen} />
                                    </span>
                                </button>
                                {langOpen && (
                                    <div className="border-t border-[rgb(var(--color-fg))]/10">
                                        {SHIPPED_LOCALES.map(l => (
                                            <button
                                                key={l.id}
                                                onClick={() => { if (l.id !== locale) setLocale(l.id); }}
                                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm ui transition-colors ${l.id === locale
                                                    ? 'text-[var(--color-gold)]'
                                                    : 'text-[rgb(var(--color-fg))]/70 hover:bg-[rgb(var(--color-fg))]/[0.03]'}`}
                                                aria-pressed={l.id === locale}
                                            >
                                                <span>{l.label}</span>
                                                {l.id === locale && <Check />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Dark mode (default ON; light is the opt-out) ── */}
                            <button
                                onClick={onToggleTheme}
                                role="switch"
                                aria-checked={themeMode !== 'light'}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[rgb(var(--color-fg))]/10 hover:border-[rgb(var(--color-fg))]/25 transition-colors"
                            >
                                <span className="text-sm ui text-[rgb(var(--color-fg))]/80">{t('settings.theme')}</span>
                                <Toggle on={themeMode !== 'light'} />
                            </button>

                            {/* ── Timed-mode duration (label left, presets right;
                                same row pattern). Applies from the next problem. ── */}
                            <div className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[rgb(var(--color-fg))]/10">
                                <span className="text-sm ui text-[rgb(var(--color-fg))]/80">{t('rail.timed')}</span>
                                <div className="flex gap-1" role="radiogroup" aria-label={t('rail.timed')}>
                                    {TIMED_DURATION_PRESETS.map(s => (
                                        <button
                                            key={s}
                                            role="radio"
                                            aria-checked={timedSecs === s}
                                            onClick={() => onTimedSecsChange(s)}
                                            className={`px-2 py-1 rounded-lg text-xs ui tabular-nums transition-colors ${timedSecs === s
                                                ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40 text-[var(--color-gold)]'
                                                : 'border border-[rgb(var(--color-fg))]/10 text-[rgb(var(--color-fg))]/60 hover:border-[rgb(var(--color-fg))]/25'}`}
                                        >
                                            {s}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Sound (opt-in; a tap plays a sample so the
                                user hears what they're enabling) ── */}
                            <button
                                onClick={() => {
                                    const next = !soundOn;
                                    setSoundOn(next);       // persists + warms the AudioContext on this gesture
                                    setSoundOnState(next);
                                    if (next) soundCorrect(); // preview the "correct" tone
                                }}
                                role="switch"
                                aria-checked={soundOn}
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[rgb(var(--color-fg))]/10 hover:border-[rgb(var(--color-fg))]/25 transition-colors"
                            >
                                <span className="text-sm ui text-[rgb(var(--color-fg))]/80">{t('settings.sound')}</span>
                                <Toggle on={soundOn} />
                            </button>

                            {/* ── Notifications (same row style) ── */}
                            <PushOptIn uid={uid} />
                        </div>

                        {/* ── Version / force-update escape hatch ── */}
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
                            className={`w-full text-center text-[10px] ui tracking-widest transition-colors mb-3 ${updateAvailable
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

/** Pill toggle — matches PushOptIn so every control reads the same. */
function Toggle({ on }: { on: boolean }) {
    return (
        <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-[var(--color-gold)]/70' : 'bg-[rgb(var(--color-fg))]/15'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[var(--color-board)] transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
    );
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M6 9 L12 15 L18 9" />
        </svg>
    );
}

function Check() {
    return (
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12 L10 17 L19 7" />
        </svg>
    );
}
