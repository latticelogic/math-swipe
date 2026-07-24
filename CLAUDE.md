# Math Challenge — project context for Claude

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

**Production URL**: https://mathchallenge.app (Cloudflare Pages)

### Surface map — what lives where

| Surface | Count | File |
|---|---|---|
| Tabs (bottom nav) | 4 | Let's Go / League / Magic / Me — wired in `src/App.tsx` |
| Question topics | 35 | `src/domains/math/mathCategories.ts` (catalog) + `src/utils/mathGenerator.ts` (per-topic generators) |
| Age bands | 1 in use | `full` only (default, ages 8+). The `starter`/`AgeBand` machinery survives in `mathCategories.ts` but the picker was removed 2026-07-15 — `ageBand` is hardcoded `full`. |
| Difficulty levels | 5 | Auto-adjusted by `useDifficulty.ts` based on response time |
| Magic tricks | 36 | `src/utils/mathTricks.ts` (lessons + practice generators) |
| Achievements | 28 math + share + early-trial ladder | `src/utils/achievements.ts` (base engine) + `src/domains/math/mathAchievements.ts` (math-specific list, includes the 6-rung early-trial ladder + `spread-the-word` share achievement) |
| Paywall + trial UX | 7-day demo → \$3.14 lifetime | `src/components/Paywall.tsx`, `src/components/TrialModals.tsx`, `src/hooks/useEntitlement.ts`, `src/utils/entitlement.ts` (incl. `shouldFirePaywall` rule) |
| Airwallex checkout integration | callable + webhook | `functions/src/airwallex.ts` (Cloud Functions) + `src/utils/checkout.ts` (channel-aware client wrapper: Airwallex on web, Play Billing in the TWA) |
| Legal pages | 4 LIVE | `src/components/LegalPages.tsx` — Privacy / Terms / Refund / Pricing (no draft banner since 2026-07-15; Pricing + `BusinessBlock` added 2026-07-21 for Airwallex website requirements); routed at `/privacy`, `/terms`, `/refund`, `/pricing`. Footer row shows Pricing · Privacy · Terms; Refund is linked from inside Terms (owner call, reaffirmed 2026-07-21). |
| Next-app playbook | reference | `docs/next-app-playbook.md` — reusable lessons from v1 (payments, infra, Bubblewrap/TWA CI, Play) for the next app on the same accounts |
| Paywall e2e regression | manual checklist | `docs/paywall-e2e.md` (MCP-driven visual e2e) + `src/tests/paywallTrigger.test.ts` (truth-table unit test) |
| Teachers (companion characters) | 8 | `src/domains/math/teachers/*.tsx` — each has a documented voice persona |
| Streak milestone tiers | 5 | `MilestoneBurst.tsx` at 3/5/10/25/50 — sparkle → flame → bolt → crown → trophy |
| Teacher message pools | base + per-teacher | `src/utils/chalkMessages.ts` (base) + `src/domains/math/teachers/*.tsx` (overrides) |
| Math-topic flavour | per-topic | `src/domains/math/mathMessages.ts` (success/fail quips per topic) |
| Category icons | 35 | `src/components/CategoryIcon.tsx` — hand-drawn SVGs (+ RankIcon / TrailIcon / icons.tsx cover ranks, trails, stat/HUD glyphs) |
| Trick icons | 36 | `src/components/TrickIcon.tsx` — hand-drawn SVGs |
| Difficulty curves spec | — | `docs/difficulty-curves.md` (what Easy/Medium/Hard means per topic) |
| Docs index | — | `docs/README.md` (one-line map of every doc: runbooks, specs, decision records) |
| Multi-channel release model | — | `docs/release-sync.md` (one deploy updates web + Play + iOS; what needs a store release) |
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
| Cloudflare Pages | `tim@latticelogic.app`, account id `00e07444cae65d675a140f8560429fad` | Project `math-swipe`, production URL `https://mathchallenge.app`. Production branch `master`. Env vars `FIREBASE_PROJECT_ID`, `PUBLIC_ORIGIN`, `NODE_VERSION` set on both production + preview configs. Custom domain `mathchallenge.app` attached (live). |
| Airwallex | **LIVE 2026-07-22** | Payments are Airwallex-only (Stripe removed 2026-07-15). KYB approved, all 6 methods active, real purchase+refund verified. Functions `functions/src/airwallex.ts` deployed; secrets `AIRWALLEX_CLIENT_ID/API_KEY/WEBHOOK_SECRET`, `PUBLIC_ORIGIN` set. Webhook events: `payment_intent.succeeded` + `refund.settled`. Config record: code comments in `airwallex.ts`; reusable playbook: `next-app-playbook.md` §2. |
| Apple Developer | not yet enrolled | Must enroll as Lattice Logic with company DUNS, $99/yr. 1-3 week verification window. Deliberately LAST of the three channels. |
| Google Play Console | **enrolled (org), verified** 2026-07-15 | Lattice Logic organization account — company + representative verified (org accounts skip the 20-tester gate). Package `app.mathchallenge.twa`. Code complete (#74): TWA via Bubblewrap, CI `.aab` build (`android-build.yml`), Play Billing (Digital Goods API) + `verifyPlayPurchase`/`playRtdn` functions. Remaining: Console clickwork per `docs/google-play-launch.md`. |

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
| Payments | Airwallex (web) + Play Billing (Android TWA) | Replaced Stripe 2026-07-15; hosted-checkout callable + webhook in `functions/src/airwallex.ts` |

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

### The 7-day demo + the Pro set (updated 2026-07-16: trial shortened 14→7 days, owner call — two weeks was too long for a game this quick)

**Two gates, not one.** Every new install gets free access to the CORE for
7 days from first session — all topics, the Daily, adaptive difficulty,
streaks, base achievements, and the *earned* cosmetics. A small **Pro set is
pay-gated from day 1, even during the trial**, so eager users have a reason to
convert early (testers confirmed there was previously zero incentive to pay
before the day-14 wall). The Pro set:
- **Advanced modes** — Hard / Timed / Ultimate (`isPaid` gate in ActionButtons)
- **Magic Tricks** — free starter set (`isFreeTrick`, the 6 easiest by
  difficulty); the rest of the 36-trick library is Pro
- **Pro cosmetics pack** — the `pro:true` chalk themes (Obsidian, Molten) +
  the Comet trail (a Pro costume is a noted fast-follow)

Access logic: core uses `hasAccess()` (trial-or-paid); the Pro set uses
`isPaid()` (paid only). Tapping a locked Pro thing opens the Paywall in its
dismissible `mode='pro'` (aspirational "Unlock everything"); post-trial it's
the hard `mode='expired'` gate. The Daily is never gated by either. This did
NOT touch the firm decisions ($3.14, no subscription, Daily free) — only the
trial *structure*.

The trial clock is keyed on Firebase Auth uid (anonymous works),
stored in `entitlements/{uid}` Firestore doc (separate collection from
world-readable `users/{uid}` — payment state is private). On day 8+
without purchase, the paywall blocks every paid surface; the Daily
Challenge stays free forever.

| Touchpoint | Trigger | File |
|---|---|---|
| Welcome modal | First session per uid | `WelcomeModal` in `TrialModals.tsx` |
| Day 4 midpoint reminder | Trial midpoint, session-start only | `TrialReminderModal` (day=4 branch) |
| Day 6 reminder | 1 day left, session-start only | same component (day=6 branch) |
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
- **No forward-binding "free forever" promises in product copy** (owner
  call 2026-07-21): the paywall's "The Daily Challenge is always free"
  line was removed, along with the pricing page's "no subscription ever"
  absolutism — the owner may expand the model later (possibly including
  subscriptions) and product copy shouldn't box that in. The Daily
  *behavior* (never gated) is unchanged; only the copy promises went.
  The WelcomeModal still has a softer `welcome.dailyFree` line — flag it
  to the owner before adding any new copy of this kind.
- Modals never interrupt mid-session — both `WelcomeModal` and
  `TrialReminderModal` accept an `inSession` prop and defer until the
  user is between sessions (game tab with totalAnswered === 0, OR any
  other tab). The next session-start naturally re-triggers evaluation.

### Hybrid distribution (web-first, native deferred)

Web PWA + Airwallex hosted checkout is canonical — card-processing fees
are a fraction of the 15-30% app-store rake. The Android TWA uses Play
Billing (Google Play policy forbids external payment flows in-app; see
`src/utils/checkout.ts` for the channel routing). The entitlement schema
is source-agnostic via `source: 'airwallex' | 'apple' | 'google' |
'promo'` so the client gate logic doesn't change per channel.

### Pre-launch checklist — DONE (2026-07-22)

All 10 pre-launch billing-safety steps are resolved: Firebase Blaze,
budget alert, quota caps (resolved as-possible — Google removed
self-serve caps; `maxInstances` + budget + App Check are the real
bounds), Airwallex verification + webhook, refund policy + support inbox,
App Check registered (enforcement pending metrics), friend beta. The
reusable version of this checklist + all the gotchas is in
`docs/next-app-playbook.md` (§3 infra, §7 checklist).

Payments went live end-to-end: the purchase → grant → refund → revoke
loop was verified money-free AND with a real $3.14 purchase. The reusable
QA-loop steps live in `next-app-playbook.md` §2.

### Legal pages (LIVE since 2026-07-15)

`src/components/LegalPages.tsx` ships Privacy / Terms / Refund at
`/privacy`, `/terms`, `/refund` — no draft banner. Written against the
codebase's actual data practices (anonymous auth, optional sign-in,
Firestore stats, optional push, Airwallex/Play purchase, no third-party
ad-tech). Resolved by the owner: governing law = Singapore (Lattice
Logic Pte. Ltd.), COPPA stance = mixed-audience / PDPA-first. The footer
row is Privacy · Terms; the Refund policy is linked from inside the
Terms. An optional fixed-fee counsel check is still advisable but is a
business call, not a code blocker.

