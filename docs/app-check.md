# App Check setup

App Check attests that traffic hitting Firestore / Cloud Functions comes from
**the genuine Math Challenge web app**, not a script wielding the public web keys.
It is the primary control behind the leaderboard-integrity and write-spam gaps:
Security Rules bound *what* a request may do, App Check bounds *who* may send
one. The client wiring already lands in `src/utils/firebase.ts` (env-gated —
inert until a site key is set), so the remaining work is provisioning + turning
on enforcement.

> **CLI note:** App Check provisioning and enforcement toggles are **console-only**
> (no gcloud/firebase-CLI path today). These are the genuinely web-only steps;
> everything after is code + env.

## Already wired in code (nothing to do here)

The surrounding scaffolding is in place and **auto-activates the moment
`VITE_APPCHECK_SITE_KEY` is set** — no code changes needed at enable time:

- `getFirebase()` initialises App Check with reCAPTCHA v3 (env-gated).
- **CSP** in `public/_headers` and the edge worker already allow the reCAPTCHA
  script/frame (`www.google.com/recaptcha/`, `www.gstatic.com/recaptcha/`).
- The floating reCAPTCHA **badge is hidden** (`index.css`) and the required
  **attribution** renders in the Me-tab footer (`<RecaptchaNotice>`) — both only
  when the key is set.
- The **privacy policy** auto-adds a reCAPTCHA/abuse-prevention disclosure when
  the key is set.

So the whole remaining job is: provision the key, set the env var, deploy,
watch metrics, enforce.

## 1. Register the web app with reCAPTCHA (console)

> **Reality update 2026-07-22:** Google's reCAPTCHA console no longer
> issues classic v3 site/secret pairs — new keys are **project-based
> (Enterprise)** keys attached to the GCP project. A score-based key
> (label `math-challenge`, domain `mathchallenge.app`) was created on
> `math-swipe-prod`, and the client uses `ReCaptchaEnterpriseProvider`
> (`src/utils/firebase.ts`). Free tier: 10K assessments/month; with token
> auto-refresh, assessment volume roughly tracks play sessions.

DONE 2026-07-22: registered in Firebase console → App Check → Apps →
web app → **reCAPTCHA Enterprise** provider, site key
`6Lec5F4tAAAAAKFuSA0p0DUzfcITdD-Q8q10S6uF`, token TTL 1 hour (the
default; editable on the registration if assessment volume ever gets
close to the free tier — longer TTL = fewer assessments, slightly
staler attestation). The plain "reCAPTCHA" provider form wants a classic
secret key and is NOT what this key type uses.

## 2. Set the site key

- **Local:** add `VITE_APPCHECK_SITE_KEY=<site-key>` to `.env`.
- **CI / Cloudflare Pages:** add `VITE_APPCHECK_SITE_KEY` as a build env var
  (both production + preview configs), same place as the other `VITE_*` keys.
  Vite inlines it at build time.

With the key present, `getFirebase()` initializes App Check automatically.

## 3. Local dev — debug token

localhost isn't a reCAPTCHA domain, so in `import.meta.env.DEV` the client sets
`FIREBASE_APPCHECK_DEBUG_TOKEN = true`. On first load the console prints a debug
token; register it under **App Check → Apps → your app → Manage debug tokens**.
That token then satisfies App Check from your dev machine.

## 4. Turn on enforcement (console) — do this LAST

App Check → **APIs** (or **Products**), per service:

1. Watch the **request metrics** first — Firebase shows what % of live traffic
   is already sending valid App Check tokens. **Do not enforce until verified
   traffic is ~100%**, or you'll lock out real users on the old build.
2. Enforce **Cloud Firestore**, then **Cloud Functions**, one at a time.

Order matters: ship the client with the key (steps 1–2), let existing users
update and start sending tokens, *then* enforce. Enforcing before rollout hard-
fails every in-flight session.

## Rollback

Un-enforce in the console (takes effect in ~minutes). The client stays valid
either way — App Check just stops being required.
