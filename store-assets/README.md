# Play Store listing assets

Captured 2026-07-16 from production (`mathchallenge.app`) at 412×915 (Pixel-class
viewport, device scale) via Playwright — real app state, not mockups.

| File | Surface |
|---|---|
| `store-01-game.png` | Play screen — 8×9 problem, swipe options, rail, teacher |
| `store-02-magic.png` | Magic Tricks library |
| `store-03-league.png` | League leaderboard |
| `store-04-me.png` | Me tab — rank, stats, achievements |

Play Console requirements: 2–8 phone screenshots, each side 320–3840px — these
qualify. For *featuring* eligibility Google prefers ≥1080px on the short side;
to retake at higher res, repeat the capture with a 1080×2340 viewport (the
capture steps are in the git history of this file / docs/google-play-launch.md).

Still needed at Console time:
- **Feature graphic** 1024×500 (required for listing) — compose from the
  chalkboard aesthetic; keep text minimal (title + one line).
- **App icon** 512×512 — `public/icon-512.png` already qualifies (upload as-is).
