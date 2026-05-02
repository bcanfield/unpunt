# un-punt v0.2 — plan

> **Status: living plan.** Updated as each research session completes. The "Research outcomes" section at the bottom is the canonical record of what each Q-session decided.
>
> **Source of truth for the v0.1 evidence base:** [`/Users/bcanfield/Documents/Git/un-punt-dashboards/dogfood-log.md`](https://github.com/bcanfield/unpunt) (gitignored locally; will be PR'd to bcanfield/unpunt at end of dogfood). All probe outcomes referenced below are from that log.

---

## Why v2 exists

The May 2026 punt-board × un-punt v0.1 dogfood produced an empirically airtight foundation finding: **un-punt v0.1's rules only enforce inside the explicit `/un-punt` slash-command flow.** Outside that flow — before, between, or after invocations, on fresh or existing sessions — the skill is dormant. The "always-on disciplines" claim in `core/skill/SKILL.body.md` is empirically false on the punt-board corpus.

Concretely: across four passive-enforcement probes (silent capture during work, wrap-up suggestion at trigger phrases, fresh-session description-match, and post-bootstrap behavior), **all four failed**. The skill body either wasn't loaded at all (probes 1, 2, 7) or was loaded as content but not enforced as rules (probes 4, 6, 8). Cold-start via `/un-punt` worked perfectly (100% recall, 0 FP) — that's the recovery mechanism keeping v0.1 from being broken — but it's not a substitute for passive enforcement.

v0.2's job is to deliver the passive enforcement v0.1 promised, **without abandoning the architectural commitments that made un-punt distinctive in the first place**.

---

## What we know (locked findings)

These are not up for re-debate. The dogfood log is the citation for each.

### Failure findings

| Probe | What failed | Evidence |
|---|---|---|
| 1 | Description-match auto-loading on session pre-dating install | Skill files in `~/.claude/skills/un-punt/` but agent verbatim says "not loaded" |
| 2 | Description-match on Claude Code restart | Same outcome |
| 4 | Silent capture during work, post-`/un-punt` bootstrap | 2 `# type: ignore` lines written via Edit tool, items count unchanged at 18 |
| 6 | Wrap-up suggestion at "Zone 5 done. Zone 7 done." (post-bootstrap) | Silent; agent fell through to "What's next" |
| 7 | Description-match on a fresh session | Same as probes 1/2 — items count unchanged through entire fresh session |
| 8 | Wrap-up suggestion at "ready to ship" (fresh session) | Silent — different session entry, same outcome |

### Working findings (do not regress)

| Probe | What worked |
|---|---|
| 3 | Explicit `/un-punt` invocation activates cold-start successfully |
| 3 outcome | Cold-start: 18/18 source-deferral recall, 0 false positives, 9 correctly-discriminated non-deferrals (8 fixture skips + 1 meta-comment) |
| 5 | Sweep planning + report shape (bucket distribution, disposition prompt skip at N=0, two-receipt format ready) — spec-correct |

### Minor findings (real bugs but not load-bearing for v0.2)

1. `hack-workaround` and `other` are in the skill's 6-type enum but **not** in `contract.md` thresholds. Agent silently maps to deferred-implementation's 0.85.
2. `contract.md` defines 4 types (`missing-edge-case`, `deprecated-api`, `dead-code`, `doc-additions`) that are **not** in the skill's 6-type enum.
3. Cold-start "Top 3 areas" double-counts nested path prefixes (8+8+4=20 ≠ 18 items).
4. All cold-start captures land at uniform `confidence: 0.4`; no UX exists for promotion to fix-eligible.
5. Refused-section enumeration in `plan.md` walks 7 of 12 categorical rules explicitly; rules 1, 4, 9, 10, 11 are not visibly checked.
6. Items reference `file:line` at capture time; refactors invalidate them (line-drift). No mechanism to detect or refresh.

---

## Constraints / non-negotiables

These are settled (`docs/audits/07-validation-april-2026.md` and `docs/08-design-decisions.md`). v0.2 changes are evaluated against these. **A change that violates one needs explicit empirical justification AND a new decision entry that supersedes the relevant prior decision.**

| Constraint | Source | Why it matters for v0.2 |
|---|---|---|
| Markdown all the way down | Decision 1 | Items, sweeps, contracts stay markdown. No SQLite, no DB. |
| Agent is the engine — no separate classifier | Decision 2 | **Detection logic does not move out of the agent into shell/regex.** v0.2 hooks (if any) prompt the agent; they do not pre-digest. |
| In-tree visibility | Decision 3 | Sweeps stay visible in user's working tree. No hidden worktrees. |
| Refuse > Flag > Fix | Decision 6 | Disposition prompt remains mandatory and verbatim. |
| Cleanup framing, not "debt" vocabulary | Decision 10 | User-facing copy avoids "debt"; uses "cleanup", "deferred", "follow-ups", "loose ends". |
| Cross-platform — Codex / Cursor / Claude Code | Decision 13 + Phase 2 plan | **Any v0.2 fix that's Claude-Code-only is a constraint violation requiring explicit acknowledgement.** Cross-platform was a top-3 reason for the markdown-skill architecture. |
| The skill is the IP | Decision 4 | Most engineering effort stays in `core/skill/`. Hooks (if any) are thin adapter shells. |
| No infrastructure (no daemon, no service, no MCP server) | Decisions 1, 2, 13, 15 | v0.2 hooks (if any) are stateless event scripts; no long-running processes. |
| Locked validation results | `docs/audits/07-validation-april-2026.md` | Demand, threat model, competitive position, risk weights — settled, do not redo. |

The dogfood **does** provide explicit empirical justification to revisit Decision 13's "no hooks" stance for the capture/suggestion paths it covered — but only insofar as the cross-platform implication (above) is honestly reckoned with.

---

## What we don't know yet (open questions)

Each Q is its own dedicated session. Order is rough; later Qs may rearrange based on earlier outcomes. **No implementation in any Q-session until research + planning produces a clear answer.**

### Q1 — Claude Code hook surface and idiomatic patterns

What does Claude Code's hook system actually offer? What events, what input/output schemas, what path-resolution mechanisms (e.g., `${CLAUDE_PLUGIN_ROOT}`), what timing/performance constraints, what bypass-mode behavior? What do well-built community/Anthropic plugins use hooks for? What's the relationship between plugin-marketplace installs and skill-direct installs (which un-punt currently uses)?

**Method**: spawn `claude-code-guide` and `plugin-dev:hook-development` agents in parallel. Cross-reference with 2–3 well-built plugins. **Read-only, no edits.**

**Deliverable**: a tight summary appended to "Research outcomes" below, with citations to docs and plugin examples.

**Depends on**: nothing. Run first.

### Q2 — Cross-platform analogues to Claude Code hooks

Codex and Cursor are the next-priority adapters per the Phase 2 plan. What do *they* offer that's analogous to Claude Code's PostToolUse / SessionStart / UserPromptSubmit hooks? Specifically:
- Codex: any hook-equivalent? AGENTS.md + slash commands only? Anything that fires on tool calls?
- Cursor: `.cursorrules`, `cursor.json`, MCP servers — what fires when?
- Are there cross-platform conventions (e.g., AGENTS.md as a per-repo primer) that all three honor?

**Method**: web search + doc check for each platform. Possibly the `claude-code-guide` agent can also speak to Codex/Cursor analogues; if not, web search.

**Deliverable**: a comparison matrix of Claude Code hook events ↔ Codex equivalent ↔ Cursor equivalent ↔ "no equivalent" — with notes on what un-punt could plausibly use on each platform.

**Depends on**: Q1 (need Claude Code's hook events enumerated first).

### Q3 — Re-read decisions 1, 2, 13 against the dogfood evidence

For each of decisions 1 (markdown), 2 (agent is engine), 13 (skill not hooks): re-read the *why* and the *tradeoff*. Identify exactly what part of the decision the dogfood empirically refutes (if any) vs. what part still stands. Frame any v0.2 architecture change as either *extending* a decision (additive) or *superseding* a decision narrowly (subtractive, with explicit rationale).

**Method**: re-read the three decisions. Map each bullet to dogfood evidence. Produce an honest "still-true / partially-true / superseded" verdict per bullet.

**Deliverable**: a table per decision showing which claims survive the dogfood and which need updating. This is the input to any new decision entry (#21+).

**Depends on**: Q1 (need to know what hook architecture is even feasible before judging which decisions it would touch).

### Q4 — Pattern detection vs interpretive judgment — where does each belong?

The dogfood showed `rg` regex pre-digestion contradicts decision 2 (agent as engine). But also: a hook that NEVER pre-filters is likely too noisy (fires on every tool call regardless of relevance). Where's the right line between "hook nudges the agent to look" vs. "hook does the looking"?

Sub-questions:
- Can hooks emit *prompts* without pre-classifying? (E.g., "you just edited X; check for deferrals" rather than "I found these deferrals in X.")
- Is there a lightweight pre-filter that doesn't constitute classification? (E.g., "this file is in scope" vs. "this file contains a TODO")
- Is the "agent as engine" line about WHO does the work (agent, not regex) or WHEN the work happens (in-context, not retrospectively)?

**Method**: re-read decision 2 carefully. Sketch 3 hook designs at varying levels of pre-digestion. Rate each against the decision-2 spirit and against the noisiness/cost dimension.

**Deliverable**: a recommendation on the "right line" with a worked example.

**Depends on**: Q1, Q3.

### Q5 — Per-architectural-option, what's the change set?

Once Q1–Q4 are answered, we'll know:
- Whether hooks are the right fix at all (vs. AGENTS.md primer, vs. frontmatter tweaks, vs. skill-body restructure)
- Whether hooks survive the cross-platform test
- What the right level of pre-digestion is

Q5 enumerates the candidate architecture(s) that survive Q1–Q4 and produces a per-option change set:
- Files touched
- Decisions extended/superseded
- Cross-platform coverage delta
- Implementation cost estimate
- Risk dimensions

**Method**: structured comparison table; one option per row; columns for the dimensions above.

**Deliverable**: the architecture decision, with the chosen change set. This is the input to Q6.

**Depends on**: Q1, Q2, Q3, Q4.

### Q6 — Implementation, one chunk at a time

Each chunk gets its own session: read-current-state → implement-narrowly → test-locally → mark complete. **No batched implementation across multiple components in a single session.**

The chunk list is a Q5 output, not pre-decided here.

**Depends on**: Q5.

### Q7 — Re-dogfood validation

After Q6 chunks land: rebuild artifacts, reinstall in punt-board, re-run probes 1, 4, 6/8, 7 (the failed four). Plus regression checks on what worked (probe 3 cold-start, probe 5 sweep behavior). Update dogfood-log with a "v0.2 — hook contingency activated" section.

**Method**: validation script (single shell script) that uninstalls v0.1, reinstalls v0.2, prompts user to restart Claude Code, then provides exact prompts/queries for each probe re-run.

**Deliverable**: dogfood-log entries for Probes 9–14 (re-runs of 1, 4, 6, 7, 8 + cold-start regression).

**Depends on**: Q6.

### Q8 — Minor findings disposition

The 6 minor findings (contract type mismatch, top-3-areas, uniform 0.4 confidence, refused-section enumeration, line-drift) need decisions: fix in v0.2, defer to v0.3, or accept as known limitations.

**Method**: per-finding judgment call against severity + cross-platform fit + cost.

**Deliverable**: per-finding "fix in v0.2 / defer / accept" verdict with one-sentence rationale.

**Depends on**: Q5 (some minor findings may be implicit in the chosen architecture).

---

## Methodology — how each Q-session runs

1. **Frame the question** (≤3 sentences, scope tight enough for one session)
2. **Read existing approach** in this repo — relevant docs, code, prior decisions; quote them
3. **Understand the why** — what tradeoff, what alternatives rejected, what new evidence (if any) changes the calculus
4. **External research** where the answer isn't in the repo — Claude Code docs, plugin-dev skills, similar plugins, web search
5. **Propose with explicit fit-against-prior-decisions check** — does this contradict or extend a decision; if contradicts, what's the empirical justification
6. **WAIT for explicit user confirmation** before any code edits
7. **Append outcome to "Research outcomes" below** — one paragraph per Q-session, capturing the decision and the citation trail

Implementation is the LAST step. And only after Q1–Q5 produce a clear architectural answer.

---

## Success criteria

v0.2 is "done" when:

| Probe | Pre-v0.2 result | Post-v0.2 expected |
|---|---|---|
| 1 | ✗ skill not loaded | ✓ skill loaded on session-start |
| 4 | ✗ silent capture failed | ✓ silent capture fires on Edit/Write/MultiEdit during normal feature work |
| 6 | ✗ wrap-up suggestion silent | ✓ wrap-up suggestion fires on textbook trigger phrases |
| 7 | ✗ fresh-session auto-load failed | ✓ fresh-session auto-load works |
| 8 | ✗ wrap-up suggestion silent | ✓ same as 6 across session boundaries |

**AND** these regressions do not happen:

| Probe | Pre-v0.2 result | Post-v0.2 expected |
|---|---|---|
| 3 (cold-start invocation) | ✓ activates correctly | ✓ unchanged |
| 3 (cold-start outcome) | 18/18 recall, 0 FP, 9 correct skips | identical or better |
| 5 (sweep planning + report) | spec-correct | identical |
| Disposition prompt skip at N=0 | spec-correct | identical |
| Categorical refusal logic | spec-correct | identical |

**AND** the cross-platform thesis is honestly reckoned:
- If v0.2's fix is Claude-Code-only, the launch story explicitly acknowledges Codex/Cursor users get the v0.1 experience, with a Phase 2 commitment to platform-specific adapters.
- If v0.2's fix is cross-platform (e.g., AGENTS.md primer), the launch story claims that explicitly.

---

## Validation plan

Same shape as the v0.1 dogfood, executed in punt-board. Specifically:

1. Build artifacts (`./core/build.sh`)
2. Uninstall v0.1 (`packages/cli/run.sh uninstall`)
3. Reinstall v0.2 (`packages/cli/run.sh install claude-code`)
4. Restart Claude Code
5. Open a fresh session in `/Users/bcanfield/Documents/Git/un-punt-dashboards`
6. **Probe 9 (re-run of probe 1)**: send the diagnostic question (*"Are you currently operating with the un-punt skill loaded?"*). Confirm activation works.
7. **Probe 10 (re-run of probe 4)**: build a small task that involves writing a TODO. Watch `.un-punt/items/` for new captures during work.
8. **Probe 11 (re-run of probe 6/8)**: at natural wrap-up, say *"done"* or *"ready to ship"*. Watch for sweep suggestion.
9. **Probe 12 (regression on probe 3)**: `git rm -rf .un-punt/items/`, fresh session, `/un-punt`. Verify 18/18 recall + 0 FP again.
10. Update `dogfood-log.md` with Probes 9–12 outcomes under a new "v0.2 — hook contingency activated" section.

If 9–12 all pass: v0.2 ships, write up the launch story.

If any of 9–12 fails: the failure is much narrower than v0.1's foundation crack — it's a specific implementation bug, not an architecture problem. Fix the specific bug (each fix is its own session per the methodology), re-validate.

---

## Out of scope for v0.2 (explicit)

- Codex / Cursor / Copilot adapter implementations (Phase 2 if v0.2's fix isn't already cross-platform via AGENTS.md or similar)
- Team-aggregation surface (Phase 3+)
- MCP server (Decision 15 — not unless team-aggregation triggers it)
- Eng-leader dashboard (Phase 4)
- Disposition prompt UX changes (no dogfood evidence; not exercised at N=0)
- Sweep planning algorithm changes (probe 5 showed this is correct)
- Cold-start procedure changes beyond the minor-finding fixes Q8 may decide
- Calibration loop changes (`feedback.md` flow not exercised in v0.1 dogfood)

---

## Living section: Research outcomes

> Each Q-session appends a single paragraph here when it completes. Format: `### Q<N> — <date> — <one-line headline>` followed by 2–6 sentences of outcome + citation trail. This section is the canonical record of decisions; the rest of this doc is the framing.

*(empty — Q1 not yet run)*

---

## Living section: Decisions taken (numbered for the design register)

> Each architectural change that lands gets a one-line entry here, AND a full entry in `docs/08-design-decisions.md`. This section is the index; that file is the register.

*(empty — no decisions taken yet)*
