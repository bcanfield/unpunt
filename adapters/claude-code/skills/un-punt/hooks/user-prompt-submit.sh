#!/usr/bin/env bash
# un-punt UserPromptSubmit hook (Q6 Chunk 1, per Decision #21).
#
# Fires on every user prompt in a .un-punt/-bearing repo with at least 5
# captured items. Injects a reminder asking the agent to consider whether
# the prompt is a wrap-up moment per the skill body's "Suggest when" rules.
#
# v0.2.0 design change: dropped the regex pre-filter on user prompts.
# The original regex (matching "done", "ship it", "wrap up", etc.) was
# empirically too narrow — many real users never use those exact phrases,
# meaning the hook never fired for them and wrap-up suggestions never
# surfaced. Sketch (ii) compliance is satisfied by the structural pre-
# filter (.un-punt/ exists + items >= 5); content judgment (is this a
# wrap-up? am I mid-task? did I already offer this session?) belongs to
# the agent, which has full conversation context to apply skill-body rules.
#
# v0.3 will likely replace this with a `type: "prompt"` hook that does the
# wrap-up judgment via a small focused model call (cleaner separation;
# removes the per-turn agent token cost). See docs/v0.3-roadmap.md V03-7.

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

# Item-count threshold (skill body: ≥5 items).
items_count=0
if [ -d "$cwd/.un-punt/items" ]; then
  items_count=$(find "$cwd/.un-punt/items" -maxdepth 1 -name 'up-*.md' 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$items_count" -lt 5 ]; then
  exit 0
fi

reminder=$(cat <<'MSG'
un-punt: a user prompt was just submitted; there are enough items in .un-punt/items/ that a sweep would be meaningful (≥5 open).

Consider: is this prompt a wrap-up signal? Apply the skill body's "Suggest when" rules using the FULL conversation context, NOT phrase-matching alone. Real users signal stopping points in many ways — "OK", "that should do it", "I think we're good here", "alright, moving on to ...", "phew", or just shifting topic away from the active feature. The phrase examples in the skill body ("done", "ship it", etc.) are starter signals; the underlying intent is "the user is closing out the active work loop and would tolerate a brief offer."

Apply the skill body's rules:
- Suggest if: end-of-feature signal / area-switch / end-of-session / threshold-based (≥7 days since last sweep + ≥10 pending)
- Never suggest if: user is mid-task, you already offered + were declined this session (check conversation history), current branch is protected (main/master/develop/trunk/release/*), or a sweep is in progress (.un-punt/lock exists).

If you DO offer, follow the Phrasing guidance: specific (counts + types + areas), polite, easy to dismiss. Use your voice, not a template. Don't tell the user to type /un-punt — they know the command exists; the suggestion IS the offer.

If you decide this prompt is NOT a wrap-up moment, just process it normally and move on.
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
