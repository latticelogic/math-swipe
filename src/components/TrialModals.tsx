/**
 * TrialModals.tsx
 *
 * The three warm-toned touchpoints that make the 14-day demo feel
 * announced rather than ambushed:
 *
 *   1. WelcomeModal           — shown once on Day 1 (first session per uid)
 *                                "Free for 14 days, then $3.14 lifetime"
 *   2. TrialReminderModal     — shown once each on Day 7, Day 10, and Day 13
 *                                "N days left. $3.14 keeps it forever."
 *   3. TrialCountdownChip     — persistent subtle "N days left" pill,
 *                                lives in the Me tab (rendered there directly)
 *
 * All three render NOTHING when the user has paid (status === 'paid')
 * or when the trial is already expired (paywall handles that case).
 *
 * Acknowledgement persistence is per-uid in localStorage. Clearing
 * storage re-shows the welcome modal, which is intentionally mild —
 * a determined refresher would already have to clear Firestore to
 * reset the trial clock itself (impossible from client).
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRICE_USD, type EntitlementStatus } from '../utils/entitlement';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

// ── Acknowledgement keys (per uid) ────────────────────────────────────────────

const WELCOME_KEY = (uid: string) => `math-swipe-welcome-seen:${uid}`;
const REMINDER_KEY = (uid: string, day: 7 | 10 | 13) => `math-swipe-reminder-seen:${day}:${uid}`;

// ── Welcome modal ─────────────────────────────────────────────────────────────

interface WelcomeModalProps {
    uid: string | null;
    status: EntitlementStatus;
    /** True until the entitlement doc is loaded; we suppress the modal
     *  during this window so it never flashes before status is known. */
    entitlementLoading: boolean;
    /** True when the user is mid-session. The welcome modal defers until
     *  they're between sessions so they're never interrupted mid-play
     *  (rare in practice on Day 1 since users haven't started yet, but
     *  consistent with the same rule for trial reminders). */
    inSession: boolean;
}

/** Day-1 single-button intro. Visible exactly once per uid, only at
 *  session-start (never mid-play). */
export function WelcomeModal({ uid, status, entitlementLoading, inSession }: WelcomeModalProps) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!uid || entitlementLoading) return;
        if (status !== 'trial') return;
        if (inSession) return;
        if (safeGetItem(WELCOME_KEY(uid))) return;
        // Small delay so the modal lands after the app has rendered, not on
        // top of the initial paint — feels less like an interrupt.
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
    }, [uid, status, entitlementLoading, inSession]);

    function dismiss() {
        if (uid) safeSetItem(WELCOME_KEY(uid), String(Date.now()));
        setOpen(false);
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
                        aria-labelledby="welcome-modal-title"
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] bg-[var(--color-board)] border border-[var(--color-gold)]/25 rounded-3xl px-6 py-7 w-[320px] max-w-[90vw] text-center"
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.22 }}
                    >
                        {/* Sparkle — hand-drawn, matches the rest of the app's no-emoji aesthetic */}
                        <svg
                            viewBox="0 0 24 24"
                            width="36" height="36"
                            fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden
                            className="mx-auto mb-3 text-[var(--color-gold)]"
                        >
                            <path d="M12 3 L 13.5 10.5 L 21 12 L 13.5 13.5 L 12 21 L 10.5 13.5 L 3 12 L 10.5 10.5 Z" />
                        </svg>

                        <h2 id="welcome-modal-title" className="text-2xl chalk text-[var(--color-gold)] mb-2">
                            Welcome to Math Swipe
                        </h2>

                        <p className="text-sm ui text-[rgb(var(--color-fg))]/70 mb-3 leading-relaxed">
                            Free for <span className="text-[var(--color-gold)]">14 days</span> — every topic, every mode.
                        </p>

                        <p className="text-xs ui text-[rgb(var(--color-fg))]/50 mb-2 leading-relaxed">
                            After that, ${PRICE_USD.toFixed(2)} for lifetime access.<br />
                            One time. No subscription. No ads. Ever.
                        </p>

                        <p className="text-[10px] ui text-[rgb(var(--color-fg))]/35 mb-5 leading-relaxed">
                            The Daily Challenge is always free.
                        </p>

                        <button
                            onClick={dismiss}
                            className="w-full py-2.5 rounded-xl bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/30 text-sm ui font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/25 transition-colors active:scale-[0.98]"
                        >
                            Got it
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Trial reminder modal ──────────────────────────────────────────────────────

interface TrialReminderModalProps {
    uid: string | null;
    status: EntitlementStatus;
    daysLeft: number;
    entitlementLoading: boolean;
    /** True when the user is mid-session (has answered ≥1 problem on the
     *  game tab). Reminders WAIT until this is false — they never
     *  interrupt active play. The next session-start re-triggers the
     *  effect's evaluation. */
    inSession: boolean;
    /** Called when the user taps "Unlock now" — parent opens the paywall. */
    onUnlock?: () => void;
}

/** Day-7, Day-10, and Day-13 nudges. Each fires once per uid per
 *  threshold, ONLY at session-start (never mid-session). Three
 *  clearly-spaced touchpoints chosen so:
 *    - Day 7 (midpoint): habit-forming check-in, recruits cognitive
 *                        commitment when the user is still discovering
 *                        the app. Soft tone, not a warning.
 *    - Day 10 (4 days left): "halfway between halfway and end" reminder,
 *                            sharper but still warm.
 *    - Day 13 (1 day left): last warning before the paywall fires.
 *
 *  Session-start gating rule: the effect waits until `inSession` is
 *  false. If the threshold crosses mid-play, the reminder is queued
 *  for the next time the user is between sessions — typically the
 *  next time they open the app, after they finish a session, or when
 *  they navigate to a non-game tab. The ack-key still ensures a single
 *  fire per threshold per uid. */