## Conventions

- **User first — the tie-breaker for every decision.** This app exists to
  serve the player, not to extract from them. When a technical limit, a
  business constraint, or our own convenience collides with the player's
  experience, the player wins and we absorb the cost. This is the rule that
  breaks ties when other principles conflict. What it means in practice:
  - **Never present an action we can't honor.** A purchase CTA that
    dead-ends is a broken promise at the moment of *peak trust* (a player who
    reached for their wallet). Detect the failure *before* offering the action.
  - **Make the paid path WORK for every user we can reach — don't settle for
    "fail gracefully."** Conversion is a real target, not a nice-to-have.
    Quietly dropping a willing buyer into the free tier concedes the sale and
    fails BOTH the player who wanted to buy AND the business. When purchasing
    breaks, the job is to *fix it* or offer a compliant recovery (e.g. detect
    an outdated Chrome/WebView and guide the update that unlocks Play Billing —
    updating an app via Play is allowed; steering to external payment is not),
    NOT to shrug and hand out free. Graceful degradation to the free
    experience is the last-resort backstop for the genuinely impossible sliver
    — never the plan, and never a substitute for making it work for all.
  - **Friction at the moment of intent is the most expensive failure in the
    product.** Losing a high-intent player hurts far more than a low-intent
    bounce, and it's what earns 1-star reviews. Treat it as a launch blocker,
    not polish. Concretely: **in-app Play Billing must work across the real
    device population before any Android production push** — Play policy leaves
    no acceptable-friction alternative, so "most users can pay" is not the bar;
    "every reachable user can pay" is.
  - **A change that eases our ops but worsens the player's experience is the
    wrong change.** Measure decisions from the player's journey, not ours.
  - The value-anchored paywall, the Daily-never-gated behavior, the
    no-possession-threat copy rules, and the warm/restrained tone bar are all
    *expressions* of this principle — not exceptions to it. This is the
    company posture (user-first, the way Google/Anthropic frame it), enshrined
    here so it governs code and copy, not just intentions.
