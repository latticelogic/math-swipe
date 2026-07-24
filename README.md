# Math Challenge

> ⚠️ **This repository has moved.** Development continues in the Lattice Logic
> monorepo: **[latticelogic/lattice](https://github.com/latticelogic/lattice)**
> → `apps/math-swipe/` (full history preserved). This repo is **archived**
> (read-only) as of 2026-07-24; production deploys from the monorepo. Do not
> open PRs here.

A fast-paced mental math game with a chalkboard aesthetic. Built with React, TypeScript, Vite, and Firebase.

## Quick Start

```bash
npm install
npm run dev        # Start dev server
npm run verify     # Lint + typecheck + test + build
```

## Git Workflow

> **Never push directly to `master`.** All changes go through PRs.

```
master (production — auto-deploys to Cloudflare Pages on every push)
  └── short-lived feature/fix/chore branches
```

### Steps

1. **Branch** from `master`: `git checkout -b descriptive-name`
2. **Develop** — commit early and often
3. **Verify**: `npm run verify` (eslint + tsc + vitest + vite build + edge worker)
4. **Push** the branch: `git push -u origin descriptive-name`
5. **Open PR** → `master` on GitHub via `gh pr create --base master`
6. **Merge PR** — squash recommended, keeps the master log one-commit-per-feature

There is no long-lived `dev` integration branch — every PR targets
`master` directly. The Cloudflare Pages workflow at
`.github/workflows/deploy.yml` builds preview deploys for every PR
branch and production for `master`.

### Pre-push Hook

The `prepare` script installs a git hook that runs `npm run verify` before every push. If it fails, the push is blocked.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Backend | Firebase Auth + Firestore |
| Deploy | Cloudflare Pages (auto-deploy on `master`) |
| Tests | Vitest |

## Project Structure

```
src/
├── App.tsx                  # Main app component
├── components/              # UI components
├── hooks/                   # Custom React hooks
│   ├── useGameLoop.ts       # Core game logic
│   ├── useStats.ts          # Stats persistence
│   ├── useSessionUI.ts      # Auto-summary + PB detection
│   └── ...
├── utils/                   # Pure utilities
│   ├── mathGenerator.ts     # Question generation
│   ├── achievements.ts      # Badge system
│   └── ...
└── tests/                   # Vitest tests
```

## Version

The current version lives in `package.json`. The version string is sourced from
`package.json` and surfaced in-app at the bottom of the Me tab —
that's the authoritative reference if this README drifts.
