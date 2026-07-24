# docs/ index

**`status.md` is the start-here doc** — the live queue (shipped / in-review /
blocked / waiting) + deploy cheatsheet. This index is the map of everything else.

One line of truth per document. What lives here is a **runbook** (do these
steps), a **spec** (code must match this), a **decision record** (why things
are the way they are), or a **living queue**. Point-in-time audits get deleted
once their findings ship (git keeps them). **This index is CI-enforced** — every
`docs/*.md` must appear below (`docsIndex.test.ts`), so it can't silently drift.

| Doc | Type | What it's for | Status |
|---|---|---|---|
| [status.md](status.md) | **living queue** | **Start here.** Single source of truth: shipped / in-review / blocked / waiting / deferred + a deploy cheatsheet | Keep current every change |
| [growth.md](growth.md) | living queue | Growth ideation + the A/B experiment tracker + the passive-monitoring (growthDigest) setup + the idea backlog per lever | Active |
| [liveops-calendar.md](liveops-calendar.md) | plan | The Play Promotional Content / LiveOps calendar (events / major updates; offers constrained) — for owner review before any card ships | Draft for review |
| [lattice-logic.md](lattice-logic.md) | company context | Lattice Logic itself: shared account registry, firm principles, the business-process map + adopted gap additions. Copy into every project alongside the playbook | Reference — keep in sync across projects |
| [monorepo-plan.md](monorepo-plan.md) | decision/build plan | DECIDED: all apps move to one monorepo (latticelogic/lattice) — layout, tooling, extract-on-second-use rules, and the migration sequence executed at app #2 start | **Active — execute at app #2 start** |
| [next-app-playbook.md](next-app-playbook.md) | playbook | Every reusable lesson from shipping v1 (architecture, payments sequence, infra, native/CI recipes, process) — for the next app on the same accounts | Reference |
| [release-sync.md](release-sync.md) | decision/runbook | How one web deploy updates web + Play + iOS at once; what needs a store release; versioning + rollback + do-not-break invariants (native-shell reality) | Live |
| [native-android-plan.md](native-android-plan.md) | decision record | Why Android went native (WebView + Play Billing 8) instead of the Bubblewrap TWA | Shipped |
| [native-ios-plan.md](native-ios-plan.md) | decision/build plan | The iOS WKWebView shell (StoreKit 2 + Sign in with Apple + FCM), bridge architecture, fail-closed server verify, and the Apple-gated launch checklist | Built; awaiting enrollment |
| [google-play-launch.md](google-play-launch.md) | runbook | Google Play Console steps (product, service account, RTDN, assetlinks, Data safety), rollout, and the Teacher-Approved / Play Pass strategy | Active — final Console steps |
| [rollback.md](rollback.md) | runbook | Incident rollback: web (Cloudflare dashboard/API — fixes all channels at once) + the rare shell rollback | Run on incident |
| [prd-template.md](prd-template.md) | template | The structured-PRD shape for substantive features (stories → testable acceptance criteria → rollout/risk); starts with app #2 | Reference |
| [native-qa-checklist.md](native-qa-checklist.md) | runbook | Single-pass device QA for a native shell release (splash/offline/app-links/haptics + billing/sign-in/push regression) | Run per native build |
| [paywall-e2e.md](paywall-e2e.md) | runbook | Manual visual e2e checklist for the trial/paywall UX (complements the `shouldFirePaywall` truth-table unit tests) | Run before releases |
| [difficulty-curves.md](difficulty-curves.md) | spec | What Easy/Medium/Hard means per topic — the contract `mathGenerator.ts` + its tests implement | Live spec |
| [i18n.md](i18n.md) | decision/spec | Localization: languages, char budgets, edge cases (decimals, gcd/lcm names, fonts), how to add a locale | Live (12 locales) |

## Sharing decisions (2026-07-16, owner calls after tester sessions)

Recorded here because three plausible-looking features were deliberately
REMOVED — don't reintroduce them without new evidence:

1. **No share-card image generation.** The 1080×1920 PNG card (html-to-image)
   made users wait; the text artifact — headline + 🟩🟥 grid + link — is
   instant and works in every target. `og-card-image.md` (the per-profile
   og:image spike) was deleted with it; `/u/` pages keep the icon image.
2. **No share-destination sheet.** "Share Result" acts directly: native OS
   share where available, otherwise instant clipboard copy with inline
   confirmation. (The per-network intent URLs are in git history.)
3. **No "Challenge a Friend" button.** It duplicated Share Result while
   implying real-time PvP that doesn't exist. Incoming `?c=`/`?target=`
   links still resolve, so old shared links keep working.

Deleted (in git history if ever needed): `audit-2026-05-11.md` and
`content-audit-2026-05-12.md` (point-in-time audits, findings shipped),
`google-app.md` (research note superseded by google-play-launch.md),
`first-purchase-qa.md` (Stripe-era, removed with Stripe),
`og-card-image.md` (superseded by the no-image sharing decision above),
`legal-review-brief.md` (legal pages went live 2026-07-15; the optional
counsel review is a business decision, not a doc to maintain).

Deleted 2026-07-24: `apple-enrollment.md` — enrollment is submitted (tracked in
`status.md` + `memory/apple_enrollment_pulled_forward.md`) and its iOS-build
section is fully superseded by `native-ios-plan.md`. The trademark anti-clone
flag moved to `status.md` (deferred).

Deleted at v1 wrap-up (2026-07-22 — all three were completed pre-launch
runbooks; their reusable lessons are consolidated into
`next-app-playbook.md`, their live config lives in the code +
`CLAUDE.md`): `billing-safety.md` (10-step checklist, all resolved),
`airwallex.md` (payment wiring — done; the integration is live and
documented in `functions/src/airwallex.ts`), `app-check.md` (App Check
registered; enforcement flip when metrics show ~100% verified traffic is
noted in CLAUDE.md).
