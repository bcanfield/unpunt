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

### Q8a — 2026-05-02 — USER GATE CLEARED — 5 minor findings dispositioned: 2 fix-in-v0.2 (contract template + confidence promotion docs); 2 defer to v0.2.x/v0.3 (top-3-areas + refused-section enumeration); 1 defer + known limitation (line-drift)

Full deliverable at [`research/Q8a-minor-findings-disposition.md`](research/Q8a-minor-findings-disposition.md). User confirmed all 5 verdicts as proposed. **Fix in v0.2**: (1) contract template type vocab mismatch — already in Chunk 5; (3) uniform 0.4 confidence + promotion UX — adds ~30 LOC subsection to Chunk 4. **Defer to v0.2.x or v0.3**: (2) top-3-areas double-count and (4) refused-section enumeration covers 7 of 12 rules — both cosmetic. **Defer to v0.3 + document as known limitation**: (5) line-drift in items frontmatter — structural fix needs PostToolUse hook to recheck on edits, depends on v0.2 hook architecture being proven first; v0.2 launch materials document as known limitation. **Net Q5c chunk plan change**: Chunk 4 grows from ~50 to ~80 LOC; other chunks unchanged. Q7 re-dogfood validation should include a smoke check that items captured at runtime have correct file:line (line-drift watch). **Q5 + Q8 user gates both cleared**; Q6 implementation can begin.

### Q5c — 2026-05-02 — USER GATE CLEARED — Candidate A selected (Claude Code only, 3 hooks, AGENTS.md primer). Future-lift to B/C documented. Q6 chunked into 6 implementation sessions

