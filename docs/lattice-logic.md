# Lattice Logic — company context (drop into every project)

**What this is:** the company-level context doc, provided to each project
alongside `next-app-playbook.md`. The playbook says *how we shipped last time*;
this says *who we are, what we own, and how the business runs*. Copy both into
each new repo's `docs/` and keep this one in sync across projects when accounts
change.

**Company:** Lattice Logic Pte. Ltd. — Singapore (UEN 202610912N, D-U-N-S
599687957). Solo owner-operator (Tim) + AI agents doing the build/ops work.
Governing law for products: Singapore. Privacy posture: PDPA-first,
mixed-audience COPPA stance.

---

## 1. Identity & account registry (shared across ALL projects)

Production resources belong to **company** accounts, never personal ones.

| Surface | Account / id | Notes |
|---|---|---|
| Google Workspace (primary admin) | `tim@latticelogic.app` | 2FA on. Use for ALL new company resources. |
| Google personal (legacy) | `njytim@gmail.com` | Read-only reference. Owns legacy `scribble-math-prod` — **never deploy there** (hosts another company's 80+ functions). |
| GCP org | id `138884922843` | Org policies: DRS + `iam.disableServiceAccountKeyCreation` (→ keyless WIF everywhere). |
| Firebase / GCP (per app) | e.g. `math-swipe-prod` (project number 122552558583) | One project per app. Always pass `--project` AND `--account tim@latticelogic.app`. |
| GitHub | `latticelogic` org (admin: `njytim-cyber`) | One repo per app; `delete_branch_on_merge` on. |
| Cloudflare | `tim@latticelogic.app`, account `00e07444cae65d675a140f8560429fad` | Pages hosting + edge workers + DNS. |
| Airwallex | Lattice Logic entity — **LIVE** merchant | Web payments for all apps. Scoped API keys per app. 4%/30-day rolling reserve while history is young. |
| Google Play Console | Lattice Logic **organization** account, dev id `4702989456860744774` | Verified; skips the 20-tester gate. Google Payments merchant profile + 15% fee tier done. |
| Apple Developer | Org enrollment **submitted** 2026-07-23 (ID 325P468S9U) | 1–3 wk verification. Company Apple Account = `tim@latticelogic.app`. |
| Support inbox | `support@latticelogic.app` | Named in legal pages + stores for every app. |
| Play publish CI | `play-publisher@<proj>` SA via WIF pool `github-pool` | Zero GCP roles; power comes only from the Play Console user grant. |

**Registry discipline:** when an account/id changes, update this doc + the
project's CLAUDE.md in the same change.

## 2. Firm principles (apply to every product)

1. **User-first is the tie-breaker.** When tech limits, business constraints, or
   our convenience collide with the player's experience, the player wins. Never
   present an action we can't honor; make the paid path WORK for every reachable
   user (conversion is a target, not "degrade gracefully"); friction at the
   moment of intent is the most expensive failure.
2. **One monorepo for all apps** (decided 2026-07-24): `latticelogic/lattice`
   — apps/ + packages/ (platform-web, platform-functions, game-engine, ui),
   extract-on-second-use, atomic fleet-wide fixes, one dependency surface.
   Plan: math-swipe `docs/monorepo-plan.md`.
3. **Web-first, thin native shells.** The deployed web app IS the product;
   stores ship a WebView/WKWebView shell around the live site (native code only
   for what a WebView can't do: store billing, native sign-in, push, haptics).
   One deploy updates every channel.
4. **Monetization is decided once, recorded, and not relitigated.** Default
   posture: one-time lifetime unlock, no subscription, a free daily-habit
   surface that is never gated. Revenue lever = conversion UX, never price/tiers.
5. **CLI-first ops; keyless CI** (WIF, ASC API keys); the genuinely web-only
   steps (KYC, card entry, attestations, 2FA, real-money clicks) are named and
   handed to the owner explicitly.
6. **Low-HITL agentic development** with hard automation boundaries: agents
   never move money, write signing keys, grant themselves IAM, or check legal
   attestations. One fix per PR, squash-merge, verify-before-push, docs updated
   in the same change (`status.md` + CI-enforced docs index).
7. **Tone bar** for all user-facing copy: warm, restrained, specific; never
   pressure-y, childish, or motivational-poster hype.

## 3. Business process map (owner's diagram, 2026-07)

**I. Market & product** — Market intelligence & ideation (trend analysis,
feasibility vs technical primitives + token estimates, concept generation w/
LLM variation smoke tests) → Product strategy & definition (structured PRDs:
user stories, logic flows, acceptance criteria; asset-generation pipeline;
monetization strategy) → Growth & UA (ASO w/ localized metadata, marketing
asset generation, API-driven campaign management on CPI/LTV).

**II. Back office** — Agent orchestration & development (task decomposition
from PRDs, context management/RAG, autonomous code generation w/ self-correction,
human architectural review + final merge approval) → Automated QA & security
(static/security analysis, test suites mapped to PRD criteria, visual
regression on virtual devices) → CI/CD & deployment (build automation/signing,
store integration, phased rollouts + automated rollback on crash telemetry).

**Infrastructure & AI ops** — cost management (token caps), model optimization,
cloud provisioning (IaC, serverless).

**Corporate & financial** — revenue reconciliation (multi-network → unified
accounting), entity administration (Pte. Ltd. filings), IRAS GST/corporate tax,
server-side receipt validation + cross-platform entitlement.

**User intelligence loop (feedback)** — sentiment analysis (review
scraping/classification), telemetry & event tracking (standardized schema for
funnels/retention), feature routing (RICE prioritization) → feeds ideation.

## 4. Gaps in the map — processes we run that the diagram should include

Learned the hard way on app #1; treat these as first-class processes:

1. **Customer support & refund ops** — `support@latticelogic.app` triage,
   honoring the published refund policy, refund→revoke loops. (Tickets appear
   in the diagram only as sentiment input; answering them is a process.)
2. **Store-policy & privacy compliance (recurring, deadline-driven)** — the
   annual Play bars (targetSdk, Billing Library), Apple review guideline
   shifts, Data-safety/App-privacy declarations, PDPA/COPPA posture, legal
   pages. Missing a deadline rejects your updates. *Partially automated
   2026-07-24: the weekly growthDigest carries a `COMPLIANCE_DEADLINES` watch
   (warns 60 days out, escalates when overdue) — keep the list current as new
   bars are announced.*
3. **Live incident response** — error-spike push alerts, uptime probes,
   post-deploy smoke checks, one-click rollback (web rollback fixes ALL
   channels at once under the thin-shell model). QA is pre-ship; this is after.
4. **Payments risk ops** — chargebacks/disputes, fraud watch (Play Integrity /
   App Check staged log-only → enforce), reserve management, replay-guarded
   entitlement grants + source-gated revocation.
5. **Identity, secrets & key custody** — 2FA on every root account, keyless CI
   (org blocks SA keys), scoped API keys, signing-keystore vaulting, secret
   rotation. A compromised account is an existential risk to ALL apps.
6. **Brand & IP defense** — occupy all store shelves early (the Apple
   enrollment was pulled forward for exactly this), trademark filings (IPOS,
   consider USPTO), same-name-clone takedowns.
7. **Localization pipeline** — machine-draft all locales at build (i18n
   CI-enforced parity), staged store-listing translations, native-review as a
   quality follow-up, not a gate.
8. **Store reputation ops** — in-app review prompts at peak moments (system
   rate-limited), replying to store reviews, LiveOps/Promotional-Content
   calendar as a store-presence lever.
9. **Portfolio go/no-go** — a recorded rule for when an app gets more
   investment vs maintenance-mode vs sunset (RICE covers features; this covers
   apps). Owner decision, reviewed against the funnel/digest numbers — the
   recorded rule is §5 below.

## 5. Portfolio go/no-go rule (recorded 2026-07-24; owner may tune numbers)

Review each app **4 weeks after full store availability**, then **quarterly**,
against the weekly digest + store stats. Defaults (deliberately rough — the
point is that the decision is scheduled and criteria-driven, not vibes):

- **INVEST** (active feature work + growth spend) if ANY of: D7 retention ≥ 15%
  · trial→paid ≥ 2% · installs growing ≥ 20%/wk for 3+ consecutive weeks.
- **MAINTAIN** (compliance updates + incident response only; no new features)
  if it's cash-positive vs its own infra but metrics are flat — the passive
  stack (digest, alerts, Dependabot, deadline watch) makes this cheap.
- **SUNSET** (delist from stores; web stays up read-only; honor all lifetime
  purchases forever — user-first survives the product) after **2 consecutive
  MAINTAIN reviews** with declining installs AND revenue below infra cost.
  Sunsetting never claws back paid entitlements.

Each review's verdict + numbers goes in the app's `status.md`.

## 6. Per-project bootstrap

New app = new Firebase project + Cloudflare Pages project + GitHub repo under
the shared accounts above, then run `next-app-playbook.md` §7 (the launch
checklist). Copy into the new repo: this doc, the playbook, the docs-discipline
convention (`status.md` + CI-enforced `docs/README.md` index), and the CLAUDE.md
skeleton (registry pointer, principles, monetization record, tone bar).
Dependencies: add a 2-line `renovate.json` extending the shared org preset
(currently `github>latticelogic/math-swipe//renovate-preset.json`) — do NOT
write a per-repo dependabot.yml.
