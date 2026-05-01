#!/usr/bin/env bash
# packages/evals/run.sh — one-line wrapper.
# Builds first if dist/main.js is missing or older than src/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -f "$HERE/dist/main.js" || -n "$(find "$HERE/src" -newer "$HERE/dist/main.js" -print -quit)" ]]; then
  (cd "$HERE" && pnpm build)
fi
node "$HERE/dist/main.js" "$@"
