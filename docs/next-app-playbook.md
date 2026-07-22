# Next-app playbook — lessons from shipping Math Challenge

Written 2026-07-22 after taking Math Challenge from code-complete to a live,
paying web product + a Google Play TWA build. Everything here is meant to be
**reused on the next app under the same company (Lattice Logic Pte. Ltd.) and
the same dev/cloud accounts.** It's the stuff that cost hours to discover.

Read this before starting the next app's launch work. The order of the top
sections roughly mirrors the order you'll want to do things.

---

## 0. TL;DR — the highest-value lessons

1. **Web-first is the real launch.** The PWA on Cloudflare Pages + Firebase +
   Airwallex was live and taking money in a day. Google Play took ~10 CI
   iterations for an *additive* channel. Ship web, earn, then do stores.
2. **Every hosted dashboard has an interactive/validation trap.** Airwallex
   rejects non-ASCII silently; Bubblewrap only prompts on a TTY; Google
   removed self-serve quota caps. Budget time for "the tool fought me."
3. **Reuse the accounts, not the guesses.** Same company → same Firebase org,
   same Cloudflare, same Airwallex entity, same Play dev account, same GCP
   org policies. The *setup* is reusable; several docs/comments from app #1
   had wrong specifics (service-account name, event names) — verify against
   the live account, don't trust prior notes.
4. **CLI-first, but know the genuine web-only steps** (KYC/KYB, card entry,
   signing-key custody, legal attestations, App Check registration). Flag
   those explicitly; automate everything else.

---

## 1. Architecture that worked (reuse wholesale)

**The split:** Cloudflare Pages (static SPA + global CDN + edge Worker for
per-profile OG tags) **+** Firebase (anonymous/Google/email-link auth,
Firestore, Cloud Functions Gen2, FCM) **+** Airwallex (web payments).

- **Why both Cloudflare and Firebase:** Cloudflare wins CDN + edge compute
  (<10ms vs 1–3s Cloud Function cold start for HTML rewriting); Firebase wins
  stateful backend. Doing either with the other tool is more complex.
- **Deploys are CI-driven, never local.** Push to `master` → GitHub Actions
  runs the verify chain then `wrangler pages deploy dist`. To ship = merge to
  master. Keep this.
- **`npm run verify` = eslint + tsc + vitest + vite build + worker bundle.**
  Runs in the pre-push hook. This caught real issues repeatedly. Keep it and
  keep it in the hook.
- **Env vars are inlined at build time** (`VITE_*`), so CI needs all of them
  present as repo secrets or the build breaks. When you add a client env var
  (e.g. `VITE_APPCHECK_SITE_KEY`), you must add it in THREE places: GitHub
  repo secrets, the `deploy.yml` env block, and Cloudflare Pages (prod +
  preview) — plus local `.env`.

**Windows-ARM64 dev-box caveat (this machine):** local `wrangler` does not run
— `workerd` has no win-arm64 binary. Use the Cloudflare REST API via `curl`
for one-off ops, or run wrangler from CI. The normal deploy path doesn't need
local wrangler at all. (Also: `cd` into a path with wrong drive-letter casing,
e.g. `c:` vs `C:`, silently changes the tool's cwd and makes `git push` fail
with "src refspec … does not match" — always use the exact casing.)

**Auth that ages well:** email-link (magic-link) sign-in configured **web-only**
(`url: window.location.origin`, `handleCodeInApp: true`, no
`android`/`ios`/`dynamicLinkDomain`) is immune to the Firebase Dynamic Links
shutdown — the link is a plain HTTPS URL back to the site, and a TWA is just
the site in Chrome, so it works identically in the Android app. A native app
(non-TWA) would have needed migration. Web-first paid off here too.

---

## 2. Payments (Airwallex) — the whole hard-won sequence

We started on Stripe, removed it, and went Airwallex-only for the Singapore
entity. Net: keep card-processing fees instead of the 15–30% app-store rake.
The client stays **source-agnostic** (`source: 'airwallex' | 'apple' |
'google' | 'promo'`) so gate logic never changes per channel — reuse this.

