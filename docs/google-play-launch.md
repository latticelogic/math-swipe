# Google Play launch — runbook + strategy

Status (2026-07-22): **signed `.aab` builds green** and much of the Console is
done. Complete: app created (`app.mathchallenge.twa`, App-not-Game, Free w/
IAP), verification service account invited (the Gen2 **compute** SA — see
§A2.5), Google Payments merchant account + 15% service-fee tier, listing
assets (`store-assets/` — feature graphic + copy + screenshots). Remaining:
upload the `.aab` to the internal track, create the `pro_lifetime` product,
grab the app-signing SHA-256 → wire `assetlinks.json`, content declarations +
Data safety, RTDN console link-up, internal-track QA. Strategy (Teacher
Approved / Play Pass) is Part B. The full CI build recipe (it took ~10
iterations) is in `next-app-playbook.md` §4. Play dev account: enrolled as
Lattice Logic (org), verified — the 20-tester personal gate doesn't apply.

Architecture recap (three channels, one product):

| Channel | Wrapper | Payment | Entitlement `source` |
|---|---|---|---|
| Web (live) | — | Airwallex hosted checkout | `airwallex` |
| Google Play | TWA (`app.mathchallenge.twa`) | Play Billing via Digital Goods API | `google` |
| Apple (last) | TBD (likely same PWA in a wrapper) | External-link or IAP — decide later | `apple` |

The client never cares which source paid. Purchases restore across
channels through sign-in (`reconcileAccount`) and, on Android, through
boot-time `restorePlayPurchases()`.

---

## Part A — Ship it (operational runbook)

### A1. Build the `.aab` (CI, ~10 min)

1. GitHub → Actions → **android-build** → Run workflow (no inputs).
   First run has no keystore secret → **bootstrap mode**: generates the
   upload keystore, uploads it as the `upload-keystore` artifact, prints
   instructions + the upload-key SHA-256 in the run summary.
2. Download the artifact; store keystore + password in the company password
   manager. Set repo secrets `ANDROID_KEYSTORE_B64`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`. **Delete the
   artifact.**
3. Re-run the workflow → **build mode** → download
   `math-challenge-android` artifact: `app-release-bundle.aab` (Play upload)
   + `app-release-signed.apk` (sideload testing).
4. Version bumps for later releases: run with `versionCode` input
   (must strictly increase; `versionName` free-form).

### A2. Play Console app setup (~1 hour of clickwork)

1. **Create app**: Math Challenge · App (not game — see Part B, listing
   category is still Education/Games via tags) · Free with in-app purchases.
2. **Play App Signing**: accept (default). After first upload, copy the
   **App signing key certificate** SHA-256 from *Test and release → Setup →
   App integrity*.
3. **assetlinks.json** (kills the URL bar in the TWA): edit
   `public/.well-known/assetlinks.json`, replace the two placeholders with
   ① the App-signing SHA-256 (step 2) and ② the upload-key SHA-256 (CI
   summary). Merge → auto-deploys. Verify:
   `https://mathchallenge.app/.well-known/assetlinks.json` and
   Google's checker:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://mathchallenge.app&relation=delegate_permission/common.handle_all_urls`
4. **In-app product**: *Monetize → Products → One-time products → Create*:
   id `pro_lifetime` (must match `PLAY_SKU` in `src/utils/checkout.ts`),
   one-time, **$3.14 USD**, name "Lifetime unlock". Activate.
   ⚠️ **Gated:** this page requires a **Google Payments merchant account**
   ("Set up a merchant account" — business + bank KYC). Do that first;
   until then the product page is locked.
