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

# ── 2. Every file in dist/assets must exist on prod with a sane content-type. ──
# Round-based retry absorbs edge-propagation lag: Cloudflare can serve the new
# index.html a few seconds before every hashed asset has propagated to the edge
# node a given request lands on, so a one-shot check catches transient 404s
# that self-resolve — the recurring false deploy failure. The REAL bug this
# guards against — an /assets/* path serving the SPA index.html (text/html),
# the 2026-07-21 League/Profile outage — is deterministic, so it (and a wrong
# MIME on a 200) fails IMMEDIATELY without retrying.
#
# NOTE: resp via `$(curl -w ...)` not `read < <(curl -w ...)` — curl's -w
# output has no trailing newline, so read exits 1 and `set -e` would kill the
# whole script. The `${arr[@]+"${arr[@]}"}` idiom safely expands a possibly
# empty array under `set -u`.
pending=()
for f in dist/assets/*; do pending+=("$(basename "$f")"); done
total=${#pending[@]}
fail=0
for round in $(seq 1 10); do
  [ "${#pending[@]}" -eq 0 ] && break
  retry=()
  for name in "${pending[@]}"; do
    resp=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$ORIGIN/assets/$name")
    code=${resp%% *}
    ct=${resp#* }
    # SPA HTML leaking onto an asset path is the outage bug — deterministic, fail now.
    case "$ct" in *text/html*) echo "BAD (html-fallback)  $code  $ct  /assets/$name"; fail=1; continue;; esac
    if [ "$code" = "200" ]; then
      case "$name" in
        *.js)  case "$ct" in *javascript*) ;; *) echo "BAD (mime)  $code  $ct  /assets/$name"; fail=1;; esac ;;
        *.css) case "$ct" in *css*)        ;; *) echo "BAD (mime)  $code  $ct  /assets/$name"; fail=1;; esac ;;
      esac
      continue   # settled (200 + good MIME, or a recorded MIME failure) — don't retry
    fi
    retry+=("$name")   # transient (e.g. 404 mid-propagation) — try again next round
  done
  pending=("${retry[@]+"${retry[@]}"}")
  if [ "${#pending[@]}" -gt 0 ]; then
    echo "  ${#pending[@]}/$total asset(s) not propagated yet (round $round/10), retrying in 6s..."
    sleep 6
  fi
done
for name in "${pending[@]+"${pending[@]}"}"; do
  echo "BAD (status)  /assets/$name  (still not 200 after propagation retries)"
  fail=1
done
[ "$fail" = 0 ] && echo "All $total assets serve correctly."

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
