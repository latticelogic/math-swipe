# Math Swipe — project context for Claude

This file documents conventions and account ownership for anyone (or any
AI assistant) working in this repo. Update as ownership/setup changes.

## What this app is

A web-first mental math game (PWA, Vite + React + TypeScript). Players
swipe to answer multiple-choice problems; the game adapts difficulty,
tracks streaks, awards achievements, and teaches mental-math shortcuts
("Magic Tricks") with lesson + practice flows.

**Target audience**: kids ages 8-14 primarily, adults secondary.
Tone target across all content: **warm, restrained, never pressure-y,
never childish**. No motivational-poster hype. Specific praise over
generic ("Sharp." > "AMAZING! 🎉").

**Production URL**: https://math-swipe-c7k.pages.dev (Cloudflare Pages)

### Surface map — what lives where

| Surface | Count | File |
|---|---|---|
| Tabs (bottom nav) | 4 | Let's Go / League / Magic / Me — wired in `src/App.tsx` |
| Question topics | 28 | `src/domains/math/mathCategories.ts` (catalog) + `src/utils/mathGenerator.ts` (per-topic generators) |
| Age bands | 2 | `starter` (K-2 content) + `full` (default, ages 8+) — in `mathCategories.ts` |
| Difficulty levels | 5 | Auto-adjusted by `useDifficulty.ts` based on response time |
| Magic tricks | 36 | `src/utils/mathTricks.ts` (lessons + practice generators) |
| Achievements | 28 math + share + early-trial ladder | `src/utils/achievements.ts` (base engine) + `src/domains/math/mathAchievements.ts` (math-specific list, includes the 6-rung early-trial ladder + `spread-the-word` share achievement) |
| Paywall + trial UX | 14-day demo → \$3.14 lifetime | `src/components/Paywall.tsx`, `src/components/TrialModals.tsx`, `src/hooks/useEntitlement.ts`, `src/utils/entitlement.ts` (incl. `shouldFirePaywall` rule) |
| Stripe Checkout integration | callable + webhook | `functions/src/stripe.ts` (Cloud Functions) + `src/utils/checkout.ts` (client wrapper) |
| Legal pages | 3 drafts | `src/components/LegalPages.tsx` — Refund / Privacy / Terms with "DRAFT" banner; routed at `/refund`, `/privacy`, `/terms` |
| Billing safety runbook | CLI-first | `docs/billing-safety.md` (gcloud / firebase / stripe commands for budget alerts, quota caps, App Check) |
| Paywall e2e regression | manual checklist | `docs/paywall-e2e.md` (MCP-driven visual e2e) + `src/tests/paywallTrigger.test.ts` (truth-table unit test) |
| Teachers (companion characters) | 8 | `src/domains/math/teachers/*.tsx` — each has a documented voice persona |
| Streak milestone tiers | 5 | `MilestoneBurst.tsx` at 3/5/10/25/50 — sparkle → flame → bolt → crown → trophy |
| Teacher message pools | base + per-teacher | `src/utils/chalkMessages.ts` (base) + `src/domains/math/teachers/*.tsx` (overrides) |
| Math-topic flavour | per-topic | `src/domains/math/mathMessages.ts` (success/fail quips per topic) |
| Category icons | 28 | `src/components/CategoryIcon.tsx` — hand-drawn SVGs |
| Trick icons | 36 | `src/components/TrickIcon.tsx` — hand-drawn SVGs |
| Difficulty curves spec | — | `docs/difficulty-curves.md` (what Easy/Medium/Hard means per topic) |
| Mobile UX audit | 2026-05-11 | `docs/audit-2026-05-11.md` (visual + interaction findings) |
| Content audit | 2026-05-12 | `docs/content-audit-2026-05-12.md` (teacher voice, tricks, achievements, copy) |
| Firestore data audit util | — | `scripts/audit-firestore.cjs` (needs `gcloud auth application-default login` once) |

### Local dev

```bash
npm install
npm run dev          # needs .env with VITE_FIREBASE_* keys, see .env.example
npm run verify       # eslint + tsc + vitest + vite build + worker bundle
npm test             # vitest watch
```

Without `.env` (or with empty `VITE_FIREBASE_*` values), the Firebase
init throws at boot. Copy `.env.example` to `.env` and fill in from
the Firebase console of `math-swipe-prod`.

## Account ownership

The company is **Lattice Logic** (incorporated, has DUNS). We're migrating
from personal accounts to company-owned accounts. **Anything that runs in
production should be owned by the company account, not Tim's personal.**

### Identity registry

