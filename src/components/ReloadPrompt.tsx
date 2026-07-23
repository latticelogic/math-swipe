import { useRegisterSW } from 'virtual:pwa-register/react';
import { AnimatePresence, motion } from 'framer-motion';
import { t } from '../i18n';
import { isNativeAndroid } from '../utils/channel';

interface ReloadPromptProps {
    /** When true (e.g. user is mid-game), the toast is hidden until they navigate away */
    suppress?: boolean;
}

/**
 * Non-intrusive toast that appears when a new version of the app is available.
 * Hidden during active gameplay. Shows on Me/League/Magic tabs or before first answer.
 *
 * NOT shown inside the native Android shell. There, a "new version — update"
 * prompt is confusing: the user updates the native binary through Google Play,
 * so a second in-app update ask reads as broken. Native apps refresh their web
 * content silently — the waiting service worker simply activates on the next
 * cold start (the app being killed + reopened), which is exactly how a native
 * app is expected to feel. The toast stays for real browser/PWA users, where
 * "reload for the new version" is the standard, expected pattern.
 */
export function ReloadPrompt({ suppress = false }: ReloadPromptProps) {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(_swUrl: string, registration: ServiceWorkerRegistration | undefined) {
            // Check for updates every 60 minutes
            if (registration) {
                setInterval(() => { registration.update(); }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error: Error) {
            console.warn('SW registration error:', error);
        },
    });

    // In the native shell we never surface the toast — the update lands on the
    // next launch. Everywhere else it behaves as before.
    const visible = needRefresh && !suppress && !isNativeAndroid();

    function close() {
        setNeedRefresh(false);
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 60 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999] w-[min(92vw,380px)] bg-[var(--color-overlay)] border border-[var(--color-gold)]/30 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-lg backdrop-blur-sm"
                >
                    {/* Sparkle — hand-drawn, replaces ✨ emoji */}
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-[var(--color-gold)]">
                        <path d="M12 3 L 13.5 10.5 L 21 12 L 13.5 13.5 L 12 21 L 10.5 13.5 L 3 12 L 10.5 10.5 Z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs ui text-[rgb(var(--color-fg))]/60">{t('reload.title')}</div>
                        <div className="text-sm chalk text-[var(--color-chalk)]">{t('reload.body')}</div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={close}
                            className="text-xs ui text-[rgb(var(--color-fg))]/40 px-2 py-1 rounded-lg active:bg-white/5 transition-colors"
                        >
                            {t('common.later')}
                        </button>
                        <button
                            onClick={() => {
                                updateServiceWorker(true);
                                // Fallback: if SW update doesn't trigger page reload, force it
                                setTimeout(() => window.location.reload(), 2000);
                            }}
                            className="text-xs ui font-semibold text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-3 py-1 rounded-lg active:bg-[var(--color-gold)]/20 transition-colors"
                        >
                            {t('reload.update')}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