5. **Service account for verification**: *Users and permissions → Invite
   user* → **`122552558583-compute@developer.gserviceaccount.com`** → grant
   **View app information**, **View financial data**, **Manage orders and
   subscriptions** — scoped to this app. [Done 2026-07-22.]
   ⚠️ Use the **Gen2 compute SA above**, NOT `…@appspot.gserviceaccount.com`.
   These functions are Gen2 (Cloud Run) and run as the compute SA — confirmed
   via `gcloud run services describe verifyplaypurchase --region=us-central1`.
   `GoogleAuth`/ADC in `playBilling.ts` resolves to the runtime SA, so the
   appspot account would fail closed. No email acceptance for service accounts
   — access is live on invite.
6. **RTDN (refund revocation)** — topic + publisher IAM DONE 2026-07-22:
   ```bash
   gcloud pubsub topics create play-rtdn --project math-swipe-prod
   gcloud pubsub topics add-iam-policy-binding play-rtdn --project math-swipe-prod \
     --member serviceAccount:google-play-developer-notifications@system.gserviceaccount.com \
     --role roles/pubsub.publisher
   ```
   Then *Monetize → Monetization setup → Real-time developer notifications* →
   topic `projects/math-swipe-prod/topics/play-rtdn`. (This console step is
   also gated on the merchant account.) Functions already deployed
   (`verifyPlayPurchase`, `playRtdn` live as of 2026-07-22).
7. **App content declarations** (*Policy → App content*): privacy policy
   `https://mathchallenge.app/privacy` · ads: **No** · **Target audience:
   9-12 and 13+** (see Part B rationale — do NOT tick 5-8) · Families
   Policy self-certification · Data safety form (below) · content rating
   questionnaire (IARC — educational, no violence/UGC-chat → likely
   Everyone).
8. **Data safety form** — answers matching what the code actually does:
   - Collected: **App activity** (gameplay stats/XP — app functionality,
     not shared) · **App info and performance** (Cloudflare Insights is
     cookieless RUM; declare as diagnostics) · **Device or other IDs**
     (Firebase installation id / anonymous auth uid — app functionality).
   - Optional **Personal info: email** ONLY if the user signs in (account
     management). Mark sign-in as optional.
   - Not collected: location, contacts, financial details (payments are
     processed by Google Play / Airwallex — not collected by us), photos,
     mic. No data sold; no third-party ad SDKs.
   - Data deletion: point at the in-app reset + support email from the
     privacy policy.
9. **Store listing**: assets from `store-assets/` (see repo) + copy draft
   in A4. Contact email: the support address on the privacy policy.

### A3. Rollout sequence

1. **Internal testing** track: upload the `.aab`, add
   tim@latticelogic.app (+ testers). Install on a real device; verify:
   no URL bar (assetlinks OK), portrait lock, offline behavior (airplane
   mode after first load), the paywall shows **Play Billing** (not
   Airwallex) — buy with a [license-tester](https://play.google.com/console
   → Settings → License testing) account so it's free — entitlement lands
   (`source:'google'` in `entitlements/{uid}`), refund from Console →
   RTDN revokes within minutes.
2. **Closed testing** (the beta group) 1-2 weeks.
3. **Production** with staged rollout (20% → 100%).

### A4. Store listing copy (draft — matches the web tone bar)

- **Short description** (80 chars):
  `Mental math that feels like play. Swipe to answer. Learn the tricks behind it.`