| Surface | Account | Notes |
|---|---|---|
| Google Workspace (company) | `tim@latticelogic.app` | Primary admin. 2FA enabled. Use this for all new company resources. |
| Google personal (legacy) | `njytim@gmail.com` | Owns the *old* shared Firebase project `scribble-math-prod` (also hosts another app — DO NOT deploy math-swipe to it). Kept active for read-only reference; no new resources should be attached. |
| Firebase project (production) | `math-swipe-prod` | Owned by `tim@latticelogic.app`. Org id `138884922843`. Created 2026-05-11. |
| Firebase project (legacy / shared) | `scribble-math-prod` | DO NOT deploy to this. Hosts another company's classroom app with 80+ functions. A naive deploy would delete them all. |
| GitHub | `latticelogic` org | Repo at `github.com/latticelogic/math-swipe`. Owner admin: `njytim-cyber` (renamed legacy account). Transferred 2026-05-11. |
| Cloudflare Pages | `tim@latticelogic.app`, account id `00e07444cae65d675a140f8560429fad` | Project `math-swipe`, production URL `https://math-swipe-c7k.pages.dev`. Production branch `master`. Env vars `FIREBASE_PROJECT_ID`, `PUBLIC_ORIGIN`, `NODE_VERSION` set on both production + preview configs. Custom domain not yet attached (pending product name decision). |
| Stripe | code wired, account verification pending | Cloud Functions in `functions/src/stripe.ts` ready to deploy. Secrets needed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `PUBLIC_ORIGIN` — set via `firebase functions:secrets:set`. Webhook endpoint to register: `https://us-central1-math-swipe-prod.cloudfunctions.net/stripeWebhook` listening for `checkout.session.completed`. |
| Apple Developer | not yet enrolled | Must enroll as Lattice Logic with company DUNS, $99/yr. 1-3 week verification window |
| Google Play Console | not yet enrolled | Must enroll as Lattice Logic, $25 one-time |

### Firebase CLI

The CLI has both accounts registered. To switch between them:
```bash
firebase login:list                        # see all logged-in accounts
firebase use math-swipe-prod --account tim@latticelogic.app
firebase deploy --only firestore:rules --account tim@latticelogic.app
```

**Always pass `--account tim@latticelogic.app` for math-swipe deploys** to
avoid accidentally targeting `scribble-math-prod`.

### Cloudflare Pages deploys

**Deploys are CI-driven**, not local. The workflow at
`.github/workflows/deploy.yml` runs the full verify chain and then
`wrangler pages deploy dist` on every push:

- push to `master` → production deploy at `math-swipe-c7k.pages.dev`
- push to `dev` or any other branch → preview deploy (branch-aliased URL)
- pull_request to `master` → preview deploy, URL posted as PR comment

**To ship a change**: merge to master. The Action handles the rest.

**Repo secrets required for CI** (already configured):
`CLOUDFLARE_API_TOKEN` (long-lived, Edit Cloudflare Workers scope),
`CLOUDFLARE_ACCOUNT_ID`, and the six `VITE_FIREBASE_*` keys plus optional
`VITE_VAPID_PUBLIC_KEY` (Vite inlines these into the client bundle at
build time, so they must be present during `npm run verify`).

**Local `wrangler` does not work on Windows ARM64** — `workerd` (the
runtime wrangler bundles for `wrangler dev`) lacks a win-arm64 binary
and crashes wrangler at module load. For one-off ops use the Cloudflare
REST API directly (`curl https://api.cloudflare.com/client/v4/...`),
or run wrangler from CI / a non-ARM machine / WSL (if functional). The
project's normal deploy path doesn't need local wrangler at all.

## Deploy chain

| Concern | Tool | Why this one |
|---|---|---|
| Static SPA hosting + global CDN | Cloudflare Pages | Best-in-class CDN, generous free tier, edge Workers for OG meta |
| Edge HTML rewriting (per-profile OG tags at `/u/<slug>`) | Cloudflare Pages Worker (`dist/_worker.js`, source in `edge/`) | <10ms edge compute beats 1-3s Cloud Function cold start |
| Auth + Firestore + Cloud Functions + FCM | Firebase | Anonymous + Google + email-link auth, offline-first sync, FCM is Firebase-native |
| Payments | Stripe (TBD) | Only serious option for web payments |

**Why both Cloudflare and Firebase**: see the architecture section in
`README.md` (TBD) — short version: Cloudflare wins on CDN + edge, Firebase
wins on stateful backend (auth + db + scheduled jobs + push). Trying to do
either with the other tool is more complex than running both.