- **Docs discipline — keep them current *in the same change*, don't let them
  sprawl.** The doc set rots if updates lag the code. The rules:
  - **`docs/status.md` is the start-here living queue** (shipped / in-review /
    blocked / waiting / deferred). Update it in the SAME change as any state
    change — a merge, a deploy, a new blocker. If a turn changed project state
    and didn't touch status.md, that's a miss.
  - **`docs/README.md` indexes every doc, and it's CI-enforced**
    (`docsIndex.test.ts` fails if a `docs/*.md` isn't listed, or the index links
    a deleted doc). Add/remove the index row WITH the doc — never separately.
  - **Prefer updating or deleting a doc over adding one.** One doc per concern.
    When a doc's subject ships or is superseded, update its Status line or delete
    the doc (git history keeps it) + note it in the README's "Deleted" list.
    Don't create a new doc for something an existing one covers.
  - Point-in-time reports (audits) get deleted once their findings ship; durable
    docs are runbook / spec / decision-record / living-queue only.
- **Prefer CLI over web dashboards** for all infra ops (GitHub, Cloudflare,
  Firebase, DNS, etc.). Reasons: reproducible, auditable in shell
  history, scriptable, and AI assistants can execute it directly. Use
  `gh`, `wrangler`, `firebase`, `flarectl`, etc. If a step truly
  requires a browser (OAuth consent, granting a GitHub App access to an
  org, accepting an invite as a different account, Apple/Play identity
  verification), call that out explicitly — don't silently route around it.
