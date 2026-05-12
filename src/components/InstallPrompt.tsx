/**
 * InstallPrompt.tsx
 *
 * Quiet in-app install prompt. Two pieces:
 *
 *   1. InstallPill — small "Install app" button rendered in the Me tab.
 *      Hidden when:
 *        • the app is already installed (matchMedia 'standalone' or iOS
 *          standalone), OR
 *        • the user has dismissed the prompt (localStorage flag).
 *      Otherwise shows on both:
 *        • platforms that fire `beforeinstallprompt` (Android, desktop
 *          Chromium) — tap triggers the native prompt
 *        • iOS Safari — tap opens an instructions modal since iOS has
 *          no native prompt API and the Share → Add to Home Screen flow
 *          is hidden enough that ~95% of users never find it.
 *
 *   2. InstallInstructionsModal — illustrated 2-step guide for iOS
 *      Safari. Only shown on iOS (other platforms get the native prompt).
 *
 * Why this exists (from the conversion-funnel perspective):
 *   - An installed PWA holds engagement materially better than a browser
 *     tab — kids don't bookmark, they remember icons. For a 14-day
 *     trial, every day a user comes back is a chance to form a habit,
 *     and an icon on the home screen makes "come back" a single tap.
 *   - The single biggest install-flow gap is iOS, where there is no
 *     automatic prompt — users have to dig through Share → Add to Home
 *     Screen. An in-app pill that triggers an illustrated guide closes
 *     that gap without being pushy.
 *
 * Tone: quiet. The pill renders subtly in the Me tab footer area.
 * No auto-popping, no first-launch overlay, no "Are you sure you don't
 * want to install?" double-confirms. If the user dismisses, we remember
 * and never re-prompt.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

const DISMISS_KEY = 'math-swipe-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

/** Detect whether the app is already installed (running standalone). */
function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    // iOS Safari uses navigator.standalone instead of the matchMedia query.
    // Chrome/Edge/Firefox use the standard matchMedia path.
    const matchMediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return matchMediaStandalone || iosStandalone;
}

/** Detect iOS Safari specifically — has no install prompt API. */
function isIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIPhoneOrPad = /iPhone|iPad|iPod/i.test(ua);
    // Exclude in-app browsers (FBAN, Instagram, etc.) which can't install
    // PWAs anyway. Their UA contains either FBAN/FBAV or Instagram.
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line/i.test(ua);
    return isIPhoneOrPad && !isInAppBrowser;
}

// ── Install pill (rendered inline in Me tab) ──────────────────────────────────

