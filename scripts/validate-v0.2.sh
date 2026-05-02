#!/usr/bin/env bash
# scripts/validate-v0.2.sh — re-dogfood validation runner for un-punt v0.2
#
# Per docs/v2-plan.md §Validation plan + Q7a methodology spec.
# Walks the user through the v0.1 → v0.2 swap and re-runs the failed probes
# (1, 4, 6, 7, 8) plus regression checks on what worked (probe 3 cold-start).
#
# This script is mostly orchestration — it does the install/uninstall
# automatically but cannot run the probes themselves (probes require
# human-in-the-loop interaction with the Claude Code agent in punt-board).
# After install, it prints exact prompts to paste + checklist to fill in.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DASHBOARDS_REPO="${UN_PUNT_DASHBOARDS_REPO:-$HOME/Documents/Git/un-punt-dashboards}"

GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

say() { printf "${1}${2}${RESET}\n"; }
header() { printf "\n${BOLD}${CYAN}=== %s ===${RESET}\n" "$1"; }

if [ ! -d "$DASHBOARDS_REPO" ]; then
  say "$YELLOW" "punt-board repo not found at $DASHBOARDS_REPO"
  say "$DIM" "Set UN_PUNT_DASHBOARDS_REPO to override, or clone the repo there."
  exit 1
fi

if [ ! -d "$DASHBOARDS_REPO/.un-punt" ]; then
  say "$YELLOW" "punt-board repo at $DASHBOARDS_REPO does not contain .un-punt/"
  say "$DIM" "This script expects the v0.1 dogfood state to validate against."
  exit 1
fi

header "STEP 1 — Pre-flight checks"
say "$DIM" "punt-board repo: $DASHBOARDS_REPO"
ITEMS_BEFORE=$(find "$DASHBOARDS_REPO/.un-punt/items" -maxdepth 1 -name 'up-*.md' 2>/dev/null | wc -l | tr -d ' ')
say "$DIM" "Items in .un-punt/items/ before validation: $ITEMS_BEFORE"

if [ ! -f "$REPO_ROOT/adapters/claude-code/skills/un-punt/SKILL.md" ] || [ ! -d "$REPO_ROOT/adapters/claude-code/skills/un-punt/hooks" ]; then
  say "$YELLOW" "Built artifact missing or stale. Running ./core/build.sh."
  (cd "$REPO_ROOT" && ./core/build.sh)
fi

say "$GREEN" "Pre-flight clean"

header "STEP 2 — Uninstall v0.1"
say "$DIM" "Removes ~/.claude/skills/un-punt/ + reverses the permissions block we added"
read -r -p "Proceed with uninstall? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  say "$YELLOW" "Aborted at uninstall. No changes made."
  exit 0
fi
"$REPO_ROOT/packages/cli/run.sh" uninstall || say "$YELLOW" "uninstall warned (may be already uninstalled — continuing)"

header "STEP 3 — Install v0.2"
say "$DIM" "Copies adapter artifact to ~/.claude/skills/un-punt/ + merges permissions + hooks block + AGENTS.md primer"
(cd "$DASHBOARDS_REPO" && "$REPO_ROOT/packages/cli/run.sh" install claude-code)

header "STEP 4 — Verify install state"
if [ -f "$HOME/.claude/skills/un-punt/SKILL.md" ]; then
  say "$GREEN" "Skill at $HOME/.claude/skills/un-punt/SKILL.md"
else
  say "$YELLOW" "Skill missing — install did not complete"
  exit 1
fi