Full deliverable at [`research/Q5c-architecture-decision.md`](research/Q5c-architecture-decision.md). User confirmed: *"not much value [in cross-platform v0.2]; we should get this working effectively with claude code first."* Selection: **Candidate A** — un-punt v0.2 ships SessionStart + PostToolUse (`Edit|Write|MultiEdit`) + UserPromptSubmit hooks for Claude Code only; AGENTS.md primer template lives in any `.un-punt/`-bearing repo (universal floor); Sketch (ii) hook design only (no content classification per Q4a/Q3b); SKILL body widens per Q4b; CLI extends ~30 LOC for hooks-block merge per Q1c. Frontmatter mitigations OUT (Q5b dominance). **Future-lift estimates** (user's second question): A → B (add Cursor + Codex) ≈ ~180 LOC + ~4 hours; A → C (add all 6 platforms) ≈ ~360 LOC cumulative + ~9 hours. v0.2.1/v0.2.2 patches add Cursor/Codex adapters (~80 LOC each, single-afternoon work post-launch). **Per-file change set**: 5 new + 12 modified = 17 file touches. **Q6 chunked into 6 sessions**: (1) hook scripts; (2) CLI hook-merging extension; (3) adapter settings.json hooks block; (4) SKILL body widening; (5) contract template fix; (6) AGENTS.md primer + 4 docs updates. Sequence: 1 → 2 → 3, then 4/5/6 in parallel. **Out-of-scope** explicitly: cold-start procedure (worked perfectly), sweep planning (correct), disposition prompt (no evidence), calibration loop (not exercised), 3 minor findings deferred (top-3-areas double-count, line-drift, refused-section enumeration — Q8a confirms). Hook scripts at `core/hooks/*.sh` from May 1 are reference only — `post-tool-use.sh` especially must be REWRITTEN per Sketch (ii); the May 1 draft used Sketch (iii) regex pre-classification anti-pattern.

### Q5b — 2026-05-02 — Frontier identified (A, B, C, E); D dominated. The choice axis: how much to ship at v0.2 vs defer to v0.3 / 0.2.x

Full deliverable at [`research/Q5b-comparison-matrix.md`](research/Q5b-comparison-matrix.md). Per-cell scoring across 4 probe-solves dimensions + cross-platform coverage + cost + regression risk + validation surface. **Frontier candidates (Pareto-optimal)**: A (smallest hook-based; CC only), B (mid cost; SKILL.md trio CC+Cursor+Codex), C (largest; all 6 platforms tiered), E (smallest overall; primer-only — does NOT solve Probes 4, 6, 8). **Dominated**: D (defense-in-depth) — frontmatter mitigations (`when_to_use`/`paths`) likely cosmetic in the presence of hooks per dogfood evidence; same probe coverage as base + marginally higher cost + added maintenance. The frontier reduces to **a single trade-off axis**: "ship smaller v0.2 + adapter coverage in 0.2.x patches" (favors A) vs "ship cross-platform IP validation in v0.2" (favors B) vs "ship comprehensive launch" (favors C) vs "ship the floor + dogfood-driven v0.3 hooks" (favors E). Each stance is defensible; the matrix doesn't pick. **LOC estimates**: A ~450, B ~660, C ~880, E ~210. **Q5c is the user-confirmation gate** where you pick among the four frontier candidates. After Q5c, Q6 chunks scale with selection (A → ~6 chunks; B → ~9; C → ~14; E → ~3).

### Q5a — 2026-05-02 — 5 v0.2 architecture candidates enumerated (A: minimum-viable Claude Code only; B: SKILL.md adopters Claude Code+Cursor+Codex; C: full tiered all 6 platforms; D: defense-in-depth A or B + frontmatter mitigations; E: AGENTS.md primer only / no hooks)

Full deliverable at [`research/Q5a-architecture-candidates.md`](research/Q5a-architecture-candidates.md). **Per methodology refinement #3 (user-gate hygiene): enumeration only, no verdict.** Locked-in across all candidates: SKILL body widening per Q4b; 6-type enum closed; Sketch (ii) hook design per Q4a+Q3b; Decision #21 supersession text per Q3c; AGENTS.md primer as universal floor; cold-start path unchanged; `updatedToolOutput` not used (re-validation 2026-05-02 confirmed undocumented per canonical https://code.claude.com/docs/en/hooks.md); Sketch (iv) prompt hooks deferred to v0.3. Candidates differ on **adapter coverage** (Claude Code only vs SKILL.md trio vs all 6 vs primer-only), **hook scope** (all 3 hooks vs partial vs none), and **belt-and-suspenders defenses** (frontmatter `when_to_use`/`paths`). Q5b will produce the comparison matrix (solves probes / cross-platform coverage / cost / regression risk per candidate); Q5c is the user-confirmation gate where the choice happens.

### `updatedToolOutput` re-validation — 2026-05-02 — confirmed undocumented; Q1b's reading was correct

Pending re-validation from the methodology audit, resolved before Q5a synthesis. WebFetch against canonical docs at https://code.claude.com/docs/en/hooks.md confirms `updatedToolOutput` is **NOT documented** anywhere — neither that exact form nor variations. PostToolUse JSON output fields are: `continue`, `stopReason`, `suppressOutput`, `systemMessage`, `decision`, `reason`, `additionalContext` (inside `hookSpecificOutput`). v0.2 hooks must NOT depend on `updatedToolOutput`. The Q1a agent claim that the field was added in v2.1.121 was incorrect; Q1b's correction (treat as undocumented) was right. Tracker row in `v2-research-plan.md` marked resolved.

### Methodology audit — 2026-05-02 — 12 sessions; methodology working; 4 minor refinements codified into `v2-research-plan.md`

Audit per the "every 3 sessions" trigger, run at the natural Q-research → Q-architecture boundary. **All 12 deliverables hit all 6 quality gates.** Strengths: source-conflict resolution rule fired correctly (caught and flagged the `updatedToolOutput` Q1a-vs-Q1b conflict); output-split pattern (paragraph + research file) scaled across 12 sessions; cross-cutting finding pattern proved the methodology's "refine as we go" attitude; "implications for downstream sessions" sub-section emerged organically and produced cleaner hand-offs. **Drift signals (4 minor refinements codified)**: (1) methodology visibility is reduced in parallel-batch responses; codified rule that user-facing message must enumerate framings + sources upfront. (2) "Implications for downstream sessions" sub-section codified as recommended pattern for synthesis sessions feeding ≥2 downstream sessions. (3) User-confirmation-gate hygiene — Q3c's "architecture is essentially decided" framing was borderline; codified rule that sessions upstream of user gates must enumerate options not collapse to verdicts. (4) Pending re-validations tracker added to `v2-research-plan.md` so flagged source-conflicts (currently: `updatedToolOutput`) don't get lost between flagging and resolution. **No methodology emergencies; no session needs redoing.** The methodology is working; minor codifications harden it for the upcoming Q5 + Q6 phases (where user gates and implementation correctness raise the stakes).

### Q3c — 2026-05-02 — Decision 13 partially superseded: bullets 2 + 3 fall (auto-invocation + cross-platform claims); bullets 1 + 4 stand. Decision #21 drafted in full

Full deliverable at [`research/Q3c-decision-13-reread.md`](research/Q3c-decision-13-reread.md). **Per-bullet verdict**: Bullet 1 (skills are the right primitive) STILL TRUE — hooks load and nudge; the skill body remains the IP. Bullet 2 (auto-invocation works when description is well-written) **SUPERSEDED — empirically false**, dogfood Probes 1, 2, 7 are the proof; the Phase 2 contingency the build plan documented (`docs/06-build-plan.md` line 60: *"Add SessionStart / Stop hooks in Phase 2 only if eval shows description-match alone is unreliable"*) has triggered. Bullet 3 (cross-platform — hooks are Claude-Code-specific) **SUPERSEDED — empirically inverted** by Q2 evidence; Cursor 1.7 (Sept 2025), Codex 0.124.0 (April 2026), Copilot CLI (Feb 2026), Gemini CLI all shipped stable hook systems with Claude-Code-compatible JSON-stdin/stdout contracts. Bullet 4 (hooks remain available for refusal) STILL TRUE — Decision 14 is unchanged. **The decision is partially, not fully, reversed.** Skill remains the IP. Hooks become the activation + nudging layer (per Q4a Sketch ii — structural pre-filter only, no content classification, preserving Decision 2 per Q3b). Decision #21 drafted in full inside the deliverable file with chose / alternatives / why / tradeoff / concrete-supersession / what-this-does-NOT-do sections, ready to land verbatim in `docs/08-design-decisions.md` as part of Q5c's change set. Phase 1 build plan + risks doc B8 + skill brief need parallel updates (Q9 work). The Q3 series is now complete; the v0.2 architecture line is locked.

### Q4b — 2026-05-02 — 6-type enum stays closed; trigger examples should widen with ~5 well-chosen new rows + an "examples are not exhaustive" framing line

Full deliverable at [`research/Q4b-long-tail-signal-coverage.md`](research/Q4b-long-tail-signal-coverage.md). Audit found ~10 long-tail signals (trivial-not-just-empty catches, ignored Promise rejections, Rust `todo!()`, Go `panic("not implemented")`, disabled lints, commented-out blocks, debug `console.log`, hardcoded values, mock implementations, race-workaround patterns) that are NOT in the current trigger table but **all map to existing types** (`hack-workaround`, `deferred-implementation`, `type-loosened`, `other`). **Verdict**: enum stays closed (per anti-instruction line 456); trigger examples widen with ~5 carefully-curated new rows + an explicit "examples are not exhaustive" framing line directly above the table. The widened SKILL body is the v0.2 mechanism for long-tail recall under Sketch (ii) (Q4a) — the agent reads English prose and applies judgment; the table is a starter set, not a closed checklist. Defer the contract.md threshold fix for `hack-workaround` and `other` to Q8 (minor finding disposition). Q7 should measure: % of captures going to `other` (>20% means enum is missing a real type → v0.3 conversation); recall lift from widened examples (<10% means SKILL body iteration alone isn't sufficient; Sketch (iv) becomes a candidate for long-tail specifically).

### Q3b — 2026-05-02 — Decision 2 binds against Sketch (iv) (prompt hook) — violates 2 of 6 why-bullets cleanly + 1 partially. Sketch (ii) only for v0.2; Sketch (iv) is a v0.3 escape hatch requiring an explicit decision-register supersession

Full deliverable at [`research/Q3b-decision-2-reread.md`](research/Q3b-decision-2-reread.md). Per-bullet verdict against Q4a's 4 sketches: **Sketch (i) and (ii) preserve all 6 bullets**; Sketch (iii) violates 2 cleanly + 3 partially (the codified May 1 anti-pattern); **Sketch (iv) violates bullet 3 ("no additional LLM cost") and bullet 4 ("no prompt to maintain") cleanly + bullet 1 ("perfect intent-context in real time") partially.** Q4a's three hand-off questions answered: (1) "no separate classifier" means "no separate prompt invocation that exists primarily to classify" — Sketch (iv) inherits 2 of 3 disqualifying properties from Decision 2's rejected alternative (separate + classifier); same model is not the load-bearing factor. (2) The "no additional LLM cost" bullet binds unambiguously against Sketch (iv) — 50+ Edit/Write/MultiEdit calls per session = 50+ extra LLM calls, even if cheap. (3) "Perfect intent-context in real time" is partially weakened against Sketch (iv) — real-time preserved, intent-context partial (hook sees diff + skill rules but not user conversation). **Net for v0.2**: Sketch (ii) only. Sketch (iv) becomes the v0.3 escape hatch IF v0.2 re-dogfood shows Sketch (ii) compliance below threshold (~80%) — would require new decision-register entry superseding bullets 3 + 4 of Decision 2 with the empirical compliance data as justification.

### Q4a — 2026-05-02 — The classification line: WHICH events fire = mechanical (hook owns it); WHAT the event means = interpretive (agent owns it). Recommend Sketch (ii) — structural pre-filter, no content classification

Full deliverable at [`research/Q4a-classification-line.md`](research/Q4a-classification-line.md). Three sketches evaluated: **(i) no filter** (✓ Decision 2 preserved; noisy — fires on generated/fixture files too); **(ii) structural pre-filter on path + gitignore** (✓ Decision 2 preserved; the structural filter is the same category of mechanical work the matcher itself does); **(iii) regex pre-classification** (✗ Decision 2 violated — this was the May 1 sloppy path; codified here as the anti-pattern). Bonus **(iv) `type: "prompt"` hook** — a third path Decision 2 didn't anticipate (Q1b discovery): hook invokes the model to do classification, but the model IS the agent's same model. **Provisional verdict 🟡 — plausibly Decision 2-compliant; Q3b validates against full decision context.** **Recommendation: Sketch (ii)** for v0.2 — preserves Decision 2 unambiguously, preserves long-tail signal coverage (the user's earlier concern), avoids regex-rot maintenance, keeps cost flat. The line restated: *WHICH events fire = mechanical (hook owns it). WHAT the event means = interpretive (agent owns it).* Sketch (iv) is the escape hatch if v0.2 dogfood shows (ii)'s "agent must remember to look" produces low compliance — defer to v0.3 unless evidence forces it earlier.

### Q3a — 2026-05-02 — Decision 1 (markdown not SQLite) fully preserved by all v0.2 candidate architectures; strengthened, not weakened, by Q1+Q2 evidence

Full deliverable at [`research/Q3a-decision-1-reread.md`](research/Q3a-decision-1-reread.md). All 6 bullets of Decision 1 (5 why + 1 tradeoff) verdict: **STILL TRUE** across candidate architectures A/B/C/D. The "Agent-native + AGENTS.md / CLAUDE.md / .cursor/rules / copilot-instructions.md convention" bullet is *strengthened* by Q2 evidence (60k+ OSS projects on AGENTS.md, native or community-supported across all 6 surveyed platforms — what the original decision called "every coding agent now expects" is empirically validated stronger than at decision time). Subtle nuance: PostToolUse hook (in any architecture using it) will parse `.un-punt/items/*.md` via shell — **not a Decision 1 violation** since the decision prohibits SQLite as storage substrate, not non-agent parsing of the markdown substrate. The minor line-drift finding from dogfood Day 3 can be addressed via additive markdown frontmatter (e.g., `last_verified_at:`) without any storage-model change. **No Decision 1 amendment needed in the v0.2 design-register entry.**

### Q1b — 2026-05-02 — 10 hook intents map to a small set of mechanisms; `additionalContext` is the workhorse, `decision: "block"` blocks specific actions, `continue: false` halts session

Full deliverable at [`research/Q1b-hook-output-mechanisms.md`](research/Q1b-hook-output-mechanisms.md). For un-punt's v0.1 dogfood failures, **non-blocking `additionalContext` injection is the right primitive** — no `decision: "block"` needed for capture/suggestion fixes (we don't want to block the user's flow; we want to ensure Claude sees the right context). `systemMessage` (user-facing) and `additionalContext` (Claude-facing) are distinct channels and can coexist. Command and prompt hooks support the same output mechanisms; only invocation differs. **One source-conflict flagged for re-validation**: Q1a's agent claimed `updatedToolOutput` was added to PostToolUse in v2.1.121; Q1b's same agent now reports the mechanism is undocumented. Treat as undocumented for v0.2 purposes; manually re-verify against canonical docs URL before any v0.2 architecture relies on it. No constraint binding this session — pure capability discovery.

### Q1c — 2026-05-02 — Skill-direct vs marketplace install patterns differ in hook auto-discovery and `${CLAUDE_PLUGIN_ROOT}` availability; recommendation is to stay skill-direct + extend CLI for v0.2

Full deliverable at [`research/Q1c-install-paths.md`](research/Q1c-install-paths.md). **Marketplace plugins** get hook auto-discovery from `hooks/hooks.json` and `${CLAUDE_PLUGIN_ROOT}` substitution; **skill-direct installs** (un-punt's current path via `packages/cli/run.sh install`) require the CLI to merge a `hooks` block into the user's `~/.claude/settings.json`, with absolute paths in hook commands. Recommended for v0.2: **stay skill-direct + extend the CLI** to merge `hooks` block exactly the way `permissions.{allow,ask,deny}` are already merged. Reasoning: zero new infrastructure (preserves Decision 4/13/15), faster v0.2 iteration (no marketplace publish step), cross-platform-friendlier (each platform's adapter ships its own CLI; marketplace would be Claude-Code-specific). Mechanically a small change (~30 LOC in `install.ts` + matching `uninstall.ts` + new `added_hooks` manifest field). Convert to marketplace plugin in v0.3 if discoverability friction surfaces.

### Q2a — 2026-05-02 — Codex shipped near-identical hook system to Claude Code (CLI 0.124.0, April 2026 stable); un-punt ports cleanly; Stop semantics actually *better* than Claude Code's

Full deliverable at [`research/Q2a-codex-analogues.md`](research/Q2a-codex-analogues.md). All needed events present: `SessionStart` (matchers `startup`/`resume`/`clear`), `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, plus Codex-specific `PermissionRequest`. Codex's `Stop` semantics are inverted from Claude Code (`decision: "block"` *continues* the turn as a continuation prompt) — this is **better** for un-punt's wrap-up offer than Claude Code's equivalent. Plugin manifest at `.codex-plugin/plugin.json` with `hooks/hooks.json` auto-discovery; AGENTS.md is the cross-tool primer (this repo already uses it via `CLAUDE.md` symlink). Known caveat: Codex's `PreToolUse` "doesn't intercept all shell calls yet" — affects refusal-layer completeness but not core capture/suggestion flow. **Major implication**: the May 1 concern that "hooks are Claude-Code-only" is empirically wrong — hooks are now cross-platform. Decision 13's underlying assumption needs explicit revisiting in Q3c.

### Q2b — 2026-05-02 — Cursor 1.7 shipped hooks (Sept 2025) and Cursor 2.4 shipped Skills using the SAME `SKILL.md` open standard as Claude Code (Jan 2026); un-punt's skill body ports unchanged

Full deliverable at [`research/Q2b-cursor-analogues.md`](research/Q2b-cursor-analogues.md). 17 hook events vs Claude Code's ~18; same JSON-stdin/JSON-stdout contract; supports both command and prompt-based hooks. Direct event analogues for everything un-punt needs (`sessionStart`, `beforeSubmitPrompt`, `preToolUse`, `postToolUse`, `stop`) plus Cursor-specific bonuses (`afterFileEdit` is a *cleaner* capture surface than Claude Code's `PostToolUse`-with-matcher; `beforeShellExecution` and `beforeMCPExecution` are first-class). Configuration at `.cursor/hooks.json` + `.cursor/skills/` + `.cursor/commands/` + AGENTS.md. **`cursor.json` does NOT exist** as a config file — design must avoid relying on it. **Most important finding**: Cursor 2.4's adoption of the SKILL.md open standard means `core/skill/SKILL.body.md` ships unchanged to Cursor (and Codex per Q2a), making un-punt genuinely cross-platform at the IP layer (Decision 4 strengthened). Worth flagging in Q5c that the v0.2 architecture should be designed against the Cursor primitive surface and adapted *down* to Claude Code's, not the other way around.

### Q2c — 2026-05-02 — Tiered adapter strategy emerges: Tier 1 full hooks (Claude Code, Cursor, Codex, Gemini CLI, Copilot VS Code), Tier 2 partial (Copilot CLI), Tier 3 primer-only (Aider); AGENTS.md is the universal floor

Full deliverable at [`research/Q2c-other-platforms.md`](research/Q2c-other-platforms.md). **Gemini CLI** has arguably *richer* hook surface than Claude Code — 11 events including LLM-loop hooks (`BeforeModel`/`AfterModel`/`BeforeToolSelection`) Claude Code lacks. **Copilot CLI** GA'd Feb 2026; same hook config works in CLI and VS Code with case-conversion; CLI side is thinner (deny-only PreToolUse, no prompt/result modification). **Aider** has essentially no general-purpose hooks — only `--auto-lint` and `--auto-test` post-edit; un-punt would ship a `read: AGENTS.md` primer in `.aider.conf.yml` as Tier 3 fallback with no dynamic refusal/capture. **Universal conventions across all 6 surveyed platforms**: AGENTS.md (60k+ OSS adoption), JSON-over-stdin hooks (where present), MCP for tools-not-events (Aider abstains). Recommended adapter strategy is **tiered** — full hooks for Tier 1, partial for Tier 2, primer-only for Tier 3 — with the AGENTS.md primer as the universal floor that even Aider honors. This makes v0.2's cross-platform thesis genuinely shippable, not aspirational.

---

## Cross-cutting finding from Q1+Q2 batch (2026-05-02)

**The "hooks are Claude-Code-only" concern that derailed the May 1 implementation is empirically wrong as of April 2026.** Cursor (Sept 2025), Codex (April 2026), Copilot (Feb 2026), and Gemini CLI all shipped stable hook systems with Claude-Code-compatible JSON-stdin/JSON-stdout contracts. Cursor and Codex additionally share Claude Code's SKILL.md open standard, making the un-punt skill body genuinely portable. Aider remains the lone holdout (Tier 3 primer-only fallback). The v0.2 architecture decision (Q5c) should treat hooks as **a portable abstraction with platform-specific registration files**, not a Claude-Code lock-in. This is the single most important finding from the Q1+Q2 batch and reshapes the architectural option space significantly.

---

### Q1a — 2026-05-02 — Claude Code emits 18 hook events, with two type modes (`command` and `prompt`) and two config formats (plugin `hooks.json` vs settings.json direct)

Full catalog at [`research/Q1a-hook-events-catalog.md`](research/Q1a-hook-events-catalog.md). Events most directly addressing the v0.1 dogfood-failure probes: **SessionStart** (probes 1, 2, 7 — fires unconditionally on session start, supports `additionalContext` injection), **PostToolUse** with `matcher: "Edit|Write|MultiEdit"` (probe 4 — fires after every file write, supports `additionalContext`), **UserPromptSubmit** (probes 6, 8 — fires before Claude reads the user's prompt, supports `additionalContext` and `decision: block`). Most architecturally significant discovery: hooks can be `type: "prompt"` (supported on Stop, SubagentStop, UserPromptSubmit, PreToolUse) which runs the model on the hook input rather than a shell script — this preserves "agent is the engine" (Decision 2) while still firing at deterministic events, directly addressing the regex-classifier concern that derailed the May 1 implementation attempt. Plugin hooks live in `hooks/hooks.json` with a `{"hooks": {...}}` wrapper and reference scripts via `${CLAUDE_PLUGIN_ROOT}`; user/settings hooks live directly under `~/.claude/settings.json` keys. Hook lifecycle is load-on-session-start (no hot-swap; iteration requires restart) and parallel execution (hooks for the same event run independently). Catalog dated 2026-05-02 against Claude Code v2.1.126; canonical docs at https://code.claude.com/docs/en/hooks.md. Sources: `claude-code-guide` agent + `plugin-dev:hook-development` skill, with one minor citation conflict (agent enumerates `PostToolUseFailure`/`StopFailure` separately; skill collapses these) — defer to canonical docs URL for disputed details. No constraint-check verdict this session — research catalog only; constraints bind in Q5c.

---

## Living section: Decisions taken (numbered for the design register)

> Each architectural change that lands gets a one-line entry here, AND a full entry in `docs/08-design-decisions.md`. This section is the index; that file is the register.

*(empty — no decisions taken yet)*
