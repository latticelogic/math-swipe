/**
 * LegalPages.tsx
 *
 * Three static pages reachable via path-based routing:
 *   /refund    — refund policy
 *   /privacy   — privacy policy
 *   /terms     — terms of service
 *
 * All three are clearly marked as DRAFTS with a yellow banner at the
 * top. The drafts are based on what the codebase actually does today
 * (anonymous Firebase auth, optional Google/email sign-in, stats blob,
 * optional push tokens, optional Stripe purchase) — so they're closer
 * to accurate than generic templates, but they're NOT a substitute for
 * lawyer review. Final copy must be replaced before live keys ship.
 *
 * Why these live together: they share layout chrome + the draft banner,
 * and they all change together when legal review lands. One file, one
 * PR for updates.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';

type LegalDocId = 'refund' | 'privacy' | 'terms';

interface Props {
    doc: LegalDocId;
    onBack: () => void;
}

const TITLES: Record<LegalDocId, string> = {
    refund: 'Refund Policy',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
};

const LAST_UPDATED = '2026-05-12';

export function LegalPage({ doc, onBack }: Props) {
    // Scroll to top on mount — these are full pages, not modals
    useEffect(() => { window.scrollTo(0, 0); }, [doc]);

    return (
        <motion.div
            className="min-h-screen w-full bg-[var(--color-board)] text-[rgb(var(--color-fg))]/85 px-5 py-6 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
        >
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={onBack}
                    className="text-xs ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/80 transition-colors mb-4 flex items-center gap-1.5"
                >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M15 18 L 9 12 L 15 6" />
                    </svg>
                    Back
                </button>

                <h1 className="text-3xl chalk text-[var(--color-gold)] mb-1">{TITLES[doc]}</h1>
                <p className="text-[11px] ui text-[rgb(var(--color-fg))]/35 mb-4">
                    Last updated: {LAST_UPDATED}
                </p>

                {/* Draft banner — large, unmissable. Removed only when final
                    legal-reviewed copy is in place. */}
                <div className="mb-6 px-4 py-3 rounded-2xl border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/8 text-xs ui text-[var(--color-gold)]/90 leading-relaxed">
                    <strong className="font-semibold">DRAFT.</strong>{' '}
                    This document has not been reviewed by a lawyer. It describes
                    the app's current data practices as accurately as the
                    authors can, but it's a sample — not legal advice. Replace
                    with reviewed copy before launching to paid users.
                </div>

                <div className="text-sm ui leading-relaxed space-y-4 text-[rgb(var(--color-fg))]/80">
                    {doc === 'refund' && <RefundBody />}
                    {doc === 'privacy' && <PrivacyBody />}
                    {doc === 'terms' && <TermsBody />}
                </div>

                <div className="mt-12 pt-6 border-t border-[rgb(var(--color-fg))]/8">
                    {/* Inter-doc navigation. We let the <a href> in the footer
                        row do a real navigation — App.tsx's pathname-matcher
                        re-renders us with the new doc on the next load. */}
                    <LegalFooterRow current={doc} />
                </div>
            </div>
        </motion.div>
    );
}

// ── Bodies ────────────────────────────────────────────────────────────────────

function RefundBody() {
    return (
        <>
            <Section title="14-day refund, no questions asked">
                <p>
                    If you bought lifetime access to Math Swipe and aren't happy with
                    it for any reason, email <Email /> within 14 days of purchase
                    and we'll refund you. No questions, no forms, no friction.
                </p>
                <p className="text-[rgb(var(--color-fg))]/55 text-xs italic">
                    The refund is processed through Stripe and typically appears on
                    your statement within 5–10 business days, depending on your bank.
                </p>
            </Section>

            <Section title="What you'll need">
                <p>Just the email address you used at checkout. If you can find your
                    Stripe receipt, paste the transaction id — it speeds things up.
                </p>
            </Section>

            <Section title="After the 14 days">
                <p>
                    We still try to help. Reach out and we'll see what we can do.
                    Refunds outside the window are at our discretion but we're not
                    in the business of holding $3.14 hostage.
                </p>
            </Section>

            <Section title="What stays after a refund">
                <p>
                    Your account and stats stay intact — refunding just removes the
                    lifetime entitlement. The Daily Challenge remains free, as it
                    is for everyone after the trial. If you ever want to come
                    back, you can purchase again at the regular price.
                </p>
            </Section>
        </>
    );
}