## Monetization model

**$3.14 USD lifetime. One-time purchase. NEVER subscription.** This is a
firm decision (2026-05-12): the app is a game, not an education product,
and subscriptions train users to evaluate "is this worth $X per month"
instead of enjoying play. The price is a positioning statement, not a
revenue-optimisation knob — don't relitigate it without explicit
permission.

### The 14-day demo

Every new install gets full access to everything for 14 days from first
session. The trial clock is keyed on Firebase Auth uid (anonymous works),
stored in `entitlements/{uid}` Firestore doc (separate collection from
world-readable `users/{uid}` — payment state is private). On day 15+
without purchase, the paywall blocks every paid surface; the Daily
Challenge stays free forever.

| Touchpoint | Trigger | File |
|---|---|---|
| Welcome modal | First session per uid | `WelcomeModal` in `TrialModals.tsx` |
| Day 7 midpoint reminder | Trial midpoint, session-start only | `TrialReminderModal` (day=7 branch) |
| Day 10 reminder | 4 days left, session-start only | same component (day=10 branch) |
| Day 13 reminder | 1 day left, session-start only | same component (day=13 branch) |
| Trial countdown chip | Always-visible in Me tab during trial | `TrialCountdownChip` |
| Paywall (value-anchored) | First non-daily problem completed AFTER trial expiry | `Paywall.tsx`, trigger in `App.tsx` |

### Daily Challenge is free forever

**This is the most consequential carve-out.** Expired non-paid users can
still play one Daily Challenge per day. The rule is encoded in
`shouldFirePaywall` (utils/entitlement.ts): paywall only fires when
`questionType !== 'daily'`. Why: the daily is both the engagement loop
AND the viral share surface — letting it stay open means non-payers
keep their streak alive, keep generating share artifacts, and every 30
days get another chance to convert. Per-user cost is ~$0 (1 read + 1
write per day).

### Paywall fire rule (read this before changing the trigger)

The paywall fires AFTER the user completes their first non-daily problem
post-expiry, never on app-open. This is *value-anchored* — the user gets
the dopamine of earning XP first, then sees the ask. The opposite
("open app → instant paywall") tested poorly in early thinking and is
explicitly avoided.

Single source of truth: `shouldFirePaywall()` in `utils/entitlement.ts`.
Truth-table coverage in `src/tests/paywallTrigger.test.ts`. If you
modify the rule, modify the test in the same change.

### Copy rules

- **Forbidden phrasing pattern**: pairing the $3.14 price with a
  possession-threat in the same sentence. "$3.14 keeps your progress
  forever" was the original draft of the paywall — the user pushed back
  hard, citing it as too direct. Correct framing leads with the user's
  own progress numbers (loss aversion via specifics, not slogans) and
  the price sits below as a quiet invitation.
- The paywall surface always mentions **"The Daily Challenge is always
  free"** so users know they're not fully locked out.
- Modals never interrupt mid-session — both `WelcomeModal` and
  `TrialReminderModal` accept an `inSession` prop and defer until the
  user is between sessions (game tab with totalAnswered === 0, OR any
  other tab). The next session-start naturally re-triggers evaluation.

### Hybrid distribution (web-first, native deferred)

Web PWA + Stripe Checkout is canonical — keeps ~$2.75 of every $3.14
(Stripe takes 2.9% + $0.30). Native apps (when shipped *after* web has
60+ days of clean revenue data) will use external-link entitlement to
route purchases back to Stripe, bypassing Apple/Google's 15-30% rake.
The entitlement schema is source-agnostic via `source: 'stripe' |
'apple' | 'google' | 'promo'` so the client gate logic doesn't change.

### Pre-launch checklist

The CLI-first runbook at `docs/billing-safety.md` covers the 10 steps
needed before any paid user touches the app: Firebase Blaze upgrade,
budget alert at \$50/mo, quota caps via `gcloud alpha services quota
update`, Stripe verification + webhook registration, refund policy +
support email, App Check, beta with 5-10 friends. Three steps are
web-only (Blaze upgrade, card entry, KYC) — everything else is CLI.

When live Stripe keys land, the QA playbook at
`docs/first-purchase-qa.md` walks through the first real $3.14 purchase
end-to-end as a 30-minute regression suite.

### Legal pages (drafts, replace before launch)

