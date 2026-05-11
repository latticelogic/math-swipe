# Math Swipe — project context for Claude

This file documents conventions and account ownership for anyone (or any
AI assistant) working in this repo. Update as ownership/setup changes.

## Account ownership

The company is **Lattice Logic** (incorporated, has DUNS). We're migrating
from personal accounts to company-owned accounts. **Anything that runs in
production should be owned by the company account, not Tim's personal.**

### Identity registry

| Surface | Account | Notes |
|---|---|---|
| Google Workspace (company) | `tim@latticelogic.app` | Primary admin. 2FA enabled. Use this for all new company resources. |
| Google personal (legacy) | `njytim@gmail.com` | Owns the *old* shared Firebase project `scribble-math-prod` (also hosts another app — DO NOT deploy math-swipe to it). Kept active for read-only reference; no new resources should be attached. |
| Firebase project (production) | `math-swipe-prod` | Owned by `tim@latticelogic.app`. Org id `138884922843`. Created 2026-05-11. |
| Firebase project (legacy / shared) | `scribble-math-prod` | DO NOT deploy to this. Hosts another company's classroom app with 80+ functions. A naive deploy would delete them all. |
| GitHub | currently personal | TODO: transfer to a Lattice Logic GitHub Organization owned by `tim@latticelogic.app` |
| Cloudflare Pages | currently personal | TODO: migrate to a Cloudflare account under `tim@latticelogic.app` |
| Stripe | not yet created | Sign up under company entity when payments are implemented |
| Apple Developer | not yet enrolled | Must enroll as Lattice Logic with company DUNS, $99/yr. 1-3 week verification window |
| Google Play Console | not yet enrolled | Must enroll as Lattice Logic, $25 one-time |

### Firebase CLI

The CLI has both accounts registered. To switch between them:
```bash
firebase login:list                        # see all logged-in accounts
firebase use math-swipe-prod --account tim@latticelogic.app
firebase deploy --only firestore:rules --account tim@latticelogic.app
```

**Always pass `--account tim@latticelogic.app` for math-swipe deploys** to
avoid accidentally targeting `scribble-math-prod`.

## Deploy chain

| Concern | Tool | Why this one |
|---|---|---|
| Static SPA hosting + global CDN | Cloudflare Pages | Best-in-class CDN, generous free tier, edge Workers for OG meta |
| Edge HTML rewriting (per-profile OG tags at `/u/<slug>`) | Cloudflare Pages Worker (`dist/_worker.js`, source in `edge/`) | <10ms edge compute beats 1-3s Cloud Function cold start |
| Auth + Firestore + Cloud Functions + FCM | Firebase | Anonymous + Google + email-link auth, offline-first sync, FCM is Firebase-native |
| Payments | Stripe (TBD) | Only serious option for web payments |

**Why both Cloudflare and Firebase**: see the architecture section in
`README.md` (TBD) — short version: Cloudflare wins on CDN + edge, Firebase
wins on stateful backend (auth + db + scheduled jobs + push). Trying to do
either with the other tool is more complex than running both.

## Conventions

- Don't push directly to `master`; PRs go through `dev` → `master` (see README)
- Run `npm run verify` before pushing — covers lint + tsc + tests + build + worker
- `.env` is gitignored. `.env.example` documents the schema. Required keys:
  `VITE_FIREBASE_*` (6 keys), optional `VITE_VAPID_PUBLIC_KEY`
- All Firestore writes from the client must respect `firestore.rules`. Adding
  a new collection requires adding a rule block; the CI doesn't catch missing
  rules but the runtime will reject writes silently
