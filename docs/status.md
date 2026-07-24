# Project status — live queue

Single source of truth for what's shipped, in-flight, blocked, and waiting.
**Keep this current** — update it in the same change as the work it describes, so
any session starts here instead of re-deriving state. Newest dates at the bottom
of each list. (Conventions live in `CLAUDE.md`; growth specifics in `growth.md`.)

_Last updated: 2026-07-24._

## 🟢 Live / shipped
- **Web PWA** — production at https://mathchallenge.app (Cloudflare Pages, auto-deploy on `master`).
- **Payments** — Airwallex (web) LIVE; native Play Billing 8 (Android) + StoreKit 2 (iOS) wired.
- **Android** — native WebView shell; build 2007 **submitted to production review**, 176 countries (auto-publishes on approval, managed publishing off).
- **Growth infra** — funnel + A/B (`experiments.ts`), `paywall-cta` experiment armed, `growthDigest` weekly monitoring deployed (push; email pending — see below).
- **Play Integrity** — deployed log-only.
- **LiveOps deep links** — `?topic` / `?trick` / `?league` / `?magic` boot params (#208).

## 🟡 In review / waiting on external events (no action)
- **Google Play review of 2007** — in progress. On approval → submit the 11 staged localized listings + trigger native build 2008 as the first update.
- **Apple enrollment verification** — submitted 2026-07-23 (ID 325P468S9U), 1–3 wk. On clearance → run the iOS launch checklist (`native-ios-plan.md`).

## 🔴 Blocked on owner action
- **`firebase login --reauth`** — CLI token expired mid-session (2026-07-24). Blocks: (a) pruning stale **deployed** Stripe functions, (b) **deploying the digest email**. Both are code-ready; just need a valid Firebase CLI session (interactive browser login) then I deploy.
- **Digest email secrets** — after reauth, set `SMTP_USER` + `SMTP_APP_PASSWORD` (Workspace app password) then deploy `growthDigest`. Setup steps inline in `functions/src/index.ts`. Until then the digest **pushes** to admins + stores `opsDigests/` (works today).
- **LiveOps calendar approval** — `liveops-calendar.md` drafted; owner reviews before any cards go out (also gated on the app being published).

## 🟣 Post-launch, metrics-gated
- Play Integrity **enforcement** flip · Play Billing protection → 4/4 · R8 size shrink (tested) · read `paywall-cta` A/B + register the next experiment.

## ⚪ Ready to ship the moment its gate clears (prepared ahead)
- **iOS shell** — built, compiles on CI, Apple verify functions deployed fail-closed. **Pre-Apple prep done** (#210): app icon, associated-domains, StoreReview bridge, dormant TestFlight CI lane. Remaining = Apple-credential steps only (`native-ios-plan.md`).
- **Native build 2008** (Android) — has the Integrity bridge + all tier code; trigger as an update once 2007 is live.
- **11 localized store listings** (Android) — staged; submit after 2007 review clears.

## 🔵 Strategic / deferred (owner call, no urgency)
- PGS / Play Games reach (`deferred_pgs_integration`) · store promo video (design).
- **Trademark "Math Challenge"** (Lattice Logic Pte. Ltd. via Singapore IPOS; consider US USPTO) — the clean legal lever against a same-name clone on either store. Business call, not code.

## 🧹 Tech health / maintainability
- Overall: healthy for size (~42K src lines, 30 test files, CI lint+types+tests+build, enforced docs index). Most large files are cohesive data/pure-fn (mathGenerator = 35 generators, mathTricks + i18n = data) — fine.
- **One hotspot: `App.tsx` (~1,930 lines)** — god-component (boot params, tab routing, paywall orchestration, session lifecycle, many effects). Highest-leverage refactor: extract cohesive hooks (e.g. `useBootParams`, `usePaywallController`, session/tab state) in small, test-guarded PRs. Deliberate effort — not a squeeze-in (it's the core; churn is risky). Do with the suite as guardrail.
- Optional guard: a size-budget lint warning on new files > ~800 lines to stop new god-files forming.

## Deploy cheatsheet
- **Web** → merge to `master`, auto-deploys via CI.
- **Functions** → manual `firebase deploy --only functions:<name> --project math-swipe-prod --account tim@latticelogic.app` (needs valid CLI auth).
- **Firestore rules** → `firebase deploy --only firestore:rules ...`; the emulator **rules test lane runs in CI on rule changes — wait for it green before merging** (needs Java, not in `npm run verify`).
- **Android `.aab`** → CI (`android-build.yml`) auto-publishes to internal via WIF; internal→production is a manual owner action.
- **iOS** → `ios-native-build.yml` (manual dispatch): compile check always; archive+TestFlight dormant behind `vars.IOS_RELEASE_READY`.
