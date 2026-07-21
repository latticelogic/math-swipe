#!/usr/bin/env bash
# Post-deploy smoke check — run by deploy.yml after `wrangler pages deploy`
# on master. Fails the workflow (loud red X + email) if production is not
# serving the build that was just deployed, or any hashed asset is missing
# or served with the wrong content-type.
#
# Why this exists: on 2026-07-21 the edge served index.html (text/html)
# for two /assets/*.js URLs — every League/Profile visit crashed — and the
# first signal was a tester report hours later. This script would have
# turned that into a failed deploy within ~2 minutes.
#
# Usage: bash scripts/smoke-prod.sh [origin]   (default https://mathchallenge.app)
set -euo pipefail
ORIGIN="${1:-https://mathchallenge.app}"

# ── 1. Wait for the deploy to propagate: the live index.html must reference
#      the same hashed index chunk as the dist/ we just uploaded. ──
MARKER=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' dist/index.html | head -1)
[ -n "$MARKER" ] || { echo "FATAL: no index chunk reference found in dist/index.html"; exit 1; }

echo "Waiting for $ORIGIN to serve the new shell ($MARKER)..."
propagated=""
for i in $(seq 1 12); do
  if curl -sf --max-time 20 "$ORIGIN/" | grep -q "$MARKER"; then propagated=1; break; fi
  echo "  not yet (attempt $i/12), retrying in 15s..."
  sleep 15
done
[ -n "$propagated" ] || { echo "FATAL: production index.html never picked up $MARKER"; exit 1; }
echo "Shell propagated."

# ── 2. Every file in dist/assets must exist on prod with a sane
#      content-type. text/html on an asset path = the SPA fallback leaked
#      through = exactly the failure mode that caused the outage. ──
fail=0
for f in dist/assets/*; do
  name=$(basename "$f")
  read -r code ct < <(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$ORIGIN/assets/$name")
  bad=""
  [ "$code" = "200" ] || bad="status"
  case "$ct" in *text/html*) bad="html-fallback";; esac
  case "$name" in
    *.js)  case "$ct" in *javascript*) ;; *) bad="${bad:-mime}";; esac ;;
    *.css) case "$ct" in *css*) ;; *) bad="${bad:-mime}";; esac ;;
  esac
  if [ -n "$bad" ]; then
    echo "BAD ($bad)  $code  $ct  /assets/$name"
    fail=1
  fi
done
[ "$fail" = 0 ] && echo "All $(ls dist/assets | wc -l) assets serve correctly."

# ── 3. Key routes respond 200. ──
for path in / /pricing /privacy /terms /refund; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN$path")
  if [ "$code" != "200" ]; then
    echo "BAD  $code  $path"
    fail=1
  fi
done
[ "$fail" = 0 ] && echo "All routes respond 200."

exit "$fail"
