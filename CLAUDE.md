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
| Achievements | 32 | `src/utils/achievements.ts` (base) + `src/domains/math/mathAchievements.ts` (math-specific) |
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
| Stripe | not yet created | Sign up under company entity when payments are implemented |
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

## Conventions

- **Prefer CLI over web dashboards** for all infra ops (GitHub, Cloudflare,
  Firebase, Stripe, DNS, etc.). Reasons: reproducible, auditable in shell
  history, scriptable, and AI assistants can execute it directly. Use
  `gh`, `wrangler`, `firebase`, `stripe`, `flarectl`, etc. If a step truly
  requires a browser (OAuth consent, granting a GitHub App access to an
  org, accepting an invite as a different account), call that out
  explicitly — don't silently route around it.
- Don't push directly to `master`; PRs go through `dev` → `master` (see README)
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

## Pre-launch state

What's **done**:
- Cloudflare Pages + GitHub Actions CI/CD pipeline (auto-deploy on master)
- Firebase project on `math-swipe-prod` (production)
- Self-hosted fonts (Fredericka the Great + Architects Daughter in `public/fonts/`)
- 28 question generators with real difficulty curves + 50 discrimination tests
- 5-tier streak milestone celebrations (`MilestoneBurst.tsx`)
- Near-miss feedback (warm orange for off-by-15% wrong answers)
- Daily flourish (first-correct-of-day)
- Theatrical achievement unlock toast with badge SVG + sparkles
- 8 teacher voices, each with documented persona
- Content audit + content polish across all surfaces
- Self-hosted fonts, hand-drawn SVG icons throughout
- Stripe / Apple Dev / Play Console enrollments — not started

What's **blocking commercial launch**:
- Custom domain (gated on product-name decision)
- App Store / Play Store enrollment (Apple is 1-3 week verification, start early)

What's **deferred** (not blocking):
- Sound effects (intentional v1 decision — see Conventions)
- Tablet-optimized layout (mobile-only v1 is fine)
- Stripe (only when freemium upgrade ships)
- Real player base for league (3 fake entries + you currently — content problem, not code)
