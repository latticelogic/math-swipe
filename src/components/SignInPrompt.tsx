/**
 * SignInPrompt.tsx
 *
 * Native-Android-only early sign-in ask (owner call 2026-07-23).
 *
 * On the native shell, Google sign-in is a one-tap Credential Manager sheet —
 * no password, no browser redirect — so an early, DISMISSIBLE "save your
 * progress" prompt is low-friction. On web it never shows (OAuth there is a
 * clunky popup; sign-in stays a quiet Me-tab option). Google only — on Android
 * essentially every device has a Google account, so "Continue with email" is
 * needless clutter here.
 *
 * Rules (mirrors the WelcomeModal discipline):
 *   - native shell only, anonymous users only (nothing to link once signed in)
 *   - once per uid (localStorage)
 *   - session-start gated: never interrupts mid-play (defers on `inSession`)
 *   - shown only AFTER the Day-1 welcome, so the two never stack
 *   - always dismissible ("Later") — it can never block play
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../i18n';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';
import { isNativeAndroid } from '../utils/channel';

const ASKED_KEY = (uid: string) => `mc-native-signin-asked:${uid}`;
// Must match TrialModals.WELCOME_KEY so we only ask after the welcome is seen.
const WELCOME_KEY = (uid: string) => `math-swipe-welcome-seen:${uid}`;

interface SignInPromptProps {
    uid: string | null;
    /** True while the account is still anonymous (nothing to offer once linked). */
    isAnonymous: boolean;
    entitlementLoading: boolean;
    /** game tab + ≥1 answered — defer until the user is between sessions. */
    inSession: boolean;
    /** Triggers the native Google link/sign-in (routes through window.AndroidAuth). */
    onSignIn: () => void;
}

export function SignInPrompt({ uid, isAnonymous, entitlementLoading, inSession, onSignIn }: SignInPromptProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!uid || entitlementLoading) return;
        if (!isNativeAndroid()) return;             // native shell only
        if (!isAnonymous) return;                   // already signed in
        if (inSession) return;                      // never mid-play
        if (!safeGetItem(WELCOME_KEY(uid))) return; // let the welcome go first
        if (safeGetItem(ASKED_KEY(uid))) return;    // once per uid
        // Small delay so it lands after the app renders (and clear of the
        // welcome), not on top of the initial paint.
        const timer = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(timer);
    }, [uid, isAnonymous, entitlementLoading, inSession]);

    function markAsked() {
        if (uid) safeSetItem(ASKED_KEY(uid), String(Date.now()));
    }
    function dismiss() {
        markAsked();
        setOpen(false);
    }
    function signIn() {
        markAsked();
        setOpen(false);
        onSignIn();
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-[var(--color-overlay-dim)] z-[150] backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={dismiss}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="signin-prompt-title"
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] bg-[var(--color-board)] border border-[var(--color-gold)]/25 rounded-3xl px-6 py-7 w-[320px] max-w-[90vw] text-center"
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.22 }}
                    >
                        <h2 id="signin-prompt-title" className="text-xl chalk text-[var(--color-gold)] mb-2">
                            {t('signin.saveTitle')}
                        </h2>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/60 mb-5 leading-relaxed">
                            {t('signin.saveBody')}
                        </p>

                        <button
                            onClick={signIn}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/20 text-sm ui font-semibold text-[rgb(var(--color-fg))]/85 hover:border-[rgb(var(--color-fg))]/35 transition-colors active:scale-[0.98] mb-2"
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {t('me.google')}
                        </button>
                        <button
                            onClick={dismiss}
                            className="w-full py-2 text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                        >
                            {t('common.later')}
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