if [ -d "$HOME/.claude/skills/un-punt/hooks" ]; then
  HOOK_COUNT=$(ls "$HOME/.claude/skills/un-punt/hooks"/*.sh 2>/dev/null | wc -l | tr -d ' ')
  say "$GREEN" "Hooks dir at $HOME/.claude/skills/un-punt/hooks/ ($HOOK_COUNT scripts)"
else
  say "$YELLOW" "Hooks dir missing — v0.2 install incomplete"
  exit 1
fi

if grep -q "un-punt/hooks" "$HOME/.claude/settings.json" 2>/dev/null; then
  say "$GREEN" "Hooks registered in $HOME/.claude/settings.json"
else
  say "$YELLOW" "Hooks NOT in settings.json — install merge may have failed"
  exit 1
fi

if [ -f "$DASHBOARDS_REPO/AGENTS.md" ]; then
  say "$DIM" "AGENTS.md already at $DASHBOARDS_REPO/AGENTS.md (left intact by install)"
else
  say "$DIM" "AGENTS.md not in punt-board (install would have placed it; might have been declined or pre-existed)"
fi

header "STEP 5 — Manual probe runs (you do these in Claude Code)"
say "$BOLD" "RESTART CLAUDE CODE NOW (exit then re-run \`claude\` in punt-board)"
say "$DIM" "Hooks load at session start; existing sessions won't pick up the new install."
echo
say "$DIM" "Then run these probes IN ORDER. Record each outcome in $DASHBOARDS_REPO/dogfood-log.md under a new \"v0.2 — Probes 9–12\" section."
echo

cat <<'PROBES'
================================================================
PROBE 9 — re-run of Probe 1 (skill load on session start)
================================================================
In your fresh Claude Code session in punt-board, paste:

  Are you currently operating with the un-punt skill loaded? If yes, list
  the 6 capture types in its trigger table without re-fetching it. If no,
  say so. Don't apologize, don't speculate — just answer.

EXPECTED (v0.2): "Yes" — the SessionStart hook injected the activation
reminder + skill body content. Agent should be able to recite the 6 types
without fetching.

EXPECTED FAIL MODE: same "No" as v0.1 → SessionStart hook didn't fire.
Check: is `bash` in PATH? Did Claude Code restart? Does
~/.claude/settings.json have the hooks block?

================================================================
PROBE 10 — re-run of Probe 4 (silent capture on tool calls)
================================================================
Send this prompt:

  Add a new function `compute_freshness_score(item)` to backend/app/dashboard.py
  that returns 0.0 for now. Just a stub — we'll implement the real logic later.

EXPECTED (v0.2): agent writes the stub. PostToolUse hook fires; agent reads
the additionalContext reminder and either:
  (a) Captures the deferred-implementation item to .un-punt/items/<id>.md
      silently (best case), OR
  (b) Acknowledges the deferral when asked.

After the prompt completes, run:
  ls $DASHBOARDS_REPO/.un-punt/items/ | wc -l
Expected: items count climbed from 18 to 19.

EXPECTED FAIL MODE: count stays at 18. Hook fired but agent ignored
additionalContext, OR hook did not fire (check ~/.claude/settings.json
PostToolUse matcher includes "Edit|Write|MultiEdit").

================================================================
PROBE 11 — re-run of Probes 6 + 8 (wrap-up suggestion)
================================================================
After Probe 10 lands, send:

  ready to ship.

EXPECTED (v0.2): UserPromptSubmit hook fires; additionalContext nudges
the agent to offer a brief sweep. Agent should reply with something like:

  > I noted N items today — a TODO in dashboard.py, the existing follow-ups
  > in src/auth and src/billing... Want me to do a quick cleanup pass right
  > here in your working tree? You will see each change. At the end you'll
  > pick where the commits go.

Specific (counts/types/areas), polite, easy to dismiss.

EXPECTED FAIL MODE: agent silently ends turn without suggesting. Check
items count >= 5 (threshold), check ~/.claude/settings.json
UserPromptSubmit hook present, check
.un-punt/.hook-state/suggested-sessions does not pre-exist with this
session_id.

================================================================
PROBE 12 — regression check on Probe 3 (cold-start)
================================================================
Test that cold-start path still works perfectly. In a NEW session:

  cd $DASHBOARDS_REPO
  cp -r .un-punt .un-punt.backup-pre-v02
  rm -rf .un-punt/items
  rm -rf .un-punt/sweeps

Then in Claude Code, send:

  /un-punt

EXPECTED (v0.2 regression-free): cold-start runs, captures 18 items
(matching v0.1 baseline), 0 false positives, all 9 non-deferral cases
correctly skipped (8 fixture-content + 1 meta-comment).

After:
  rm -rf .un-punt
  mv .un-punt.backup-pre-v02 .un-punt

EXPECTED FAIL MODE: capture count differs from 18 (regression in
cold-start logic) OR false positives appear (regression in 10-line context
check).

================================================================
PROBE OUTCOME TEMPLATE — paste into dogfood-log.md
================================================================
Copy and fill in:

## v0.2 — Probes 9-12 (Decision #21 hook contingency activated)

### Probe 9 — skill load on session start
Outcome: PASS / FAIL
Agent verbatim response: <paste>
Items count before/after: <n>/<n>

### Probe 10 — silent capture during work
Outcome: PASS / FAIL
Items count climb: 18 -> <n>
New item file: .un-punt/items/<id>.md (<file>:<line>)
Sketch (ii) compliance verified: yes (no regex pre-classification fired) / no

### Probe 11 — wrap-up suggestion at "ready to ship"
Outcome: PASS / FAIL
Agent suggestion verbatim: <paste>
Sweep offered with specifics (counts + types)? yes / no

### Probe 12 — cold-start regression
Outcome: PASS / FAIL
Items captured: <n> (expected 18)
False positives: <n> (expected 0)
Correctly-skipped non-deferrals: <n> (expected 9)

### Sketch (ii) compliance percentage (load-bearing for v0.3 escape-hatch decision)
Of N capture-eligible Edit/Write/MultiEdit events during this session,
the agent captured M items.
Compliance rate: M/N = <pct>%
Pass threshold: >= 80%
If < 60%: escalate to Sketch (iv) prompt hooks per Q3b deferred path.

================================================================
PROBES
echo
say "$BOLD" "After all 4 probes complete, send the filled-in template back to claude for synthesis."
