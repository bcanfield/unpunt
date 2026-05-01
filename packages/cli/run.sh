#!/usr/bin/env bash
# packages/cli/run.sh — convenience wrapper around the un-punt CLI.
# Builds first if dist/index.js is missing or older than src/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -f "$HERE/dist/index.js" || -n "$(find "$HERE/src" -newer "$HERE/dist/index.js" -print -quit)" ]]; then
  (cd "$HERE" && pnpm build)
fi
node "$HERE/dist/index.js" "$@"
