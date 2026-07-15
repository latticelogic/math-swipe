# Per-profile OG card image — spike / follow-up

**Status:** deferred (not shipped). The `/u/<slug>` edge Worker currently
injects rich per-profile OG **text** (title/description with rank + mastery +
stats — see `edge/worker.ts` `buildProfileMeta`) but `og:image` is still the
app icon (`icon-512.png`).

## Why the image is deferred

The audit flagged that profile links unfurl with a generic icon instead of the
handsome 1080×1920 chalkboard stat card the app already renders on share. Making
the *image* real is genuinely harder than it looks and was not safe to one-shot:

- **SVG is a trap.** The Worker could emit an SVG `og:image` cheaply, but most
  social crawlers (X, Facebook, iMessage, Slack) do **not** render SVG OG
  images — the unfurl would show a broken image, strictly worse than the clean
  icon we ship today. So we deliberately keep the icon rather than ship SVG.
- **Edge raster rendering is a real dependency.** Producing PNG at the edge
  needs a satori-style layout engine + a WASM rasteriser (`resvg-wasm`) plus an
  embedded font. That has to be bundled into `dist/_worker.js` (built by esbuild
  with `--platform=neutral`) and fit Cloudflare's Worker CPU/size limits — and
  it **can't be tested locally** on this machine (win-arm64 has no `workerd`, so
  `wrangler dev` can't run). Shipping an untested raster renderer to a live
  route (`/u/` currently works) is the kind of risk we don't take blind.

## Two viable approaches (pick at implementation time)

### A. Client-uploads-card → Storage (recommended)
The client **already** renders the exact card PNG via `html-to-image` in
`SessionSummary`. On share (or on profile view of your own page), upload that
PNG to Firebase Storage at a deterministic public path, e.g. `og/<uid>.png`,
and stamp `ogImageUpdatedAt` on `users/<uid>`. The Worker points `og:image`
at the Storage URL when that field is set, else falls back to the icon.
- Pros: reuses the existing, already-good card renderer; no edge raster runtime;
  fully testable; correct fonts.
- Cons: new infra (Storage bucket + rules), an upload path, ~1 stale-until-first-
  share window per user. Card is portrait (1080×1920) — fine, but a dedicated
  1200×630 landscape variant unfurls better; render a second size on upload.
- Rules sketch: `match /og/{uid}.png { allow read: if true; allow write: if
  request.auth != null && request.auth.uid == uid && request.resource.size <
  2 * 1024 * 1024 && request.resource.contentType == 'image/png'; }`

### B. Edge raster (satori + resvg-wasm)
Render the card in the Worker on demand at `/og/u/<slug>.png`, cache hard at the
edge. Point `og:image` there.
- Pros: no client dependency; always fresh; no Storage.
- Cons: the bundle/CPU/testing risks above; must embed the two chalk fonts;
  needs a non-arm64 box or CI to validate before first prod deploy.

## Acceptance checks (either approach)
- Validate with the X Card Validator, Facebook Sharing Debugger, and an iMessage
  send — all three must show the card, not the icon.
- `/u/<slug>` HTML route latency stays well under the current budget.
- Missing/errored image falls back to `icon-512.png`, never a broken unfurl.
