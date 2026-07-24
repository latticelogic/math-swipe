# Monorepo plan — the portfolio's home (DECIDED 2026-07-24, owner)

**Decision:** all Lattice Logic apps move into one monorepo. Rationale: at
~1 app/2 weeks on 2–3 channels, copy-template forks the platform (a money-path
fix would need N hand-ported PRs), and private packages add a version matrix.
One repo = atomic fleet-wide fixes, one test suite guarding every app, one
dependency surface, one context for agents. Speed AND quality — the two owner
concerns — both point here.

**Prime directive: extract-on-second-use.** Do NOT big-bang refactor
math-swipe. It moves in nearly untouched; a block graduates from
`apps/math-swipe/src/...` to `packages/` only when app #2 actually imports it.
The second consumer defines the API — not speculation.

## Layout

```
lattice/                       ← suggested repo name: latticelogic/lattice
  apps/
    math-swipe/                ← this repo's src/ public/ functions/ edge/ docs/
      android-native/          ← shells stay PER-APP (ids/icons differ; Kotlin/
      ios-native/                Swift sharing isn't worth a package layer —
                                 one repo makes shell drift diff-visible)
    <app-2>/
  packages/                    ← created EMPTY; filled on second use
    platform-web/              ← channel, checkout, entitlement, experiments,
                                 funnel, push, haptics, sound, i18n core,
                                 safeStorage, errorMonitor, nativeShell, boot params
    platform-functions/        ← airwallex/playBilling/appleBilling cores,
                                 referral, digest, errorSpike (parameterized by
                                 SKU/package/bundle ids + app config object)
    game-engine/               ← categories, adaptive difficulty, streaks+shields,
                                 achievements, league, daily seeding, teacher
                                 framework (educational-game genre layer —
                                 other genres later skip this package)
    ui/                        ← Paywall, TrialModals, celebrations, admin pages
  shells/                      ← pristine templates for bootstrapping app N+1
  docs/                        ← company docs (lattice-logic.md, playbook,
                                 monorepo conventions); each app keeps its OWN
                                 docs/ + status.md + CI-enforced index
  renovate.json                ← ONE file, whole fleet (preset collapses inward)
  turbo.json / pnpm-workspace.yaml
```

## Tooling

- **pnpm workspaces + Turborepo** (task graph + caching; `--filter` for
  affected-only builds). TS project references only if/when build times demand.
- **CI:** per-app deploy workflows with `paths:` filters
  (`apps/math-swipe/**`, `packages/**`); a `packages/**` change deploys every
  consuming app (correct — that's the point). Verify runs
  `turbo run verify --filter=...[origin/master]` (affected only).
- **Per-app stays per-app:** Firebase project, Cloudflare Pages project, store
  listings, secrets (namespaced: `MATHSWIPE_*` / shared: `CLOUDFLARE_*`),
  status.md, CLAUDE.md section.

## Migration sequence (execute at app #2 start)

1. **Owner:** create `latticelogic/lattice` (agent is classifier-blocked from
   org-repo creation) + install the Renovate app if not yet done.
2. Scaffold workspace (pnpm + turbo + root renovate.json + CI skeletons).
3. Import math-swipe WITH history:
   `git subtree add --prefix=apps/math-swipe https://github.com/latticelogic/math-swipe master`
   (subtree keeps history greppable; simpler than filter-repo and good enough).
4. Fix paths (tsconfig/vite/functions/workflow working-directories), port repo
   secrets + variables (`gh secret set` — WIF/Play vars, VITE_*, Cloudflare),
   set `delete_branch_on_merge`.
5. Prove the pipeline: verify green → **deploy math-swipe to production from
   the monorepo** (same wrangler action + secrets; Pages project unchanged) →
   smoke passes → archive the old repo (read-only; description points to
   `lattice`). Note: in-flight store reviews are unaffected (builds are
   artifacts, not repo-linked).
6. Bring app #2 in as `apps/<app-2>/` (its partial build imports platform
   blocks; first extractions happen HERE, PR by PR).
7. Company docs (lattice-logic.md, playbook, this file) move to root `docs/`;
   math-swipe's app docs stay in `apps/math-swipe/docs/`.

## Extraction rules (quality guardrails)

- A block moves to `packages/` only with: its tests moving with it, zero
  app-specific imports remaining, and an app-config injection point instead of
  constants (SKU, package ids, trial length, colors).
- Money-path packages (`platform-functions`, entitlement) keep their
  truth-table tests package-local — they run on EVERY fleet change.
- The docs-discipline test (docsIndex) becomes a shared check run per app dir.
- Shells: bootstrap new apps by copying `shells/`; per-app shells may drift
  intentionally (features), but a monthly `diff shells/ apps/*/` review keeps
  it honest.

## What does NOT move

- The `math-swipe` GitHub repo stays as an archived redirect (history is also
  inside the monorepo via subtree).
- Firebase projects, Cloudflare Pages projects, Play/ASC apps — untouched.
- The paused-state gates (Google review, Apple enrollment) — tracked in
  `apps/math-swipe/docs/status.md` after the move.
