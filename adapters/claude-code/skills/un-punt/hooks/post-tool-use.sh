#!/usr/bin/env bash
# un-punt PostToolUse hook (matchers: Edit, Write, MultiEdit).
# Q6 Chunk 1, per Decision #21 / Q4a Sketch (ii) / Q3b Decision-2 verdict.
#
# Why this exists: dogfood Probe 4 showed silent capture does not fire on
# side-effect deferrals during Edit/Write/MultiEdit tool calls — even when
# the skill is loaded via /un-punt slash-command. This hook fires after
# every Edit/Write/MultiEdit and reminds the agent to apply un-punt's
# Capture rules to its just-completed edit.
#
# CRITICAL Sketch (ii) compliance: this hook does NO content classification.
# It checks file path against structural pre-filters (path globs + gitignore)
# and emits a reminder. It does NOT grep the file for capture patterns;
# that judgment belongs to the agent (Decision 2 per Q3b).
#
# The May 1 draft of this hook used regex pre-classification (Sketch iii
# anti-pattern) — codified in research/Q4a-classification-line.md as the
# canonical anti-pattern. This rewrite is the Sketch (ii) version.
#
# Output mechanism: hookSpecificOutput.additionalContext per Q1b. Silent
# no-op when out-of-scope (generated code, gitignored, fixture, etc.).

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

# Extract the file path that was just written/edited.
file="$(printf '%s' "$input" | python3 -c 'import json,sys
try:
    data = json.load(sys.stdin)
    ti = data.get("tool_input", {}) or {}
    print(ti.get("file_path") or ti.get("path") or "")
except Exception:
    pass
' 2>/dev/null || true)"

[ -n "${file:-}" ] || exit 0
[ -f "$file" ] || exit 0

# Structural pre-filter (Sketch ii): skip out-of-scope files.
# These are paths where deferral capture is not meaningful: generated code,
# vendored deps, build outputs, virtualenvs, the .un-punt/ dir itself.
case "$file" in
  *"/__generated__/"*|*"/node_modules/"*|*"/.un-punt/"*|*"/dist/"*|*"/build/"*|*"/.next/"*|*"/.venv/"*|*"/venv/"*|*"/__pycache__/"*|*"/.turbo/"*|*"/coverage/"*|*"/htmlcov/"*|*"/.pytest_cache/"*|*"/.mypy_cache/"*|*"/.ruff_cache/"*)
    exit 0 ;;
esac

# Skip gitignored files (catches .env, generated, build artifacts the user
# has explicitly told git to ignore — same intent for un-punt).
if git -C "$cwd" check-ignore -q "$file" 2>/dev/null; then
  exit 0
fi

# Compute relative path for the reminder.
rel_file="${file#$cwd/}"

reminder=$(cat <<MSG
un-punt: you just edited $rel_file (in scope per the un-punt PostToolUse hook).

Per the un-punt skill body's Capture rules section, before continuing:

1. Inspect your most recent edit's diff for this file.
2. Did your change introduce or expose any of the following — explicitly or implicitly?
   - A deferral (TODO/FIXME/HACK comment, or any "I'll come back to this" moment in your reasoning)
   - A type loosening (\`as any\`, \`@ts-ignore\`, \`# type: ignore\`, \`: any\`, etc.)
   - A skipped test (\`.skip\`, \`xit\`, \`it.todo\`, \`@pytest.mark.skip\`, etc.)
   - A swallowed exception (empty \`catch {}\`, \`except: pass\`, ignored Promise rejection, \`_ = err\`, etc.)
   - A hack/workaround (debug logging left in, hardcoded value that should be config, mock implementation in prod path, race-condition workaround, etc.)
   - A duplicated logic block you didn't DRY
   - A "throw not implemented" / \`raise NotImplementedError\` / \`unimplemented!()\` / \`todo!()\` / \`panic("TODO")\` placeholder
3. The patterns above are examples, not exhaustive — apply judgment. If you observed yourself deferring something, capture it.
4. If yes to any: write \`.un-punt/items/<id>.md\` per the skill body's Capture rules. Do NOT announce; capture is silent.
5. If no: continue your task.

The skill body at ~/.claude/skills/un-punt/SKILL.md is the source of truth. This hook routes the event; you classify the content.
MSG
)

escaped="$(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$reminder")"

cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": $escaped
  }
}
JSON
