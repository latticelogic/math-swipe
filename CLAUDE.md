# Math Swipe — project context for Claude

This file documents conventions and account ownership for anyone (or any
AI assistant) working in this repo. Update as ownership/setup changes.

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