- **Play `.aab` uploads are CI-driven and KEYLESS, NOT manual Console upload**
  (owner call 2026-07-23). `android-build.yml` builds the bundle and publishes
  it to the Play **internal** track via the Play Developer API, authenticated
  by **Workload Identity Federation** — no exported SA key (the org enforces
  `iam.disableServiceAccountKeyCreation`, and keyless is best practice). A
  dedicated zero-role SA `play-publisher@math-swipe-prod` is bound to the repo
  via WIF pool `github-pool`; config lives in repo *variables*
  `PLAY_WIF_PROVIDER` / `PLAY_PUBLISHER_SA` (not secrets). The SA must also be a
  Play Console user with "Release to testing tracks". Promoting internal →
  production stays a deliberate owner action. Never hand-upload when CI can; if
  WIF vars are absent the build still stores the `.aab` artifact + logs a
  notice. Setup + reproduction: `google-play-launch.md §A1b`,
  `next-app-playbook.md §4`.
- Don't push directly to `master`; open a PR from a short-lived feature/fix/chore branch targeting `master` (no long-lived `dev` integration branch — see README)
- Run `npm run verify` before pushing — covers lint + tsc + tests + build + worker
- `.env*` is gitignored (with `!.env.example` allowed through). `.env.example`
  documents the schema. Required keys: `VITE_FIREBASE_*` (6 keys), optional
  `VITE_VAPID_PUBLIC_KEY`. Any local backup like `.env.legacy` is covered.
- All Firestore writes from the client must respect `firestore.rules`. Adding
  a new collection requires adding a rule block; the CI doesn't catch missing
  rules but the runtime will reject writes silently