function PrivacyBody() {
    return (
        <>
            <Section title="What we collect">
                <p>The shortest accurate version: an anonymous account id, your
                    chosen display name, your gameplay stats, and (only if you
                    opt in) one of: a Google account link, an email address for
                    sign-in, a push notification token, or a Stripe customer id
                    after purchase.</p>

                <p>We do not collect: your real name, address, phone number,
                    location, contacts, or anything not listed above. We do not
                    use ad-tech tracking, fingerprinting, or third-party analytics
                    SDKs.</p>
            </Section>

            <Section title="Details, by surface">
                <Bullet><strong>Anonymous play.</strong> Opening the app creates an
                    anonymous Firebase Auth account. We get a random id, nothing
                    tied to you personally. You can clear it by clearing browser
                    data.</Bullet>
                <Bullet><strong>Display name.</strong> Whatever you type in. Visible
                    on the leaderboard. If you want a unique handle, the
                    @-username is opt-in and replaces the visible name.</Bullet>
                <Bullet><strong>Stats.</strong> Problems solved, accuracy, streak,
                    achievements, mode preferences. Stored against your account
                    id in Firestore. Used to render the Me tab and leaderboard.</Bullet>
                <Bullet><strong>Google or email sign-in.</strong> Optional. If you
                    link a Google account or email, we receive the address so we
                    can carry your account across devices. You can unlink at any
                    time.</Bullet>
                <Bullet><strong>Push notifications.</strong> Optional. If enabled,
                    we store a browser-issued push subscription endpoint (no
                    direct device identifier).</Bullet>
                <Bullet><strong>Payment.</strong> Only if you purchase. Stripe
                    handles the actual card details — we never see them. We
                    store a Stripe customer id and a transaction id to verify
                    your lifetime entitlement.</Bullet>
                <Bullet><strong>Error reports + performance.</strong> When the app
                    crashes, we log the error message, stack, page URL, and
                    browser user-agent for debugging. No user id is attached.</Bullet>
            </Section>

            <Section title="Children">
                <p>Math Swipe is designed for ages 8–14. We do <em>not</em>
                    require email, phone, or any personal information to play.
                    Parents who want to enable purchase or cross-device sync may
                    opt the child in via Google or email sign-in; otherwise the
                    app works fully on the anonymous account.</p>
                <p className="text-[rgb(var(--color-fg))]/55 text-xs italic">
                    DRAFT NOTE: this section needs explicit COPPA-compliance
                    language and possibly a parental-consent flow before launch
                    if we ship in the US to under-13 users.
                </p>
            </Section>

            <Section title="Sharing">
                <p>We don't sell or share your data with advertisers. The only
                    third parties that touch any of it are:</p>
                <Bullet><strong>Firebase</strong> (Google) — auth, database, push delivery</Bullet>
                <Bullet><strong>Cloudflare</strong> — hosting and edge delivery</Bullet>
                <Bullet><strong>Stripe</strong> — payment processing (purchases only)</Bullet>
            </Section>

            <Section title="Your rights">
                <p>You can request a copy of your data, ask us to delete it, or
                    correct it by emailing <Email />. Anonymous accounts can also
                    be cleared client-side by clearing browser storage. Deleting
                    a paid account removes your entitlement; we can re-grant it
                    on request if you change your mind.</p>
            </Section>

            <Section title="Retention">
                <p>Active accounts: kept indefinitely so your stats and lifetime
                    purchase persist. Inactive anonymous accounts (no activity
                    for 12 months): pruned automatically. Error reports + web
                    vitals: 90 days.</p>
            </Section>

            <Section title="Changes">
                <p>If we change anything material in this policy, we'll surface
                    the new version with the changed date in the app and email
                    anyone with a linked address. The "last updated" date at the
                    top reflects the latest revision.</p>
            </Section>
        </>
    );
}

