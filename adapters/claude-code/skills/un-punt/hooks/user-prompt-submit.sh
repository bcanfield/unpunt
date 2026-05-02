#!/usr/bin/env bash
# un-punt UserPromptSubmit hook (Q6 Chunk 1, per Decision #21).
#
# Why this exists: dogfood Probes 6 + 8 showed wrap-up suggestion does not
# fire on textbook trigger phrases ("Zone 5 done", "ready to ship") under
# any session-bootstrap path. This hook intercepts the user's prompt
# before the agent processes it; if it contains a wrap-up trigger phrase,
# the agent gets injected context prompting it to offer a sweep at the
# right moment.
#
# Sketch (ii) compliance note: this hook DOES detect specific user phrases
# (string matching). This is acceptable because:
#   1. The skill body's Suggestion rules table EXPLICITLY enumerates the
#      trigger phrases ("done", "ship it", "wrap up", "switching to", etc.).
#      Detecting these is following the skill spec, not adding new
#      classification on top.
#   2. The trigger detection is on USER INPUT (chat metadata), not on
#      file contents — different from the Sketch (iii) anti-pattern which
#      classified file contents.
#   3. The agent makes the actual judgment (mid-task? already declined?
#      what specific phrasing to use?) — the hook just routes.
#
# Per-session "already suggested" marker prevents re-asking if user said no.

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

prompt="$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("prompt", ""))
except Exception:
    pass
' 2>/dev/null || true)"
[ -n "${prompt:-}" ] || exit 0

# Wrap-up trigger phrases — mirrored from SKILL.body.md "Suggest when" section.
# Word-boundary anchored to avoid false positives on substrings (e.g., "redone").
wrap_re='\b(done|looks good|ship it|ready to ship|shipped|okay we'\''re good|let'\''s call it|wrap[[:space:]]+up|sign[[:space:]]+off|done[[:space:]]+for[[:space:]]+today|switching[[:space:]]+to|moving[[:space:]]+on|now[[:space:]]+let'\''s)\b'

if ! printf '%s' "$prompt" | grep -qiE "$wrap_re"; then
  exit 0
fi

# Item-count threshold (skill body default: ≥5 items).
items_count=0
if [ -d "$cwd/.un-punt/items" ]; then
  items_count=$(find "$cwd/.un-punt/items" -maxdepth 1 -name 'up-*.md' 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$items_count" -lt 5 ]; then
  exit 0
fi

# Per-session "already suggested" marker: don't re-fire if user already declined.
session_id="$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    print(json.load(sys.stdin).get("session_id", ""))
except Exception:
    pass
' 2>/dev/null || true)"

marker_dir="$cwd/.un-punt/.hook-state"
mkdir -p "$marker_dir" 2>/dev/null || true
marker_file="$marker_dir/suggested-sessions"
touch "$marker_file" 2>/dev/null || true

if [ -n "${session_id:-}" ] && grep -qxF "$session_id" "$marker_file" 2>/dev/null; then
  exit 0
fi

[ -n "${session_id:-}" ] && echo "$session_id" >> "$marker_file"

reminder=$(cat <<MSG
un-punt: the user's prompt contains a wrap-up trigger phrase. There are $items_count item(s) currently open in .un-punt/items/.

Per the un-punt skill body's Suggestion rules section, this is the moment to offer a brief, easy-to-dismiss cleanup pass. Phrasing guidance from the skill body (your voice, not a template):

  > I noted N items today — a few TODOs, a loosened type in X, a skipped Y test. Want me to do a quick cleanup pass right here in your working tree? You'll see each change. At the end you'll pick where the commits go.

Be specific (counts + types + areas). Polite. Easy to dismiss. Do NOT run a sweep without acceptance. If the user says no, drop it — do not re-ask in the same session. If the user accepts, follow the Sweep planning + execution sections of the skill body.

Apply judgment: skip this offer if the user is mid-task (e.g., they said "done implementing X — now let's test it"; the wrap-up signal is partial). The skill body's "Never suggest when" subsection lists the cases to skip.
MSG
)

escaped="$(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$reminder")"

cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $escaped
  }
}
JSON