- **Sound is opt-in, default OFF, and asset-free** (revised 2026-07-16 — the
  earlier "no audio in v1" decision was reopened on owner request). Mobile
  games with audio get muted in >80% of sessions, so it stays off unless the
  player enables it in Settings. Tones are **synthesized via the Web Audio
  API** (`src/utils/sound.ts`) — no `.mp3`/`.wav` assets, no loading cost,
  nothing to precache. Sounds fire from the answer moment (inside the swipe
  gesture), so autoplay policy is satisfied without a separate unlock. If you
  add new sounds, put them in `sound.ts` next to the haptic siblings, keep
  them short + gentle (kids' confidence), and gate on `isSoundOn()`. Still no
  `<audio>` elements or asset files without revisiting this note.
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
- **i18n (see `docs/i18n.md`).** Tier-1 UI is localized and selectable in 12
  locales (en/es/pt-BR/fr/de/it/id/ko/zh-Hans/zh-Hant/ja/hi); ar is out (RTL is
  a layout project). Non-Latin scripts use a
  system-font fallback (`[data-locale]` in `index.css`) — a handwriting-font
  pass is a documented follow-up, not a blocker. New UI strings go
  through `t()`/`tCount()` from `src/i18n` — add the key to ALL catalogs
  (parity + length budgets + no-emoji are CI-enforced in `i18n.test.ts`).
  Full-sentence templates with {placeholders}; never concatenate fragments;
  never `slice()` display text. Math notation stays locale-invariant ('.'
  decimals) by policy. **Everything user-facing is localized in all 12 locales**
  — chrome AND voice (teacher lines, achievement names/descs, all 36 trick
  lessons + categories, proper-noun names for ranks/teachers/trails/themes, math
  screen-reader words). Machine-drafted; a native-review pass is a quality
  follow-up, NOT a gate on shipping a locale (owner call 2026-07-16).
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
- **Monetization is settled, don't relitigate.** $3.14 lifetime, NO
  subscription, Daily Challenge always free. These three are firm. The
  trial *structure* was tuned 2026-07-15 to a two-gate model (now 7-day free
  CORE + a Pro set pay-gated from day 1 — see "The 7-day demo + the Pro
  set" above); that was an owner-directed change, not a relitigation of
  price/subscription. Backed by recorded rationale (Monetization section +
  `memory/monetization_model.md`).
  When extending, *follow* the model; don't propose alternative pricing,
  subscription tiers, freemium variants, or "Pro" features. The lever
  for raising revenue is conversion-rate UX (trial polish, paywall copy,
  habit formation) — not price changes or tier additions. To MEASURE those
  UX bets, use the A/B scaffolding in `src/utils/experiments.ts`: register an
  experiment (deterministic per-uid assignment, kill-switch via `active`),
  consume it with `useExperiment(id, uid)`, and exposures log to
  `experimentExposures` (write-only, joined to conversions server-side).

## Pre-launch state

What's **done in code** (no further blockers to launch from the codebase side):
- Cloudflare Pages + GitHub Actions CI/CD pipeline (auto-deploy on master)
- Firebase project on `math-swipe-prod` (production) — **on Blaze plan as of 2026-05-12**
- Self-hosted fonts (Fredericka the Great + Architects Daughter in `public/fonts/`)
- 35 question generators with real difficulty curves + ~376 tests across the suite
- 5-tier streak milestone celebrations + near-miss feedback + daily flourish
- Theatrical achievement unlock toast with badge SVG + sparkles
- 8 teacher voices, each with documented persona; full content audit + polish
- Hand-drawn SVG icons throughout (no emoji in user-facing copy except share-card decorative emoji-rain)
- **Monetization model**: 7-day demo + $3.14 lifetime paywall, value-anchored trigger, Airwallex checkout callable + webhook (+ Play Billing in the TWA), mock helpers for dev testing
- **Trial UX**: WelcomeModal + Day 4 / 6 reminders + countdown chip, all session-start-gated, all rendering nothing for paid users
- **Daily-Challenge-free-forever** carve-out (`shouldFirePaywall` exempts `questionType === 'daily'`)
- **6 early-trial achievements** to fill the dopamine gap (streak-3, daily-1, topic-explorer, three-day, accuracy-early, quick-fifty)
- **Legal pages** LIVE at /privacy, /terms, /refund (no draft banner; governing law = Singapore, COPPA = mixed-audience/PDPA-first)
- **PWA install prompt** in Me tab + iOS end-of-first-session prompt inside SessionSummary (`InstallPrompt.tsx`)
- **Admin billing dashboard** at /admin/billing (`AdminBilling.tsx`) — gated by `isAdmin` custom claim, surfaces trial/paid/expired counts + conversion % + refund rate
- **Truth-table tests** for the paywall fire rule (`shouldFirePaywall`), plus a manual e2e runbook for visual regressions (`docs/paywall-e2e.md`)
- **Payments LIVE** — Airwallex web (`airwallex.ts`) + Play Billing in the TWA (`playBilling.ts`); source-agnostic entitlement so buy-on-web unlocks Android on sign-in

What's **left for a full multi-channel launch** (web is DONE and earning):
- **Airwallex payments: DONE 2026-07-22.** KYB approved, all six methods active; a real $3.14 purchase → grant (verified: paidAt, Pro unlocked, referral credit) → dashboard refund. The Payment-Link-intent-has-no-metadata gap was found and fixed (#137, `resolveUidForIntent`/`resolveUidForRefund`). Merchant info saved (ASCII-only — em-dash was rejected). 4%/30-day rolling reserve on early settlements. The web product takes real money now.
- **Pre-launch billing safety: all 10 steps DONE** (see "Pre-launch checklist" above; reusable version in `next-app-playbook.md` §7). Only App Check *enforcement* is a deliberate future flip (when metrics show ~100% verified traffic).
- **Google Play: signed `.aab` builds green** (2026-07-22, after the Bubblewrap CI odyssey — recipe in `next-app-playbook.md` §4). App created, service account invited (Gen2 **compute** SA, not appspot), Google Payments merchant account + 15% fee tier done, listing assets ready (`store-assets/`). Remaining Console clickwork + internal-track QA: `docs/google-play-launch.md`.
- **Play Aug-31-2026 compliance (found 2026-07-23):** two "action required" flags. (1) **targetSdk 36** — Bubblewrap templates hardcode `targetSdkVersion 35`; `android-build.yml` now force-patches the generated `app/build.gradle` to 36 with a fail-loud guard (compileSdk was already 36). (2) **Play Billing Library 8** — BLOCKED upstream: every TWA gets Play Billing via `com.google.androidbrowserhelper:billing`, whose latest release (2.7.2) + `main` still pin `com.android.billingclient:billing 7.1.1`. No fix ships until Google bumps their library; forcing 8 breaks their 7.x-era delegate. Neither flag blocks the *initial* listing (they only reject *updates* after Aug 31); Google offers an extension to **Nov 1**. Plan: monitor `android-browser-helper` for the PBL-8 bump → rebuild; take the extension if it's late. See `next-app-playbook.md` §4.
- App Store enrollment — defer per the hybrid-distribution rule (Apple is last).

What's **deferred** (not blocking):
- Sound *assets* — sound itself shipped 2026-07-16 as opt-in synthesized Web Audio tones (see Conventions); `.mp3`/`.wav` files remain out
- Tablet-optimized layout (mobile-only v1 is fine)
- Real player base for league (3 fake entries + you currently — content problem, not code)
- Live A/B experiments — the scaffolding exists (`src/utils/experiments.ts`, see Conventions); running experiments waits for conversion data
- Family / classroom seat tiers (no demand signal yet)
- Native app shells (per hybrid-distribution rule)
