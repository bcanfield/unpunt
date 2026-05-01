#!/usr/bin/env bash
# core/build.sh — build adapter SKILL.md artifacts from the platform-agnostic core.
# Idempotent. Re-runnable. See docs/09-adapters.md §1 and docs/11-checklist.md Phase −1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BODY="$ROOT/core/skill/SKILL.body.md"

if [[ ! -f "$BODY" ]]; then
  echo "build.sh: $BODY does not exist (Phase 0a not yet run)" >&2
  exit 1
fi

shopt -s nullglob
built=0
for fm in "$ROOT"/adapters/*/skills/un-punt/_frontmatter.yml; do
  out_dir="$(dirname "$fm")"
  cat "$fm" "$BODY" > "$out_dir/SKILL.md"
  rsync -a --delete "$ROOT/core/skill/reference/" "$out_dir/reference/"
  rsync -a --delete "$ROOT/core/skill/snippets/"  "$out_dir/snippets/"
  if [[ -d "$ROOT/core/hooks" ]]; then
    rsync -a --delete "$ROOT/core/hooks/" "$out_dir/hooks/"
  fi
  echo "built: $out_dir/SKILL.md"
  built=$((built + 1))
done

if [[ "$built" -eq 0 ]]; then
  echo "build.sh: no adapters with _frontmatter.yml found under adapters/*/skills/un-punt/" >&2
  exit 1
fi
