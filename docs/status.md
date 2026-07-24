# Project status — live queue

Single source of truth for what's shipped, in-flight, blocked, and waiting.
**Keep this current** — update it in the same change as the work it describes, so
any session starts here instead of re-deriving state. Newest dates at the bottom
of each list. (Conventions live in `CLAUDE.md`; growth specifics in `growth.md`.)

_Last updated: 2026-07-24._

## ⏸️ PROJECT PAUSED (2026-07-24, owner call)

Everything doable without external input is DONE; development shifts to **app
#2** until a gate opens. The product is live + earning on web, monitored
passively (growthDigest weekly + errorSpike + uptime). **Re-entry triggers:**
1. **Google Play review clears** (2007 auto-publishes) → submit the 11 staged
   localized listings; trigger native build 2008 (internal → QA → promote);
   later: Integrity enforcement + Billing protection 4/4 + R8.
2. **Apple enrollment clears** → run the checklist in `native-ios-plan.md`
   (ASC app record → APP_APPLE_ID → IAP → TestFlight lane via
   `IOS_RELEASE_READY`).
3. **Owner inputs, whenever:** Workspace app password (email digest — code
   deployed, no-op until secrets), LiveOps calendar approval (post-publish).
For app #2: copy `lattice-logic.md` + `next-app-playbook.md` (§7 checklist,
§8 reusable assets).

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
- **One hotspot: `App.tsx` (~1,930 lines)** — god-component (boot params, tab routing, paywall orchestration, session lifecycle, many effects). **DEFERRED (owner call 2026-07-24)** — not urgent; it works and is test-covered. When revisited: extract cohesive hooks (e.g. `useBootParams`, `usePaywallController`, session/tab state) in small, test-guarded PRs, not a big-bang (it's the core; churn is risky).
- Optional guard: a size-budget lint warning on new files > ~800 lines to stop new god-files forming.
- **Visual regression in CI** (Playwright pixel-diff of ~6 key screens) — the one remaining QA-map gap; PENDING OWNER CALL (adds ongoing baseline maintenance to every intentional UI change).

## Dependency policy — MIGRATING to Renovate (owner decision 2026-07-24)

At ~1 app/2 weeks the portfolio needs ONE shared dependency policy, not N
dependabot.yml copies. The shared preset is live at `renovate-preset.json`
(every future app's `renovate.json` = one `extends` line; policy changes land
fleet-wide). **Owner steps to activate:** (1) install the Mend Renovate GitHub
App → https://github.com/apps/renovate → Install → `latticelogic` org → All
repositories (browser-only, org-grant). (2) Optionally create a dedicated
`latticelogic/renovate-config` repo later (agent was classifier-blocked from
creating org repos) and move the preset — one-line change per app. **After
Renovate's first successful run here: delete `.github/dependabot.yml`**
(version-update half; GitHub security alerts stay on regardless). Until the app
is installed, Dependabot remains active — no coverage gap.

## Dependency policy (Dependabot, from 2026-07-24)
- **Minor/patch groups** (weekly, Mondays): take promptly — verify locally if the
  Dependabot CI run predates trust, else merge on green. Security advisories: immediately.
- **Majors: never bot-merged.** Deliberate upgrades only — server stack
  (firebase-admin/functions, google-auth) with support-window review; TypeScript 7
  as a migration; native-shell majors (billingclient, firebase-bom) only inside a
  device-QA build cycle. Ignored majors are re-proposed by bumping manually.
- **android-native minor/patch group**: held open, taken with the next shell build
  (no per-PR compile check — the macOS lane is manual-dispatch).
- **Parked lint rules**: eslint-plugin-react-hooks 7.1's compiler rules
  (set-state-in-effect, purity, refs, preserve-manual-memoization) are at WARN
  (~21 findings, mostly App.tsx) — flip to error when the deferred App.tsx
  refactor lands (#237).

## Deploy cheatsheet
- **Web** → merge to `master`, auto-deploys via CI.
- **Functions** → manual `firebase deploy --only functions:<name> --project math-swipe-prod --account tim@latticelogic.app` (needs valid CLI auth).
- **Firestore rules** → `firebase deploy --only firestore:rules ...`; the emulator **rules test lane runs in CI on rule changes — wait for it green before merging** (needs Java, not in `npm run verify`).
- **Android `.aab`** → CI (`android-native-build.yml`) auto-publishes to internal via WIF; internal→production is a manual owner action. (The Bubblewrap TWA `android/` + `android-build.yml` were deleted 2026-07-24 — native shell superseded them; git history retains them.)
- **iOS** → `ios-native-build.yml` (manual dispatch): compile check always; archive+TestFlight dormant behind `vars.IOS_RELEASE_READY`.
