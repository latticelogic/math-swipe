---
description: How to deploy changes to production via PR workflow
---

# Deploy Workflow

> ⚠️ **NEVER push directly to `master`.** All changes go through pull requests.

## Steps

// turbo-all

1. Start from up-to-date `master`:
   ```bash
   git checkout master && git pull --ff-only
   ```

2. Create a feature/fix branch:
   ```bash
   git checkout -b descriptive-name
   ```

3. Make your changes and commit:
   ```bash
   git add -A && git commit -m "feat: description"
   ```

4. Run full verification:
   ```bash
   npm run verify
   ```

5. Push the branch:
   ```bash
   git push -u origin descriptive-name
   ```

6. Open and merge a PR using the GitHub CLI:
   ```bash
   gh pr create --base master --title "feat: description" --body "Summary"
   gh pr merge --squash --delete-branch
   ```

7. Cloudflare Pages auto-deploys once the merge hits `master`.

8. Pull master locally to stay in sync:
   ```bash
   git checkout master && git pull --ff-only
   ```

## Important Rules

- **`master`** is the production branch. Only merge via PR.
- There is **no long-lived `dev` branch** — feature branches target `master` directly.
- Always run `npm run verify` before pushing.
- The pre-push hook will block pushes that fail verification.
