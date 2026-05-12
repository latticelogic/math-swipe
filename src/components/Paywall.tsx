/**
 * Paywall.tsx
 *
 * The Day-15+ full-screen gate. Shown ONLY when the user's 14-day trial
 * has expired and they haven't purchased. Renders above ALL other UI —
 * z-index above the bottom nav, the session summary, the share sheet.
 *
 * Design rules (from memory/monetization_model.md):
 *   - WARM tone, not hard. Phrase: "Your two weeks are up — hope you've
 *     enjoyed Math Swipe."
 *   - "Maybe later" must close the app, not just dismiss the modal.
 *     Respect over coercion. A user who isn't ready isn't ready.
 *   - Single primary action: "Unlock for $3.14". One-time, lifetime.
 *
 * Stripe wiring lands in Phase 4 — this component takes an `onUnlock`
 * prop so the parent can swap in real Stripe Checkout later. For now
 * the parent passes a mock (mockGrantAccess from useEntitlement).
 */

import { motion } from 'framer-motion';
import { PRICE_USD } from '../utils/entitlement';

interface PaywallProps {
    /** Called when the user taps "Unlock for $3.14". In Phase 2 this
     *  fires mockGrantAccess (DEV) or a "coming soon" toast (prod).
     *  In Phase 4 this fires Stripe Checkout. */
    onUnlock: () => void;
    /** Whether the unlock action is in flight (Stripe redirect, mock
     *  grant write). Disables the button + shows a quiet "..." state. */
    busy?: boolean;
    /** Optional dev-only "go back to trial" button — useful when
     *  iterating on the paywall flow itself. Hidden in production. */
    onDevReset?: () => void;
}

export function Paywall({ onUnlock, busy, onDevReset }: PaywallProps) {
    function maybeLater() {
        // Close the app — same behavior as the user-requested behavior
        // in memory/monetization_model.md. window.close() works for
        // tabs the script opened; for everything else we navigate the
        // page away. In a PWA this returns the user to their home
        // screen / OS. We try close() first as it's cleanest.
        try { window.close(); } catch { /* fallthrough */ }
        // Fallback: navigate away to a neutral page. The app stays
        // unrendered after navigation, so the paywall doesn't snap back.
        window.location.href = 'about:blank';
    }

    return (
        <motion.div
            // Sits above the bottom nav (z-40 max), share sheet (z-200),
            // session summary (z-50). 9999 is overkill on purpose — there
            // must NEVER be a way to click past the paywall.
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--color-board)] px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywall-title"
        >
            <div className="w-full max-w-sm text-center">
                {/* Wreath — hand-drawn. Decorative warmth, not a celebration emoji. */}
                <motion.svg
                    viewBox="0 0 64 64"
                    width="80" height="80"
                    fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden
                    className="mx-auto mb-6 text-[var(--color-gold)]"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    {/* Outer ring */}
                    <circle cx="32" cy="32" r="22" />
                    {/* Inner leaves around the circle */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
                        const rad = (angle * Math.PI) / 180;
                        const r = 22;
                        const x = 32 + r * Math.cos(rad);
                        const y = 32 + r * Math.sin(rad);
                        const lx = 32 + (r - 4) * Math.cos(rad);
                        const ly = 32 + (r - 4) * Math.sin(rad);
                        return (
                            <g key={angle}>
                                <ellipse cx={x} cy={y} rx="3" ry="2" transform={`rotate(${angle + 90} ${x} ${y})`} />
                                <line x1={x} y1={y} x2={lx} y2={ly} />
                            </g>
                        );
                    })}
                    {/* Star in middle */}
                    <path d="M32 22 L 34 30 L 42 32 L 34 34 L 32 42 L 30 34 L 22 32 L 30 30 Z" />
                </motion.svg>

                <h1 id="paywall-title" className="text-3xl chalk text-[var(--color-gold)] mb-3">
                    Your two weeks are up
                </h1>

                <p className="text-base ui text-[rgb(var(--color-fg))]/70 mb-6 leading-relaxed">
                    Hope you've enjoyed Math Swipe. Keep it forever for ${PRICE_USD.toFixed(2)}.
                </p>

                <div className="mb-6 space-y-1.5 text-left bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-2xl px-5 py-4">
                    <Bullet>All 28 topics</Bullet>
                    <Bullet>Hard mode, Timed mode, Ultimate</Bullet>
                    <Bullet>Unlimited speedruns + ghost replays</Bullet>
                    <Bullet>All 36 Magic Tricks lessons</Bullet>
                    <Bullet>Themes, costumes, badge slot</Bullet>
                    <Bullet>One-time. No subscription. No ads.</Bullet>
                </div>

                <button
                    onClick={onUnlock}
                    disabled={busy}
                    className="w-full py-3.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-board)] text-base ui font-semibold hover:bg-[var(--color-gold)]/90 transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {busy ? 'Just a sec…' : `Unlock for $${PRICE_USD.toFixed(2)}`}
                </button>

                <button
                    onClick={maybeLater}
                    className="w-full mt-3 py-2 text-sm ui text-[rgb(var(--color-fg))]/45 hover:text-[rgb(var(--color-fg))]/65 transition-colors"
                >
                    Maybe later
                </button>

                {import.meta.env.DEV && onDevReset && (
                    <button
                        onClick={onDevReset}
                        className="w-full mt-6 py-1.5 text-[10px] ui text-[rgb(var(--color-fg))]/25 hover:text-[rgb(var(--color-fg))]/40 transition-colors border-t border-[rgb(var(--color-fg))]/8 pt-3"
                    >
                        [dev] reset trial
                    </button>
                )}
            </div>
        </motion.div>
    );
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2 text-sm ui text-[rgb(var(--color-fg))]/75">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-[var(--color-gold)] mt-0.5 shrink-0">
                <path d="M5 12 L 10 17 L 19 7" />
            </svg>
            <span>{children}</span>
        </div>
    );
}
