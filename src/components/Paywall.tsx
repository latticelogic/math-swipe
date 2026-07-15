/**
 * Paywall.tsx
 *
 * The Day-15+ full-screen gate. Shown ONLY when the user's 14-day trial
 * has expired and they haven't purchased. Renders above ALL other UI —
 * z-index above the bottom nav, the session summary, the share sheet.
 *
 * Design rules (from memory/monetization_model.md, refined 2026-05-12):
 *
 *   1. LEAD with the user's own progress. Streak / problems / achievements
 *      earned during the trial. These are the actual hook — loss aversion
 *      via specifics, not slogans. Price sits BELOW as the answer.
 *
 *   2. NEVER pair the price with possession-threat language. Forbidden
 *      phrasing: "$3.14 keeps your progress forever" — too direct. The
 *      progress numbers should celebrate, then the price quietly offers
 *      to keep the play going.
 *
 *   3. "Maybe later" must close the app, not just dismiss the modal.
 *      Respect over coercion. A user who isn't ready isn't ready.
 *
 *   4. Daily Challenge is exempt from the gate — non-paying users post-
 *      trial can still play the daily. The paywall doesn't even fire on
 *      those sessions. See the gate logic in App.tsx for the carve-out.
 */

import { motion } from 'framer-motion';
import { PRICE_USD } from '../utils/entitlement';
import { LegalFooterRow } from './LegalPages';

interface PaywallProgress {
    /** Total problems solved across the trial. */
    totalSolved: number;
    /** Highest streak the user hit during the trial. */
    bestStreak: number;
    /** How many achievements the user unlocked during the trial. */
    achievementCount: number;
    /** Consecutive days played during the trial. */
    dayStreak: number;
}

interface PaywallProps {
    /** User's trial-period stats. Drives the progress recap that leads
     *  the paywall. Zeros are tolerated and render gracefully ("you
     *  played for a bit" rather than "you played 0 problems"). */
    progress: PaywallProgress;
    /** Called when the user taps "Keep playing". Fires Stripe Checkout
     *  in production, mockGrantAccess in DEV. */
    onUnlock: () => void;
    /** Whether the unlock action is in flight. Disables the button +
     *  shows a quiet "..." state. */
    busy?: boolean;
    /** 'expired' (default) = the post-trial hard gate (blocks the app,
     *  "Maybe later" closes it). 'pro' = an EARLY upsell shown when a user
     *  taps a locked Pro feature during the trial — aspirational, and
     *  dismissible via onClose (they're not blocked, just declining). */
    mode?: 'expired' | 'pro';
    /** Dismiss handler for 'pro' mode. When present, "Maybe later" calls this
     *  instead of closing the app. */
    onClose?: () => void;
    /** True when this session has NO legal purchase path — the Google Play
     *  (TWA) app without Play Billing available. Play policy (and the Families
     *  program) forbids selling or steering to an external purchase there, so
     *  the price and CTA are replaced by a neutral notice. The web app never
     *  sets this. */
    purchaseUnavailable?: boolean;
    /** Optional dev-only "reset trial" button — hidden in production. */
    onDevReset?: () => void;
}

