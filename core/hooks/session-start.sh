#!/usr/bin/env bash
# un-punt SessionStart hook (Q6 Chunk 1, per Decision #21 / Q4a Sketch ii).
#
# Why this exists: dogfood Probes 1, 2, 7 showed Claude Code's description-
# match auto-loading does not fire for un-punt's "always-on" semantics on
# coding-topic conversations. This hook unconditionally injects a skill-
# activation reminder on every session in a repo containing .un-punt/, so
# the skill body's rules are treated as load-bearing from turn 1 instead
# of dormant until /un-punt is explicitly invoked.
#
# Sketch (ii) compliance: hook does NO content classification. It checks
# whether .un-punt/ exists in cwd (structural metadata) and if so emits
# the activation reminder. The agent reads the skill body and decides what
# to do.
#
# Output mechanism: hookSpecificOutput.additionalContext per Q1b decision
# tree. Silent (exit 0, no stdout) when not in a .un-punt/ repo so we
# don't add noise to non-un-punt projects.

set -euo pipefail

input="$(cat)"

cwd="$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("cwd", ""))
except Exception:
    pass
' 2>/dev/null || true)"
[ -z "${cwd:-}" ] && cwd="$PWD"

[ -d "$cwd/.un-punt" ] || exit 0

items_count=0
if [ -d "$cwd/.un-punt/items" ]; then
  items_count=$(find "$cwd/.un-punt/items" -maxdepth 1 -name 'up-*.md' 2>/dev/null | wc -l | tr -d ' ')
fi

reminder=$(cat <<'MSG'
un-punt is active in this repo (.un-punt/ exists).

The skill body at ~/.claude/skills/un-punt/SKILL.md defines two rule sets you are required to apply this session:

1. CAPTURE RULES (silent, continuous). When you write or edit a file, the un-punt PostToolUse hook will remind you to inspect your diff for any deferral, type loosening, skipped test, swallowed exception, hack, mock, hardcoded value, or "I'll come back to this" moment. The patterns in the skill body are examples, not the exhaustive universe — apply judgment. If you find one, write .un-punt/items/<id>.md per the skill body's Capture rules section. Do NOT announce; capture is silent.

2. SUGGESTION RULES (at wrap-up). When the user signals end-of-feature ("done", "looks good", "ship it", "ready to ship", etc.), area-switch ("switching to", "moving on to"), or end-of-day, the un-punt UserPromptSubmit hook will surface the trigger and remind you to offer a brief, easy-to-dismiss sweep per the skill body's Suggestion rules section.

These rules apply every turn, not just when un-punt-related slash commands run. The hooks are reminders that fire at deterministic events; you are still the engine that classifies what each event means and decides what to do.
MSG
)

reminder="$reminder

Currently $items_count item(s) tracked in .un-punt/items/."

escaped="$(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$reminder")"

cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $escaped
  }
}
JSON
