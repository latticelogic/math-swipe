# Rollback runbook — the 2 a.m. page

**Web rollback fixes ALL channels at once** (browser, PWA, Android shell, iOS
shell — they all render the deployed site). Detection is automated
(`errorSpike` push → `/admin/errors`; uptime probe); the rollback itself is
deliberately human-in-loop. This doc removes the "look up how" step.

## Option A — Cloudflare dashboard (fastest to find)
Pages → project `math-swipe` → Deployments → previous good production deploy →
**⋯ → Rollback to this deployment**. Instant (edge cache swap).

## Option B — API (CLI-first; works when you have a token)
```bash
ACCT=00e07444cae65d675a140f8560429fad
PROJ=math-swipe
# 1) List recent production deployments (newest first) — find the last good id:
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/$PROJ/deployments?env=production&per_page=10" \
  | node -e "process.stdin.once('data',d=>{JSON.parse(d).result.forEach(x=>console.log(x.id,x.created_on,x.deployment_trigger?.metadata?.commit_hash?.slice(0,7),x.latest_stage?.status))})"
# 2) Roll back to it:
curl -s -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/$PROJ/deployments/<DEPLOYMENT_ID>/rollback"
```
Token: the CI `CLOUDFLARE_API_TOKEN` repo secret has the right scope; a local
copy (if any) lives in the owner's password manager. No local token → Option A.

## Option C — git revert (the durable fix)
`git revert <bad-sha>` → PR → merge. CI redeploys clean. Do this AFTER A/B
stopped the bleeding — a rollback without a revert will be re-broken by the
next merge.

## After any rollback
1. Verify: https://mathchallenge.app loads; `/admin/errors` quiets down;
   uptime probe green.
2. Old service workers: clients recover on next load (the reload-prompt flow
   serves the rolled-back build; the edge worker already auto-recovers
   chunk-load crashes).
3. Write the incident + cause in `status.md` (docs discipline).

## Shell (store) rollback — rare
A bad **native shell** build (not web): Play Console → halt the staged rollout /
release a fixed `.aab` (internal → promote). Old shells keep working against
the live site meanwhile. iOS analogue: pull the TestFlight build / expedite a
review. There is no instant store rollback — which is exactly why shells stay
thin.