export function Paywall({ progress, onUnlock, busy, mode = 'expired', onClose, purchaseUnavailable, onDevReset }: PaywallProps) {
    const isPro = mode === 'pro';
    function maybeLater() {
        // Pro upsell: just dismiss — the user isn't blocked, they declined.
        if (onClose) { onClose(); return; }
        // Post-trial gate: close the app per the monetization model rules.
        // window.close() works for tabs the script opened; otherwise navigate
        // away so the paywall doesn't snap back on re-render.
        try { window.close(); } catch { /* fallthrough */ }
        window.location.href = 'about:blank';
    }

    // Pick the 2-4 most impressive of the user's numbers to surface as
    // hero stats. The selection rules:
    //   - dayStreak is the strongest psychological hook — always show if
    //     >= 2 (one day of play isn't a streak yet)
    //   - bestStreak (in-session correct streak) is the second-strongest
    //     and reads as "skill" rather than "consistency"
    //   - totalSolved is the volume hook — always present
    //   - achievementCount only if >= 3 (smaller counts read as "barely
    //     scratched the surface" which is the opposite of what we want)
    const heroStats: { label: string; value: string; key: string }[] = [];
    if (progress.dayStreak >= 2) {
        heroStats.push({
            key: 'day-streak',
            label: progress.dayStreak === 1 ? 'day' : 'days in a row',
            value: progress.dayStreak.toString(),
        });
    }
    if (progress.bestStreak >= 5) {
        heroStats.push({
            key: 'best-streak',
            label: 'best streak',
            value: progress.bestStreak.toString(),
        });
    }
    if (progress.totalSolved > 0) {
        heroStats.push({
            key: 'total-solved',
            label: progress.totalSolved === 1 ? 'problem' : 'problems',
            value: progress.totalSolved.toLocaleString(),
        });
    }
    if (progress.achievementCount >= 3) {
        heroStats.push({
            key: 'achievements',
            label: progress.achievementCount === 1 ? 'achievement' : 'achievements',
            value: progress.achievementCount.toString(),
        });
    }
    // Cap at 4 — beyond that the layout gets crowded. Priority order
    // above ensures the strongest hooks survive the cap.
    const visibleStats = heroStats.slice(0, 4);

    // Fallback headline for users who barely played — instead of awkward
    // empty stat boxes, just acknowledge they tried it.
    const showStatsBlock = visibleStats.length > 0;

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--color-board)] px-6 overflow-y-auto py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paywall-title"
        >
            <div className="w-full max-w-sm text-center">
                {/* Small wreath SVG — matches existing celebration aesthetics.
                    Decorative; the *numbers* are what should draw the eye. */}
                <motion.svg
                    viewBox="0 0 64 64"
                    width="56" height="56"
                    fill="none" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden
                    className="mx-auto mb-4 text-[var(--color-gold)]"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <circle cx="32" cy="32" r="22" />
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
                    <path d="M32 22 L 34 30 L 42 32 L 34 34 L 32 42 L 30 34 L 22 32 L 30 30 Z" />
                </motion.svg>

                {isPro ? (
                    // Pro upsell (during trial): aspirational, not loss-framed.
                    // Lead with what unlocking gets them, right now.
                    <>
                        <h1 id="paywall-title" className="text-2xl chalk text-[var(--color-gold)] mb-1">
                            Unlock everything
                        </h1>
                        <p className="text-sm ui text-[rgb(var(--color-fg))]/55 mb-6">
                            The full game — right now.
                        </p>
                        <div className="mb-6 flex flex-col gap-2.5 text-left max-w-[260px] mx-auto">
                            {['Hard, Timed & Ultimate modes', 'All 36 Magic Tricks', 'The exclusive Pro cosmetics pack'].map(f => (
                                <div key={f} className="flex items-center gap-2.5">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-gold)] shrink-0" aria-hidden>
                                        <path d="M5 12l4 4 10-10" />
                                    </svg>
                                    <span className="text-sm ui text-[rgb(var(--color-fg))]/75">{f}</span>
                                </div>
                            ))}
                        </div>
                        {!purchaseUnavailable && (
                            <p className="text-sm ui text-[rgb(var(--color-fg))]/65 mb-5 leading-relaxed">
                                Yours forever for ${PRICE_USD.toFixed(2)}. One time — no subscription.
                            </p>
                        )}
                    </>
                ) : (<>
                {/* The headline acknowledges the trial ended without naming the
                    price. The price lives at the bottom in the CTA. */}
                <h1 id="paywall-title" className="text-2xl chalk text-[var(--color-gold)] mb-1">
                    Two weeks of Math Challenge
                </h1>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/55 mb-6">
                    Here's what you built.
                </p>

                {/* Hero stats — the user's own numbers in their own voice.
                    This is the actual psychological hook: loss aversion via
                    specifics, not slogans. Numbers are large; labels small. */}
                {showStatsBlock ? (
                    <div className="mb-6 grid grid-cols-2 gap-3">
                        {visibleStats.map((stat, i) => (
                            <motion.div
                                key={stat.key}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.2 + i * 0.07 }}
                                className="bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-2xl px-3 py-4"
                            >
                                <div className="text-3xl chalk text-[var(--color-gold)] tabular-nums leading-none mb-1.5">
                                    {stat.value}
                                </div>
                                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/50 uppercase tracking-wider">
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    // Edge case: user installed but barely played. Skip the
                    // stat block entirely rather than show zeros, which would
                    // undermine the whole "look what you built" framing.
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/45 mb-6 leading-relaxed">
                        The Daily Challenge stays open if you want to come back.
                    </p>
                )}

                {/* Quiet transition into the CTA — no possession threats, no
                    "lose your progress" framing. Just an invitation. */}
                {!purchaseUnavailable && (
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/65 mb-5 leading-relaxed">
                        Want to keep going? Everything stays unlocked for ${PRICE_USD.toFixed(2)}. One time.
                    </p>
                )}
                </>)}

                {purchaseUnavailable ? (
                    // No legal purchase path in this session (Android app without
                    // Play Billing). Per Google Play policy we can't sell here OR
                    // steer to an external purchase — so: a neutral notice, no
                    // price, no link. An unlock made elsewhere still syncs in.
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/55 leading-relaxed">
                        Purchases aren't available in this version of the app.
                        If you've already unlocked Math Challenge, sign in and
                        your unlock comes with you.
                    </p>
                ) : (<>
                <button
                    onClick={onUnlock}
                    disabled={busy}
                    className="w-full py-3.5 rounded-2xl bg-[var(--color-gold)] text-[var(--color-board)] text-base ui font-semibold hover:bg-[var(--color-gold)]/90 transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {busy ? 'Just a sec…' : isPro ? 'Unlock everything' : 'Keep playing'}
                </button>

                {/* Sub-line clarifies what "keep playing" means without baking
                    a possession threat into the headline itself. */}
                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/35 mt-2">
                    Lifetime access · No subscription
                </p>
                </>)}

                <button
                    onClick={maybeLater}
                    className="w-full mt-4 py-2 text-sm ui text-[rgb(var(--color-fg))]/45 hover:text-[rgb(var(--color-fg))]/65 transition-colors"
                >
                    Maybe later
                </button>

                {/* Quiet hint that the Daily Challenge isn't locked. Not
                    promoted (would dilute the CTA) but visible so a user
                    who taps "Maybe later" knows they can still come back. */}
                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-3">
                    The Daily Challenge is always free.
                </p>

                {/* Legal links — refund / privacy / terms. Quiet but discoverable
                    at the moment of payment. The 14-day refund is also a
                    trust signal that reduces purchase hesitation. */}
                <div className="mt-5 pt-3 border-t border-[rgb(var(--color-fg))]/8">
                    <LegalFooterRow omitRefund />
                </div>

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