function TermsBody() {
    return (
        <>
            <Section title="Plain language">
                <p>You pay $3.14 once, and Math Swipe keeps working for you. There's
                    no subscription, no ads, no recurring charge.</p>
                <p>This page is the more formal version of that. If anything below
                    contradicts the simple version, the simple version wins on
                    intent and we'll fix the formal text.</p>
            </Section>

            <Section title="What 'lifetime' means">
                <p>"Lifetime" means as long as the app is operated and the
                    service is available. We commit to maintaining the service
                    in good faith; if we ever wind it down, we'll provide notice
                    and a final date.</p>
                <p>We don't commit to specific features remaining unchanged
                    forever — products evolve. We commit to not adding features
                    or restrictions that materially reduce the value of what
                    you've already paid for.</p>
            </Section>

            <Section title="The trial">
                <p>The 14-day free demo gives you full access to everything in
                    the app. After the demo ends, you can purchase lifetime
                    access for $3.14. If you don't purchase, the Daily Challenge
                    stays free; other content locks.</p>
            </Section>

            <Section title="Acceptable use">
                <p>Reasonable rules:</p>
                <Bullet>Don't try to extract or redistribute the question content,
                    answer keys, or any internal asset.</Bullet>
                <Bullet>Don't impersonate other users, harass anyone via the
                    leaderboard, or use the app to send spam or harm.</Bullet>
                <Bullet>Don't try to bypass the entitlement system. If you find a
                    bug, please report it.</Bullet>
            </Section>

            <Section title="Account suspension">
                <p>We may suspend or terminate accounts that violate the rules
                    above. If we suspend a paid account in error, we'll restore
                    it; if we suspend for cause, refunds may or may not apply at
                    our discretion.</p>
            </Section>

            <Section title="No warranty">
                <p>Math Swipe is provided "as is." We do our best to keep the app
                    working, but we don't warrant that it will be uninterrupted,
                    bug-free, or that your stats won't ever experience a
                    problem. If something serious breaks, we'll fix it as
                    quickly as we can.</p>
            </Section>

            <Section title="Liability">
                <p>Our maximum liability to you, in the unlikely event of a
                    dispute, is the amount you paid us. Since the price is
                    $3.14, that's the cap.</p>
            </Section>

            <Section title="Governing law">
                <p>
                    Lattice Logic operates from the United States. These terms
                    are governed by the laws of the state of incorporation
                    (currently being finalised; final draft will specify).
                </p>
                <p className="text-[rgb(var(--color-fg))]/55 text-xs italic">
                    DRAFT NOTE: replace with actual state of incorporation +
                    chosen dispute-resolution clause before launch.
                </p>
            </Section>

            <Section title="Contact">
                <p>Questions about these terms or anything else: <Email />.</p>
            </Section>
        </>
    );
}

// ── Reusable bits ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-base ui font-semibold text-[var(--color-gold)] mb-2">{title}</h2>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function Bullet({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex gap-2 items-start">
            <span className="text-[var(--color-gold)]/60 mt-1">·</span>
            <p className="flex-1">{children}</p>
        </div>
    );
}

function Email() {
    return (
        <a
            href="mailto:help@latticelogic.app"
            className="text-[var(--color-gold)] hover:underline"
        >
            help@latticelogic.app
        </a>
    );
}

// ── Footer link row (re-used from Paywall + MePage) ───────────────────────────

interface FooterRowProps {
    /** Which doc the user is currently on (rendered as plain text, not link). */
    current?: LegalDocId;
    /** Click handler for navigation. The parent decides routing strategy. */
    onNavigate?: (doc: LegalDocId) => void;
}

/**
 * Shared "Refund · Privacy · Terms" link row. Exported so the Paywall
 * (during checkout) and the MePage footer (always-visible discovery)
 * can both render it without duplicating markup.
 *
 * Uses plain <a href> so direct navigation works for SEO, browser
 * history, and right-click "Open in new tab" — but also accepts an
 * onNavigate prop for SPA-internal soft-routing if the parent prefers
 * not to hit a full reload.
 */
export function LegalFooterRow({ current, onNavigate }: FooterRowProps) {
    const items: { id: LegalDocId; label: string }[] = [
        { id: 'refund', label: 'Refund' },
        { id: 'privacy', label: 'Privacy' },
        { id: 'terms', label: 'Terms' },
    ];

    return (
        <div className="flex justify-center gap-3 text-[10px] ui text-[rgb(var(--color-fg))]/35">
            {items.map((item, i) => (
                <span key={item.id} className="flex items-center gap-3">
                    {item.id === current ? (
                        <span className="text-[var(--color-gold)]/55">{item.label}</span>
                    ) : (
                        <a
                            href={`/${item.id}`}
                            onClick={onNavigate ? (e) => {
                                e.preventDefault();
                                onNavigate(item.id);
                            } : undefined}
                            className="hover:text-[rgb(var(--color-fg))]/65 transition-colors"
                        >
                            {item.label}
                        </a>
                    )}
                    {i < items.length - 1 && (
                        <span className="text-[rgb(var(--color-fg))]/20">·</span>
                    )}
                </span>
            ))}
        </div>
    );
}

export type { LegalDocId };