export function TrialReminderModal({ uid, status, daysLeft, entitlementLoading, inSession, onUnlock }: TrialReminderModalProps) {
    const [open, setOpen] = useState<7 | 10 | 13 | null>(null);

    useEffect(() => {
        if (!uid || entitlementLoading) return;
        if (status !== 'trial') return;
        // Defer if user is mid-session. The effect re-runs when inSession
        // flips to false (typically: tab change, session end, or fresh
        // app open), at which point we'll catch up on whatever threshold
        // is current.
        if (inSession) return;
        // Targets:
        //   Day 7 mark   → daysLeft <= 7 (first opens after Day 7 hit)
        //   Day 10 mark  → daysLeft <= 4
        //   Day 13 mark  → daysLeft <= 1
        // Use strictly-incrementing thresholds so the user always sees
        // the most relevant reminder for their current day — Day 7's
        // ack-key prevents it from re-firing once they're at Day 10.
        const target: 7 | 10 | 13 | null =
            daysLeft <= 1 ? 13 :
            daysLeft <= 4 ? 10 :
            daysLeft <= 7 ? 7 :
            null;
        if (!target) return;
        if (safeGetItem(REMINDER_KEY(uid, target))) return;
        const t = setTimeout(() => setOpen(target), 600);
        return () => clearTimeout(t);
    }, [uid, status, daysLeft, entitlementLoading, inSession]);

    function dismiss() {
        if (uid && open) safeSetItem(REMINDER_KEY(uid, open), String(Date.now()));
        setOpen(null);
    }

    function unlock() {
        dismiss();
        onUnlock?.();
    }

    const isMidpoint = open === 7;
    const isUrgent = open === 13;

    return (
        <AnimatePresence>
            {open !== null && (
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
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] bg-[var(--color-board)] border border-[var(--color-gold)]/25 rounded-3xl px-6 py-7 w-[320px] max-w-[90vw] text-center"
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ duration: 0.22 }}
                    >
                        {/* Hourglass — hand-drawn */}
                        <svg
                            viewBox="0 0 24 24"
                            width="36" height="36"
                            fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            aria-hidden
                            className="mx-auto mb-3 text-[var(--color-gold)]"
                        >
                            <path d="M6 3 L 18 3" />
                            <path d="M6 21 L 18 21" />
                            <path d="M7 3 C 7 8 12 10 12 12 C 12 14 7 16 7 21" />
                            <path d="M17 3 C 17 8 12 10 12 12 C 12 14 17 16 17 21" />
                        </svg>

                        <h2 className="text-xl chalk text-[var(--color-gold)] mb-2">
                            {isUrgent
                                ? (daysLeft === 0 ? 'Trial ends today' : '1 day left in your trial')
                                : isMidpoint
                                    ? "You're a week in"
                                    : `${daysLeft} days left in your trial`}
                        </h2>

                        {/* Body copy adapts to the threshold. Day 7 is a soft
                            midpoint nudge framed as recognition ("nice, you're
                            sticking with this"); Day 10/13 acknowledge the
                            time pressure without naming the price as a threat.
                            The CTA button does the price-naming. */}
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/60 mb-5 leading-relaxed">
                            {isMidpoint
                                ? `Halfway through your trial. If you like it, ${PRICE_USD.toFixed(2)} keeps it.`
                                : isUrgent
                                    ? 'After today the rest locks. The Daily Challenge stays free.'
                                    : 'A few days to decide. The Daily Challenge stays free either way.'}
                        </p>

                        <button
                            onClick={unlock}
                            className="w-full py-2.5 rounded-xl bg-[var(--color-gold)]/20 border border-[var(--color-gold)]/40 text-sm ui font-semibold text-[var(--color-gold)] hover:bg-[var(--color-gold)]/30 transition-colors active:scale-[0.98] mb-2"
                        >
                            Unlock for ${PRICE_USD.toFixed(2)}
                        </button>
                        <button
                            onClick={dismiss}
                            className="w-full py-2 text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                        >
                            Keep playing
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Countdown chip (rendered inline in Me tab) ────────────────────────────────

interface TrialCountdownChipProps {
    status: EntitlementStatus;
    daysLeft: number;
    onClick?: () => void;
}

/** Subtle "N days left in trial" pill. Hidden for paid users. Tappable to
 *  open the paywall directly. */
export function TrialCountdownChip({ status, daysLeft, onClick }: TrialCountdownChipProps) {
    if (status !== 'trial') return null;

    const dayLabel = daysLeft === 1 ? '1 day' : `${daysLeft} days`;
    const urgent = daysLeft <= 3;

    return (
        <button
            onClick={onClick}
            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] ui transition-colors ${urgent
                ? 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 text-[var(--color-gold)]'
                : 'border-[rgb(var(--color-fg))]/15 bg-transparent text-[rgb(var(--color-fg))]/50 hover:border-[rgb(var(--color-fg))]/25'
                }`}
        >
            {/* Hourglass icon — small */}
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 3 L 18 3 M 6 21 L 18 21" />
                <path d="M7 3 C 7 8 12 10 12 12 C 12 14 7 16 7 21" />
                <path d="M17 3 C 17 8 12 10 12 12 C 12 14 17 16 17 21" />
            </svg>
            <span>{dayLabel} left in trial · ${PRICE_USD.toFixed(2)} to keep</span>
        </button>
    );
}
