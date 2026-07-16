# docs/ index

One line of truth per document. Point-in-time audit reports get deleted once
their findings ship (the git history keeps them); what lives here is either a
**runbook** (do these steps), a **spec** (code must match this), or a
**decision record** (why things are the way they are).

| Doc | Type | What it's for | Status |
|---|---|---|---|
| [release-sync.md](release-sync.md) | decision/runbook | How one deploy updates web + Google Play + (future) iOS simultaneously; what actually needs a store release; versioning + rollback + the do-not-break invariants | Live |
| [google-play-launch.md](google-play-launch.md) | runbook | Everything left to ship on Google Play: CI `.aab` build flow, every Play Console step (product, service-account, RTDN, assetlinks, Data safety), rollout sequence, plus the Teacher Approved / Play Pass strategy | **Active — next up** |
| [airwallex.md](airwallex.md) | runbook | Wiring the sole payment provider when KYB clears: secrets, deploy, webhook registration, `TODO(airwallex)` confirmations, sandbox→live go-live QA | Waiting on KYB (~days) |
| [billing-safety.md](billing-safety.md) | runbook | Pre-launch billing safety: budget alerts, quota caps, App Check, support email, beta — CLI-first with a status table at top | Partially done (Blaze ✅) |
| [app-check.md](app-check.md) | runbook | Turning on App Check: reCAPTCHA v3 key provisioning (console-only), env var, debug tokens, metrics-then-enforce ordering | Code wired; not enabled |
| [difficulty-curves.md](difficulty-curves.md) | spec | What Easy/Medium/Hard means per topic — the contract `mathGenerator.ts` + its discrimination tests implement | Live spec |
| [i18n.md](i18n.md) | decision/spec | Localization: which languages + wave plan, char budgets, edge cases (decimals, gcd/lcm names, fonts), how to add a locale | Live (en/es/pt-BR) |
| [paywall-e2e.md](paywall-e2e.md) | runbook | Manual visual e2e checklist for the 7-day trial/paywall UX (complements the `shouldFirePaywall` truth-table unit tests) | Run before releases |

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
