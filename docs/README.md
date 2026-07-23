# docs/ index

One line of truth per document. Point-in-time audit reports get deleted once
their findings ship (the git history keeps them); what lives here is either a
**runbook** (do these steps), a **spec** (code must match this), or a
**decision record** (why things are the way they are).

| Doc | Type | What it's for | Status |
|---|---|---|---|
| [next-app-playbook.md](next-app-playbook.md) | playbook | Every reusable lesson from shipping v1 — PWA architecture, the Airwallex payments sequence, GCP/Firebase infra, the full Bubblewrap/TWA CI recipe, Play Console, process — for the next app on the same company/accounts | Reference |
| [release-sync.md](release-sync.md) | decision/runbook | How one deploy updates web + Google Play + (future) iOS simultaneously; what actually needs a store release; versioning + rollback + the do-not-break invariants | Live |
| [google-play-launch.md](google-play-launch.md) | runbook | Google Play: the `.aab` build flow + Play Console steps (product, service-account, RTDN, assetlinks, Data safety), rollout sequence, and the Teacher Approved / Play Pass strategy | **Active — final Console steps** |
| [apple-enrollment.md](apple-enrollment.md) | runbook | Apple Developer Program *organization* enrollment (D-U-N-S pre-flight, org vs individual, verification call) to start the 1–3 week clock now; plus the deferred iOS-shell/StoreKit build steps | **Active — enrollment (owner)** |
| [native-android-plan.md](native-android-plan.md) | decision/build plan | Replace the Bubblewrap TWA with a native **WebView + native Play Billing (`BillingClient` 8)** shell — removes the `android-browser-helper`/Digital-Goods dependency that blocks PBL 8 and gates purchasing on Chrome version. Web UI stays one codebase; billing transport goes native; push moves to native FCM | **Active — building** |
| [ios-native-plan.md](ios-native-plan.md) | decision/build plan | The iOS WKWebView shell (StoreKit 2 + Sign in with Apple + FCM), its bridge architecture, the fail-closed server verify, and the launch checklist gated on Apple enrollment | **Active — built, awaiting enrollment** |
| [native-qa-checklist.md](native-qa-checklist.md) | runbook | Single-pass device QA for a native shell release (splash/offline/edge-to-edge, app links, shortcut, widget, haptics, + billing/sign-in/push regression). Lists the two deferred native follow-ups (APK web-shell bundling, Play Integrity) | Run per native build |
| [difficulty-curves.md](difficulty-curves.md) | spec | What Easy/Medium/Hard means per topic — the contract `mathGenerator.ts` + its discrimination tests implement | Live spec |
| [i18n.md](i18n.md) | decision/spec | Localization: which languages + wave plan, char budgets, edge cases (decimals, gcd/lcm names, fonts), how to add a locale | Live (12 locales) |
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

Deleted at v1 wrap-up (2026-07-22 — all three were completed pre-launch
runbooks; their reusable lessons are consolidated into
`next-app-playbook.md`, their live config lives in the code +
`CLAUDE.md`): `billing-safety.md` (10-step checklist, all resolved),
`airwallex.md` (payment wiring — done; the integration is live and
documented in `functions/src/airwallex.ts`), `app-check.md` (App Check
registered; enforcement flip when metrics show ~100% verified traffic is
noted in CLAUDE.md).