`src/components/LegalPages.tsx` ships Refund / Privacy / Terms at
`/refund`, `/privacy`, `/terms`. Each has a yellow **"DRAFT — not legal
advice"** banner at the top. The drafts are written against the
codebase's actual data practices (anonymous auth, optional sign-in,
Firestore stats, optional push, Stripe purchase, no third-party
ad-tech). Two sections have inline DRAFT-NOTE callouts flagging
unresolved decisions: **COPPA stance for under-13 users** in Privacy
and **state of incorporation + dispute-resolution clause** in Terms.

**Don't remove the yellow draft banner** without explicit "final copy
is in place" instruction.

## Conventions

- **Prefer CLI over web dashboards** for all infra ops (GitHub, Cloudflare,
  Firebase, Stripe, DNS, etc.). Reasons: reproducible, auditable in shell
  history, scriptable, and AI assistants can execute it directly. Use
  `gh`, `wrangler`, `firebase`, `stripe`, `flarectl`, etc. If a step truly
  requires a browser (OAuth consent, granting a GitHub App access to an
  org, accepting an invite as a different account), call that out
  explicitly — don't silently route around it.
- Don't push directly to `master`; open a PR from a short-lived feature/fix/chore branch targeting `master` (no long-lived `dev` integration branch — see README)
- Run `npm run verify` before pushing — covers lint + tsc + tests + build + worker
- `.env*` is gitignored (with `!.env.example` allowed through). `.env.example`
  documents the schema. Required keys: `VITE_FIREBASE_*` (6 keys), optional
  `VITE_VAPID_PUBLIC_KEY`. Any local backup like `.env.legacy` is covered.
- All Firestore writes from the client must respect `firestore.rules`. Adding
  a new collection requires adding a rule block; the CI doesn't catch missing
  rules but the runtime will reject writes silently
- **No audio in v1 — intentional.** The app uses haptic feedback for physical
  satisfaction (see `src/utils/haptics.ts`) but does not play any sounds.
  Mobile games with audio get muted in >80% of sessions; adding sound also
  brings: opt-in toggle persistence, asset loading cost, autoplay policy
  compliance, accessibility considerations. Decision is to keep haptic-only
  until there's clear product reason to add sound. Don't add `new Audio()`
  or `<audio>` elements without first revisiting this decision in CLAUDE.md.
- **Particles are reserved for milestones only.** `MilestoneBurst` (streak
  3/5/10/25/50) and the achievement-unlock toast fire small particle bursts.
  No other surfaces should add particles — confetti-on-every-correct-answer
  is the classic "crowding" mistake that hurts perceived quality. If you
  want to celebrate a new event, make it a milestone first.