- **Full description opener**: lead with the Magic Tricks pedagogy ("every
  trick explains *why* it works"), the no-ads fact, the one-time unlock
  (no subscription), and the Daily Challenge being free forever. Avoid
  hype-copy — the Teacher Approved reviewers read this too.

---

## Part B — Strategy study: Teacher Approved & Play Pass

### B1. Teacher Approved (google-app.md §3) — corrections + improvements

The source doc is right on the mechanics (no direct application; routed
automatically to external teacher review when you declare an under-13
target audience). Corrections and the plan:

1. **Its age premise is stale.** It cites "Ages 5-7, as seen in your UI" —
   the K-2 `starter` band was removed 2026-07-15; the content is 8-14.
   **Declare 9-12 + 13+, not 5-8.** This still triggers Families review +
   Teacher Approved eligibility (any under-13 group does) but is honest to
   the content and avoids being graded against early-reader expectations
   (larger touch targets, pre-reader UI, no text-dense lessons) that we'd
   fail — Magic Tricks lessons are text-forward by design.
2. **What the panel scores** (design quality, age-appropriateness,
   *structural learning value*, no manipulative monetization). Our assets:
   hand-drawn chalk aesthetic (differentiated, not template), tricks that
   teach *why* (the doc's criterion #3 verbatim), zero ads, restrained
   copy bar. Our risks, in order:
   - **Purchase pressure on children.** The trial-expiry paywall is shown
     in-app to whoever is playing, price included. It's already
     restrained (leads with the child's own numbers, "Maybe later"
     respected, Daily free forever) — but consider a "have a grown-up
     help" line on the Android paywall. Play handles parental purchase
     approval for child accounts, which covers the transaction itself.
   - **UGC surface**: leaderboard display names. Sanitized (client +
     Firestore rules) but not human-moderated. If review flags it, the
     fallback is curated names (adjective+animal generator only) for the
     Families build — a small flag, not a redesign.
   - **External links**: legal pages only — permitted (legal/privacy links
     are exempt from parental-gate rules).
3. **Sequencing**: don't block launch on the badge. It arrives (or
   doesn't) weeks-to-months after production release. Launch → collect
   ratings → the badge is a compounding bonus, not a gate.
4. **Listing leverage the doc misses**: the teacher panel reads the store
   listing. The full description should name the pedagogy explicitly
   (mental-math strategies, why-first lessons, adaptive difficulty, no
   ads, no attention-trap mechanics). That copy is written for two
   audiences: parents and the review panel.

### B2. Play Pass (google-app.md §4) — corrections + improvements

1. **Integration is already done.** The doc treats "integrate Play Billing
   so Play Pass users get everything unlocked" as the work item. #74's
   boot-time `restorePlayPurchases()` handles it: Play Pass surfaces the
   product as owned → `listPurchases()` → server verify → `source:'google'`
   grant. Zero additional code when (if) we're admitted.
2. **Economics sanity-check** the doc skips: Play Pass pays by engagement
   share; our downside is capped at $3.14/converted-user of cannibalized
   revenue, while a kids' math game with daily-streak retention is exactly
   the high-engagement/family-value profile the catalog wants. Clear
   positive expected value — **apply once eligible**, but it's invitation-
   curated, so treat as opportunistic.
3. **Sequencing correction**: the EOI form wants live metrics (ratings,
   engagement). Order: production launch → 60+ days of clean data +
   (ideally) Teacher Approved badge → submit the interest form. Aligns
   with the existing hybrid-distribution rule (native after 60 days of
   web revenue data).
4. **One real risk**: Play Pass requires ALL premium content unlocked for
   subscribers — including future Pro additions. Fine under the settled
   $3.14-lifetime model; would only conflict if a separate paid tier were
   ever added (which the monetization model already forbids).

### B3. What was NOT built (deliberately)

- **No Apple work** — per instruction, last.
- **No parental gate** — not required for our surfaces today (no ads, no
  external non-legal links, purchases go through Play's own approval).
  Revisit only if the Families review asks.
- **No Play Console API automation** — the Console steps are one-time
  clickwork; scripting them costs more than it saves.

---

## Quality gates before hitting "Publish"

- [ ] assetlinks fingerprints real (both entries) + Google checker passes
- [ ] Internal-track install shows NO url bar
- [ ] License-tester purchase → `source:'google'` grant → Console refund →
      RTDN revoke observed in `entitlements/{uid}`
- [ ] Airwallex path untouched on web (buy button still routes to hosted page)
- [ ] Maskable icon safe-zone checked at maskable.app (icon-512 is reused;
      if cropping clips the glyph, export a padded variant)
- [ ] Data safety form answers match the privacy policy wording
- [ ] Store listing copy passes the content tone bar (warm, restrained,
      specific)
