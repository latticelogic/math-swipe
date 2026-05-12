# Edge Worker — Cloudflare Pages

This directory holds the source of the Cloudflare Pages Worker that injects
per-profile OG meta tags for `/u/<slug>` URLs. The build step
(`npm run build:worker`) bundles `worker.ts` into `dist/_worker.js`, which
Cloudflare Pages picks up automatically.

## Why a Worker and not the `functions/` directory

Cloudflare Pages auto-detects edge functions in `<project-root>/functions/`,
but our `functions/` directory is reserved for Firebase Cloud Functions
(see `firebase-functions/`'s sibling). Using single-Worker mode
(`_worker.js`) sidesteps the collision entirely — the Worker handles
ALL routes and falls through to the static asset binding for anything it
doesn't claim.

## Required environment variables (Cloudflare dashboard)

Pages → Settings → Environment variables → Production AND Preview:

```
FIREBASE_PROJECT_ID = math-swipe-prod                       # matches VITE_FIREBASE_PROJECT_ID
PUBLIC_ORIGIN       = https://math-swipe-c7k.pages.dev      # canonical site origin
```

If `FIREBASE_PROJECT_ID` is missing the Worker still serves the SPA but
with generic OG tags. No deploy will fail.

## Required Firestore rule change

`users/{uid}` must allow public read so the unauthenticated edge Worker
can fetch profile stats. The rule is already updated in `firestore.rules`
in the repo root.

Deploy the updated rules with:

```bash
firebase deploy --only firestore:rules
```

## How a profile share looks now

When someone posts `https://math-swipe-c7k.pages.dev/u/EpicNinja75-abc1`
to X / WA / Discord, the platform's crawler hits the URL → the Worker
fetches the profile → returns index.html with:

```
<title>EpicNinja75 on Math Swipe</title>
<meta name="description" content="1,240 XP · 18 streak · 92% accuracy — challenge them!" />
<meta property="og:title" content="EpicNinja75 on Math Swipe" />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://math-swipe-c7k.pages.dev/icon-512.png" />
... (full twitter:* set too)
```

The browser then loads the SPA exactly as it does for a regular cold load.

## Limitations

- OG image is currently the app icon, not a rendered profile card. To
  generate per-profile card images we'd need a font + canvas runtime in
  the Worker — possible (via `satori` + `resvg-js`) but adds ~1 MB to the
  Worker bundle. Deferred until we see real share traffic.
- Cache: edge cache holds for 5 minutes (`s-maxage=300`). A player who
  improves their score sees the new card within 5 min of the next crawl.
- The Worker has a 2-second budget for the Firestore REST call before it
  falls through to default OG. That's intentional — slow Firestore should
  never block page load.