- **Push notifications are opt-in only and rate-limited.** Daily reminder
  is once per day per opted-in user, only if they haven't played in 18h.
  The "you got beaten" speedrun ping is throttled to one per 30 minutes
  per user (see `lastBeatenPingAt` in `functions/src/index.ts`). Copy is
  intentionally soft-toned ("A few problems waiting" not "Keep your
  streak alive!"). If you add new notification types, follow the same
  pattern: opt-in flag in `pushSubscriptions`, soft copy, throttle.
- **Content tone bar — applies to all user-facing copy.** Warm,
  restrained, specific. Never pressure-y. Never childish. Never
  generic motivational-poster hype. Specific praise over generic
  ("Sharp." > "AMAZING! 🎉"). When adding lines to any teacher voice
  array (`src/domains/math/teachers/*.tsx`), base pool
  (`chalkMessages.ts`), trick lesson (`mathTricks.ts`), or achievement
  description (`mathAchievements.ts`), match this bar.
- **No emoji in user-facing copy.** Every emoji that previously lived in
  a string has been replaced by a hand-drawn SVG (`CategoryIcon.tsx`,
  `TrickIcon.tsx`, `MilestoneBurst.tsx`, etc.) or by clean text. The
  chalkboard aesthetic is hand-drawn end to end; emoji break the visual
  consistency. The only exception is the transient emoji-rain on the
  perfect-session screen (it's decorative, not chrome). Per-trick `icon`
  fields in `mathTricks.ts` still hold legacy emoji strings — that data
  is *unused at runtime* (TrickIcon renders SVGs keyed by `trick.id`)
  but kept for backward-compat. Don't add a new emoji-icon field; key
  off the id.
- **Magic Tricks lessons must explain "why", not just "how".** Every
  lesson's first step should name the underlying principle (algebraic
  identity, visual intuition, or historical anecdote). Bare recipes
  ("Double it then drop a zero") are the failure mode — kids forget
  them. Working examples in `src/utils/mathTricks.ts`.
- **Achievement descriptions celebrate the meaning, not the threshold.**
  "Solve 500 problems" is a tax form. "500 problems. That's real
  volume." is a teacher noticing the player. When adding achievements,
  write the desc as if congratulating the player at the moment of
  unlock, not labeling the unlock criteria.
- **Monetization is settled, don't relitigate.** $3.14 lifetime, 14-day
  demo, NO subscription, NO free tier other than the always-free Daily
  Challenge. These are firm decisions backed by recorded rationale (see
  the Monetization section above + `memory/monetization_model.md`).
  When extending, *follow* the model; don't propose alternative pricing,
  subscription tiers, freemium variants, or "Pro" features. The lever
  for raising revenue is conversion-rate UX (trial polish, paywall copy,
  habit formation) — not price changes or tier additions.

## Pre-launch state

What's **done in code** (no further blockers to launch from the codebase side):
- Cloudflare Pages + GitHub Actions CI/CD pipeline (auto-deploy on master)
- Firebase project on `math-swipe-prod` (production) — **on Blaze plan as of 2026-05-12**
- Self-hosted fonts (Fredericka the Great + Architects Daughter in `public/fonts/`)
- 28 question generators with real difficulty curves + 191 total tests across 10 suites (87 in mathGenerator alone)
- 5-tier streak milestone celebrations + near-miss feedback + daily flourish
- Theatrical achievement unlock toast with badge SVG + sparkles
- 8 teacher voices, each with documented persona; full content audit + polish
- Hand-drawn SVG icons throughout (no emoji in user-facing copy except share-card decorative emoji-rain)
- **Monetization model**: 14-day demo + $3.14 lifetime paywall, value-anchored trigger, Stripe Checkout callable + webhook, mock helpers for dev testing
- **Trial UX**: WelcomeModal + Day 7 / 10 / 13 reminders + countdown chip, all session-start-gated, all rendering nothing for paid users
- **Daily-Challenge-free-forever** carve-out (`shouldFirePaywall` exempts `questionType === 'daily'`)
- **6 early-trial achievements** to fill the dopamine gap (streak-3, daily-1, topic-explorer, three-day, accuracy-early, quick-fifty)
- **Legal pages** at /refund, /privacy, /terms (DRAFT banners, awaiting lawyer review)
- **PWA install prompt** in Me tab + iOS end-of-first-session prompt inside SessionSummary (`InstallPrompt.tsx`)
- **Admin billing dashboard** at /admin/billing (`AdminBilling.tsx`) — gated by `isAdmin` custom claim, surfaces trial/paid/expired counts + conversion % + refund rate
- **Truth-table tests** for the paywall fire rule (`shouldFirePaywall`), plus a manual e2e runbook for visual regressions (`docs/paywall-e2e.md`)
- **First-purchase QA playbook** (`docs/first-purchase-qa.md`) — 10-section runbook executable when live Stripe keys land

What's **blocking commercial launch** (operational, not code):
- **Stripe account verification + bank** — 1-3 day KYC turnaround for Lattice Logic. Stripe SDK is wired in `functions/src/stripe.ts`; what's pending is the dashboard.stripe.com KYC submission. Check status with `stripe accounts retrieve` looking for `charges_enabled: true` and `payouts_enabled: true`.
- **Live Stripe secrets** — once verification is done: `firebase functions:secrets:set STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET/STRIPE_PRICE_ID/PUBLIC_ORIGIN` then redeploy `createCheckoutSession` and `stripeWebhook`.
- **Lawyer-reviewed legal copy** — replace draft Refund/Privacy/Terms with reviewed text, strip the yellow DRAFT banner.
- **COPPA stance decision** — under-13 user data flow choice (flagged in `LegalPages.tsx` PrivacyBody DRAFT-NOTE).
- **Governing law clause** — state of incorporation + dispute-resolution language for Terms.
- **Pre-launch billing safety steps** — see status table at top of `docs/billing-safety.md`. Firebase Blaze is done; remaining items are budget alerts, quota caps, App Check, refund policy email, beta testing.
- **Custom domain** (gated on product-name decision — not strictly blocking, `math-swipe-c7k.pages.dev` works).
- App Store / Play Store enrollment — defer per the hybrid-distribution rule until web has 60+ days of clean data.

What's **deferred** (not blocking):
- Sound effects (intentional v1 decision — see Conventions)
- Tablet-optimized layout (mobile-only v1 is fine)
- Real player base for league (3 fake entries + you currently — content problem, not code)
- A/B testing scaffolding (premature without conversion data)
- Family / classroom seat tiers (no demand signal yet)
- Native app shells (per hybrid-distribution rule)