### KYB / activation
- KYB is web-only at `airwallex.com/app/kyb/payment-activation`. First
  submission was **rejected for "website requirements"** — the site must show:
  business identity (name, registration #, address, contact), discoverable
  **Terms/Privacy/Refund** links, a **public pricing/checkout surface** (the
  in-app paywall is invisible to a reviewer — build a real `/pricing` page),
  and governing law matching the registered country. Fix these *before* first
  submission next time: public pricing page + a `<BusinessBlock>` (company +
  UEN + email) under the legal pages + footer row Pricing·Privacy·Terms·Refund.
- Approval carries a **rolling reserve** (ours: 4% held 30 days, rest settles
  2–3 days) — standard new-merchant terms, drops after clean history. Don't be
  surprised that a $3.14 refund can only refund the *settled* portion (~$2.48)
  until the reserve releases.

### API wiring (the confirmations that were wrong in app #1's notes)
- Scoped API key with **Payment Links read/write only** (least privilege),
  scoped to the account. Client ID + key from Developer → API keys.
- Secrets via `firebase functions:secrets:set` — `AIRWALLEX_CLIENT_ID`,
  `AIRWALLEX_API_KEY`, `AIRWALLEX_WEBHOOK_SECRET`, `PUBLIC_ORIGIN`.
- **Webhook event names — VERIFY against the live event catalog, don't guess:**
  - Grant on **`payment_intent.succeeded`** (correct).
  - Revoke on **`refund.settled`**. There is **no `refund.succeeded`** — the
    refund lifecycle is received → accepted → settled. App #1's code guessed
    `refund.succeeded`/`*.processed` and would never have revoked.
- **`x-timestamp` is milliseconds** on current API versions (we're on
  2026-02-27). Anti-replay math that assumes seconds will 400 every real
  delivery. Magnitude-sniff (`ts > 1e12 ? ts/1000 : ts`).
- **Signature:** HMAC-SHA256 over `${x-timestamp}${rawBody}`, hex, in
  `x-signature`. Confirm header names for your account.
- Region host: global account → `api.airwallex.com` (sandbox
  `api-demo.airwallex.com`).

### THE payment-link gotcha (only a real purchase revealed it)
When a customer pays a **hosted Payment Link**, the resulting payment
**intent does NOT inherit the link's `metadata` or `merchant_order_id`** — the
intent's `merchant_order_id` is the link *title*, and there's no metadata. So
resolving your `uid` from the intent fails. Fixes:
- Grant path: the webhook event carries `payment_link_id` → fetch the link via
  the API (needs Payment Links read scope) and read `metadata.uid` off it.
- Refund path: refund objects carry `payment_intent_id` → look that up against
  the `originalTransactionId` you stored at grant time (no extra API scope).

No synthetic test catches this — **do one real purchase before launch** and
re-trigger the event from the dashboard after fixing.

### Dashboard gotcha (cost 20 min)
Airwallex **merchant-info text fields reject non-ASCII** with a useless generic
error ("Sorry, something has gone wrong"). An **em-dash (—)** broke the save
until replaced with "-". Keep all dashboard-entered text ASCII (this likely
applies to dispute responses too). The merchant-info page lives under the
**account-level** Payments → Settings, not the org-level dashboard.

### Airwallex CLI
An official CLI exists (`github.com/airwallex/airwallex-cli`) but is **beta,
macOS/Linux only, payments-ops only** (no key/webhook management). On Windows,
use the REST API via `curl`/node. Keys and webhooks are dashboard-only behind
2FA regardless.

---

## 3. Google Cloud / Firebase infra (org-level, reused across apps)

These are set on the **org / GCP project** and mostly carry over, but the
policies bit you the first time:

- **Domain Restricted Sharing (DRS) org policy** blocks `allUsers` invokers
  and external-service-account IAM grants. A **public webhook / callable** and
  the **Google Play notifications service account** both hit it. Fix: a
  **project-scoped exception** on `iam.allowedPolicyMemberDomains`:
  ```bash
  gcloud services enable orgpolicy.googleapis.com --project=<proj>
  gcloud org-policies set-policy - <<'EOF'
  name: projects/<proj>/policies/iam.allowedPolicyMemberDomains
  spec: { inheritFromParent: false, rules: [ { allowAll: true } ] }
  EOF
  ```
  Setting an org policy needs **`roles/orgpolicy.policyAdmin` at the ORG
  level** — project Owner is not enough. The org admin (Tim) can self-grant it:
  `gcloud organizations add-iam-policy-binding <orgId> --member=user:… --role=roles/orgpolicy.policyAdmin`.
  Once the exception exists, `firebase deploy` grants the public invoker
  automatically — no manual `allUsers` binding needed.
- **Gen2 Cloud Functions run as the COMPUTE SA** (`<projNum>-compute@developer.gserviceaccount.com`),
  **not** the App Engine `<proj>@appspot.gserviceaccount.com`. Anything that
  grants your functions external API access (e.g. the Play Android Publisher
  API) must target the compute SA. Confirm with
  `gcloud run services describe <fn> --region=… --format='value(spec.template.spec.serviceAccountName)'`.
  `GoogleAuth`/ADC in the function resolves to whatever it runs as.
- **Quota caps are gone.** Google **removed self-serve daily read/write caps** —
  `gcloud alpha services quota update` returns
  `COMMON_QUOTA_CONSUMER_OVERRIDE_FOR_FIXED_LIMIT`, and Cloud Functions has no
  invocations quota. The real runaway-cost bounds are: **`maxInstances` on
  every function (1–10)**, a **budget alert**, and **App Check**. Don't chase
  the old quota commands.
- **Budget alert** via `gcloud billing budgets` (we used SGD 10/mo with
  50/90/100% thresholds — tighter than needed at launch, deliberately).
  Second/backup card on Cloud Billing is web-only (PCI).
- **App Check = reCAPTCHA *Enterprise*, not classic v3.** Google's reCAPTCHA
  console no longer issues classic v3 site/secret pairs — new keys are
  project-based Enterprise keys. Client must use `ReCaptchaEnterpriseProvider`
  (not `ReCaptchaV3Provider`). Register in Firebase → App Check → Apps →
  reCAPTCHA **Enterprise** (the plain "reCAPTCHA" form wants a classic secret
  key you won't have). **Enforcement stays OFF** until the App Check metrics
  page shows ~100% verified traffic — flipping early locks out users on cached
  builds. Site key is public (safe in the client bundle).
- **Two Firebase projects, one is a landmine:** the legacy shared project hosts
  another company's app with 80+ functions — a naive `firebase deploy` there
  deletes them all. **Always pass `--account tim@latticelogic.app` and the
  right `--project`.** For the next app, ideally its own project.

---

## 4. Android TWA + Bubblewrap in CI — the long one (read before touching it)

This took ~10 CI iterations. The build shipped in app #1 (#74) but was
**never actually run green**, so every latent issue surfaced at once. Here's
the working recipe and every trap, so the next app is a copy-paste.

### The keystore (bootstrap once, custody is human)
- The CI workflow has **two modes** keyed on whether `ANDROID_KEYSTORE_B64`
  secret exists: **bootstrap** (first run, no secret) generates the upload
  keystore + random password, uploads them as an artifact, prints the
  upload-key SHA-256; **build** mode (secrets present) decodes and builds.
- After bootstrap: download the artifact, set 3 repo secrets
  (`ANDROID_KEYSTORE_B64` = `base64 -w0 android.keystore`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` = same), **and save the
  keystore + password to the company password manager** — repo secrets can't
  be read back, so the vault is the only recovery copy. (Upload key is
  resettable via Play Console if lost — recoverable but slow.) Pipe values
  straight into `gh secret set` so they never print:
  `base64 -w0 android.keystore | gh secret set ANDROID_KEYSTORE_B64 …`.

### Bubblewrap is interactive-only — this is the crux
Every `bubblewrap` command opens interactive prompts (install JDK? install
SDK? accept terms?). CI has no TTY. What failed and why:
- **Piping `yes`**: floods 100k+ log lines (GitHub truncates the log) AND
  wrongly answers a **`bubblewrap build`-only "regenerate project? (no
  checksum)" prompt** with Yes → infinite loop.
- **Bounded `printf 'y\n'…`**: EOFs during the **slow JDK/SDK download** →
  next prompt gets EOF → exit 130.
- **"Use your own JDK" (answer No)**: opens a **"Path to your existing JDK 17"**
  prompt; `expect`'s `exp_continue` re-fires the prior match and types stray
  "n" into the path → `jdkPath "n" does not exist` → hangs until the job
  timeout (looked like a 45-min mystery; it was a per-attempt `expect` timeout
  ×3).

**The working answer: drive it with `expect` (real pseudo-TTY), let Bubblewrap
manage its own JDK+SDK, match only the prompt suffix, retry for flakes.**
```yaml
- name: Build .aab + .apk with Bubblewrap
  env:
    BUBBLEWRAP_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    BUBBLEWRAP_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
  run: |
    sudo apt-get update -qq && sudo apt-get install -y -qq expect
    npm install -g @bubblewrap/cli
    run_update() {
      expect <<'EXP'
    set timeout 600
    spawn bubblewrap update
    expect {
      -re {\(Y/n\)|\(y/N\)} { send -- "y\r"; exp_continue }
      timeout { puts "\n[expect] timed out"; exit 1 }
      eof
    }
    catch wait result
    exit [lindex $result 3]
    EXP
    }
    for a in 1 2 3; do run_update && break; [ "$a" = 3 ] && exit 1; sleep 20; done
    # Gradle refuses to run with two SDK env vars pointing at different SDKs.
    unset ANDROID_SDK_ROOT
    # Accept licenses + install the components the project targets in bubblewrap's SDK.
    BW_SDK="$HOME/.bubblewrap/android_sdk"
    SDKMGR="$(find "$BW_SDK" -name sdkmanager -type f | head -1)"
    yes | "$SDKMGR" --sdk_root="$BW_SDK" --licenses >/dev/null 2>&1 || true
    "$SDKMGR" --sdk_root="$BW_SDK" "platform-tools" "build-tools;35.0.0" "platforms;android-36" >/dev/null 2>&1 || true
    bubblewrap build --skipPwaValidation < /dev/null
```
Key points:
- **Match `(Y/n)`/`(y/N)` and always send "y"** — every setup prompt wants
  yes. Don't match on question text (re-fires); the suffix advances cleanly.
- **Run `update` before `build`** so the manifest checksum exists — this kills
  the "regenerate project?" prompt that `build` alone asks.
- **`unset ANDROID_SDK_ROOT`**: Bubblewrap installs its own SDK at
  `$ANDROID_HOME`; the runner still exports `ANDROID_SDK_ROOT=/usr/local/lib/android/sdk`;
  Gradle errors "Several environment variables contain different paths to the
  SDK." Drop the runner's one.
- **Pre-accept licenses + install `build-tools;35` / `platforms;android-36`**
  in bubblewrap's SDK — it installs an older set, and the project targets newer.
- **Retry `update`** — the ~180MB JDK/SDK mirror download flakes occasionally.

### Manifest / Gradle
- **`minSdkVersion` must be ≥ 23** — `androidbrowserhelper` (the TWA support
  lib) declares minSdk 23, so `minSdkVersion 21` fails the manifest merge. Set
  it in `twa-manifest.json` (Bubblewrap regenerates the gradle project from
  there — there's no committed `build.gradle` to edit).
- Signing is non-interactive via the `BUBBLEWRAP_*_PASSWORD` env vars; don't
  prompt for it.

### The two SHA-256s you'll need for assetlinks
- **Upload-key SHA-256**: printed in the bootstrap run summary (also
  `keytool -list -v -keystore …`).
- **App-signing SHA-256**: from Play Console → Test and release → Setup → App
  integrity, *after* the first bundle upload (Play re-signs with its own key).
- `public/.well-known/assetlinks.json` needs **both** to kill the TWA URL bar.
  Verify with Google's checker:
  `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<domain>&relation=delegate_permission/common.handle_all_urls`.

### Consider for next time
The whole self-managed-toolchain dance (~180MB download per run, flaky, slow)
could be replaced by pre-installing a pinned Android SDK + accepting licenses
in a setup step and pointing Bubblewrap at it via config — but Bubblewrap
rejects a hand-written `~/.bubblewrap/config.json` and re-prompts, so it's
non-trivial. The `expect` recipe above is proven; start there.

---

## 5. Google Play Console (dev account carries over)

- **Org (company) dev account skips the 20-tester gate** that personal
  accounts have. Already enrolled + verified for Lattice Logic — reuse it.
- **Creating the app**: name · **App (not Game)** · Free with in-app purchases.
  For a kids'/education app, **App (not Game)** + target audience **9–12 and
  13+ (NOT 5–8)** keeps you out of early-reader grading you'd fail (text-dense
  lessons) while still triggering Families review + Teacher Approved
  eligibility. Package set at create (`app.<name>.twa`).
- **The in-app product page is gated behind a Google Payments merchant
  account** (business/bank KYC, web-only, separate from the dev account). Set
  this up early — it also gates the RTDN console link-up. Product id must match
  your client's SKU constant exactly (`pro_lifetime`), one-time, price set.
  *Note:* "Google Merchant Center" is a **different** product (retail shopping
  listings) — you don't need it; the Payments **profile** is the right thing.
- **Enroll in the 15% service-fee tier** — a notification in the bell menu; a
  short form that halves Google's cut on the first $1M. Do it.
- **Service account for purchase verification**: invite the **Gen2 compute
  SA** (§3), scoped to the app, with **View app information + View financial
  data + Manage orders and subscriptions**. Service accounts need **no email
  acceptance** — access is live on invite (no inbox to check).
- **RTDN**: create the Pub/Sub topic + grant
  `google-play-developer-notifications@system.gserviceaccount.com` publisher
  (needs the DRS exception from §3), then paste the topic into Monetize →
  Monetization setup → RTDN. The functions (`verifyPlayPurchase`, `playRtdn`)
  must be deployed.
- **Store listing**: feature graphic is **1024×500 and required** — compose it
  from the live app's own fonts/palette via a headless browser capture
  (screenshot a styled div at the exact viewport, normalize with
  System.Drawing to exact px). App icon 512×512 = reuse `public/icon-512.png`.
  Screenshots 320–3840px per side (≥1080px short side helps *featuring*
  eligibility, not required). Full description should **name the pedagogy
  explicitly** — the Teacher Approved panel reads it.
- Play Billing in the TWA uses the Digital Goods API + PaymentRequest; Google
  policy (and doubly the Families program) **forbids external payment flows in
  the Android app**, so the Airwallex path must never render there. The client
  channel-routes: web → Airwallex, TWA → Play Billing. Entitlement stays
  source-agnostic.

---

## 6. Process & working-style lessons

- **One fix per PR, squash-merge, delete the branch.** We enabled
  `delete_branch_on_merge` on the repo — do this on the next repo day one so
  branches self-clean. Without it, ~25 branches piled up.
- **GitHub emails a "run failed" notice per failed Actions run** to the actor.
  A flaky/iterating CI job spams the inbox. Either get it green fast or mute
  Actions failure notifications in GitHub settings.
- **Browser automation for dashboards**: a persistent Chrome profile signed
  into the company Google/Airwallex/Play accounts lets an agent drive console
  clickwork (create keys, register webhooks, fill forms). Caveats: sessions
  expire (Airwallex is short-lived — it logged out repeatedly), some forms
  reject synthetic events (do the final Save/submit by hand), and **2FA + the
  final money/grant/legal click must be human**.
- **Automation boundaries that held (respect these):** the classifier blocks
  an agent from writing signing keys as secrets, moving money, granting IAM to
  itself, checking legal-attestation boxes, and bulk-deleting remote branches.
  These are the right lines. Hand those to the owner with exact steps rather
  than working around them.
- **Genuinely web-only / human-only steps** to plan for up front: KYB/KYC,
  card entry, Google Payments merchant profile, signing-key custody, App Check
  registration, content-declaration + export-compliance + policy attestations,
  adding beta testers, the one real purchase test.
- **Verify live state before trusting prior docs.** App #1's CLAUDE.md and
  code comments had several confidently-wrong specifics (service-account name,
  refund event names, quota commands, App Check provider). The accounts carry
  over; the exact API details drift — check the live dashboard/CLI each time.

---

## 7. Reusable launch checklist for app #2

**Web (do first — this is the launch):**
- [ ] New Firebase project (Blaze), Cloudflare Pages project, GitHub repo w/
      `delete_branch_on_merge` on
- [ ] `npm run verify` in pre-push hook; CI deploy on merge-to-master
- [ ] All `VITE_*` env vars in repo secrets + deploy.yml + Cloudflare (prod &
      preview) + local `.env`
- [ ] Legal pages LIVE (Privacy/Terms/Refund/Pricing) + BusinessBlock + footer
      row **before** payment KYB
- [ ] Airwallex: KYB (with the pricing page up), scoped key, webhook
      (`payment_intent.succeeded` + `refund.settled`, ms timestamps), secrets,
      deploy w/ DRS exception, **one real purchase + refund test**
- [ ] Billing safety: `maxInstances` on all functions, budget alert, backup
      card, support inbox, App Check registered (enforce later), beta

**Google Play (additive, after web is earning):**
- [ ] Bootstrap keystore → 3 secrets → **vault the keystore**
- [ ] `expect`-driven Bubblewrap CI (copy §4 recipe), `minSdkVersion` ≥ 23
- [ ] Create app (App-not-Game, Free w/ IAP, target 9–12 & 13+)
- [ ] Google Payments merchant profile (gates products + RTDN) + 15% fee tier
- [ ] Compute-SA invite (view info + financial + orders), RTDN topic/IAM
- [ ] Upload `.aab` → app-signing SHA → assetlinks (both SHAs) → verify no URL
      bar → license-tester purchase → Console refund → RTDN revoke
- [ ] Store listing (1024×500 feature graphic from live app, pedagogy in copy)

**Apple: deferred/last by standing rule** (enroll as Lattice Logic w/ DUNS,
$99/yr, 1–3 week verification; external-link entitlement to route purchases
back to Airwallex and bypass the 15–30% rake, after 60+ days of clean web
revenue data).

---

*Keep this doc updated as app #2 teaches you new things. The goal is that
app #3 is a checklist, not an investigation.*