export function InstallPill() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [iosInstructionsOpen, setIosInstructionsOpen] = useState(false);
    const [dismissed, setDismissed] = useState(() => !!safeGetItem(DISMISS_KEY));
    const [installed, setInstalled] = useState(() => isStandalone());

    useEffect(() => {
        // Listen for the install-prompt event so we can defer + later trigger
        // it on user tap. Browsers that don't fire this never set
        // deferredPrompt; we rely on the iOS branch to still show the pill.
        const onBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        // appinstalled fires after a successful install — flip our state so
        // the pill disappears without needing a reload.
        const onInstalled = () => setInstalled(true);

        window.addEventListener('beforeinstallprompt', onBeforeInstall);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstall);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    // Hide entirely when the app is installed, when the user has dismissed,
    // or when there's no path forward (non-iOS, no deferredPrompt). The
    // last case is unusual — modern browsers either fire the event or are
    // iOS — but worth being defensive.
    const ios = isIos();
    const canPrompt = !!deferredPrompt;
    if (installed) return null;
    if (dismissed) return null;
    if (!ios && !canPrompt) return null;

    async function handleInstall() {
        if (deferredPrompt) {
            // Modern browsers: trigger native install prompt
            await deferredPrompt.prompt();
            try {
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome === 'dismissed') {
                    // Soft-dismiss: remember for this session only. We don't
                    // permanently flag because the user might tap "no" by
                    // accident and want to re-try after using the app more.
                    setDeferredPrompt(null);
                }
            } catch {
                // Some browsers reject the userChoice promise — non-fatal,
                // just clear the deferred prompt either way.
                setDeferredPrompt(null);
            }
            return;
        }
        // iOS path: open the illustrated instructions modal.
        setIosInstructionsOpen(true);
    }

    function permanentlyDismiss() {
        safeSetItem(DISMISS_KEY, String(Date.now()));
        setDismissed(true);
        setIosInstructionsOpen(false);
    }

    return (
        <>
            <div className="flex items-center justify-center gap-2 mt-3 mb-2">
                <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/8 text-[11px] ui text-[var(--color-gold)]/80 hover:text-[var(--color-gold)] hover:bg-[var(--color-gold)]/15 transition-colors active:scale-95"
                >
                    {/* Hand-drawn download / install icon */}
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 3 L 12 15" />
                        <path d="M7 10 L 12 15 L 17 10" />
                        <path d="M5 19 L 19 19" />
                    </svg>
                    <span>Install app</span>
                </button>
                <button
                    onClick={permanentlyDismiss}
                    className="text-[10px] ui text-[rgb(var(--color-fg))]/25 hover:text-[rgb(var(--color-fg))]/45 transition-colors"
                    aria-label="Hide install prompt"
                >
                    not now
                </button>
            </div>

            <InstallInstructionsModal
                open={iosInstructionsOpen}
                onClose={() => setIosInstructionsOpen(false)}
            />
        </>
    );
}

// ── iOS instructions modal ────────────────────────────────────────────────────

interface InstallInstructionsModalProps {
    open: boolean;
    onClose: () => void;
}

function InstallInstructionsModal({ open, onClose }: InstallInstructionsModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-[var(--color-overlay-dim)] z-[160] backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="install-modal-title"
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[160] bg-[var(--color-board)] border border-[var(--color-gold)]/25 rounded-3xl px-6 py-7 w-[340px] max-w-[90vw] text-center"
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.22 }}
                    >
                        <h2 id="install-modal-title" className="text-xl chalk text-[var(--color-gold)] mb-1">
                            Install Math Swipe
                        </h2>
                        <p className="text-xs ui text-[rgb(var(--color-fg))]/50 mb-5">
                            Two taps in Safari. Adds an icon to your home screen.
                        </p>

                        <Step number={1}>
                            Tap the <strong className="text-[var(--color-gold)]">Share</strong> icon
                            at the bottom of Safari.
                            <ShareIcon />
                        </Step>

                        <Step number={2}>
                            Scroll down and tap <strong className="text-[var(--color-gold)]">Add to Home Screen</strong>.
                            <AddIcon />
                        </Step>

                        <button
                            onClick={onClose}
                            className="w-full mt-2 py-2.5 rounded-xl bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 text-sm ui font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/25 transition-colors active:scale-[0.98]"
                        >
                            Got it
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 mb-4 text-left">
            <div className="shrink-0 w-7 h-7 rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 flex items-center justify-center text-[var(--color-gold)] text-sm ui font-bold">
                {number}
            </div>
            <div className="flex-1 text-sm ui text-[rgb(var(--color-fg))]/75 leading-relaxed flex items-center gap-2 flex-wrap">
                {children}
            </div>
        </div>
    );
}

/** iOS Share icon — square with up-arrow, matches the system glyph */
function ShareIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-fg)] inline-block ml-1" aria-hidden>
            <path d="M12 3 L 12 14" />
            <path d="M8 7 L 12 3 L 16 7" />
            <path d="M6 12 L 6 20 L 18 20 L 18 12" />
        </svg>
    );
}

/** "Add to Home Screen" icon — square with a + in the middle */
function AddIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-fg)] inline-block ml-1" aria-hidden>
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <line x1="12" y1="9" x2="12" y2="15" />
            <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
    );
}
