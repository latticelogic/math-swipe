---
description: How to deploy changes to production via PR workflow
---

# Deploy Workflow

> ⚠️ **NEVER push directly to `master`.** All changes go through pull requests.

## Steps

// turbo-all

1. Make sure you're on the `dev` branch or a feature branch:
   ```bash
   git checkout dev
   ```

2. Create a feature/fix branch:
   ```bash
   git checkout -b fix/description-of-change
   ```

3. Make your changes and commit:
   ```bash
   git add -A && git commit -m "fix: description"
   ```

4. Run full verification:
   ```bash
   npm run verify
   ```

5. Push the branch:
   ```bash
   git push -u origin fix/description-of-change
   ```

6. Open and merge a PR using the GitHub CLI:
   ```bash
   gh pr create --base master --title "fix: description" --body "Summary of changes"
   gh pr merge --squash --delete-branch
   ```

7. Cloudflare Pages will auto-deploy once the merge hits `master`.

8. Pull master locally to stay in sync:
   ```bash
   git checkout master && git pull origin master
   ```

## Important Rules

- **`master`** is the production branch. Only merge via PR.
- **`dev`** is the integration branch. Feature branches merge here first.
- Always run `npm run verify` before pushing.
- The pre-push hook will block pushes that fail verification.
