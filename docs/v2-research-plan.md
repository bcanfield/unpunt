# un-punt v0.2 — research plan

> **Status: living plan.** Companion to [`v2-plan.md`](v2-plan.md). v2-plan is the *strategic* doc (what we're deciding); this is the *execution* doc (how we research each decision, session-by-session).
>
> **Bar this plan exists to enforce**: every architectural decision in v0.2 is grounded in cited research, not improvised reasoning. The May 2026 dogfood produced one foundation finding from rigorous probes; v0.2 should be built with the same rigor or better.

---

## Methodology principles (how every session must run)

Six principles. Skip any of them and the session is "sloppy" by definition.

1. **One question per session.** A session that tries to answer two questions answers neither well. If a session uncovers a second question, that's a new session — capture and defer.
2. **Sources before opinions.** Every claim in the deliverable cites a source: a doc URL, a file path + line, an agent's response, a plugin example. If you can't cite it, don't claim it.
3. **Constraints check before completion.** Every session ends with an explicit pass against the [non-negotiables in v2-plan.md](v2-plan.md#constraints--non-negotiables). A research outcome that violates one without explicit acknowledgement is the failure mode this plan exists to prevent.
4. **"What would change my mind" stated explicitly.** Every conclusion includes 1–2 sentences on what evidence would invalidate it. This forces honest uncertainty quantification and gives future-you a clean way to reopen the question if conditions change.
5. **Read-only by default.** Research sessions do not edit code. Drafts of code are research artifacts (fine to write, fine to discard); they are not commits, are not built, are not installed. Implementation comes only after Q5 produces an architecture decision.
6. **Outcome lands in v2-plan.md "Research outcomes" section.** One paragraph per completed session. The plan is the canonical record. Conversation context evaporates; the doc persists.

If a session is in trouble — running long, scope creeping, hitting an unknown — **stop and split it into sub-sessions** rather than push through.

---

## Per-session structure template

Every research session, regardless of question, runs through this 7-step skeleton:

```
1. FRAME            — restate the question in one sentence; scope explicitly
2. SOURCES          — list every source to consult before starting
3. READ             — work through sources in order, capturing quotes/citations
4. SYNTHESIZE       — answer the question using only what was cited
5. CONSTRAINTS CHECK — pass against v2-plan.md non-negotiables
6. CHANGE-MY-MIND   — what evidence would invalidate this conclusion
7. RECORD           — append paragraph to v2-plan.md "Research outcomes"
```

For implementation sessions (Q6 only), steps 1–6 stay the same; step 7 becomes:
- 7a. Implement narrowly (one chunk only)
- 7b. Test locally (smoke test before any cross-system effects)
- 7c. Mark the chunk's task completed

---

## Quality gates (what every session deliverable must contain)

A session is not "done" until its deliverable shows all six:

| Gate | What it looks like in the deliverable |
|---|---|
| **Citations** | Every factual claim has an inline reference (URL, file path, agent name) |
| **Constraint pass** | Explicit table or list confirming the conclusion respects (or knowingly violates with rationale) each non-negotiable |
| **Cross-platform check** | Explicit statement of how the conclusion plays on Codex/Cursor/Copilot in addition to Claude Code |
| **Change-my-mind** | 1–2 sentences naming the evidence that would reopen this question |
| **Risks surfaced** | At least one risk dimension (perf, cost, UX, maintainability, lock-in) considered |
| **Recorded** | Outcome paragraph in v2-plan.md, dated, with one-line headline |

If a deliverable is missing a gate, the session is incomplete — finish it before moving to the next session.

---

## Session catalog

The high-level Q1–Q8 from v2-plan decompose into the sessions below. Some Q's are atomic (one session covers them); most decompose into 2–4 focused sub-sessions.

**Notation**:
- **Owner**: who runs the session — `agent:<name>` (sub-agent does the work, returns summary), `claude` (this conversation does the work), `user` (requires human judgment / external access)
- **Mode**: `research` (read-only) | `synthesis` (combine prior research) | `implementation` (writes code)
- **Depends on**: prior sessions whose outcomes are required input
- **Parallel-with**: sessions that can run concurrently

---

### Q1 — Claude Code hook surface

#### Q1a — Hook events catalog
- **Question**: What hook events does Claude Code emit, with what semantics, and what input schema does each receive?
- **Sources**: `claude-code-guide` agent, `plugin-dev:hook-development` skill, https://docs.claude.com/en/docs/claude-code/hooks (or current canonical URL — agent will confirm)
- **Deliverable**: table of events × (when fires, input JSON shape, output JSON shape, expected exit codes, blocking vs non-blocking)
- **Owner**: agent:claude-code-guide
- **Mode**: research
- **Depends on**: nothing
- **Parallel-with**: Q1b, Q1c, Q2a, Q2b, Q2c

#### Q1b — Hook output mechanisms
- **Question**: What ways can a hook script communicate with the agent — `additionalContext`, `decision: block`, stderr, exit codes — and when is each appropriate?
- **Sources**: same as Q1a
- **Deliverable**: decision tree: "if you want X behavior → use Y mechanism"
- **Owner**: agent:claude-code-guide
- **Mode**: research
- **Parallel-with**: Q1a, Q1c, Q2a, Q2b, Q2c

#### Q1c — Plugin install vs skill-direct paths
- **Question**: How are hooks registered when un-punt is installed via `packages/cli/run.sh install` (skill-direct copy to `~/.claude/skills/`) vs via `/plugin install` (marketplace)? Different settings.json blocks? Different path resolution? `${CLAUDE_PLUGIN_ROOT}` availability?
- **Sources**: `claude-code-guide` agent, `plugin-dev:plugin-structure` skill, `packages/cli/src/install.ts` (already read), Anthropic plugin examples in marketplaces
- **Deliverable**: comparison: skill-direct hook registration vs marketplace hook registration; recommendation for un-punt
- **Owner**: agent:claude-code-guide
- **Mode**: research
- **Parallel-with**: Q1a, Q1b, Q2a, Q2b, Q2c

#### Q1d — Performance + bypass-mode + edge cases
- **Question**: What's a sensible latency budget per hook? What happens to hooks under `--dangerously-skip-permissions` (decision 14 says they're disabled — confirm)? Other failure modes (missing python3, slow git, etc.)?
- **Sources**: `claude-code-guide` agent, GH issues referenced in decision 14 (#39523, #18846, #41615), web search for plugin perf reports
- **Deliverable**: list of failure modes + mitigation for each
- **Owner**: agent:claude-code-guide
- **Mode**: research
- **Depends on**: Q1a (need event catalog to discuss per-event budgets)

#### Q1e — Idiomatic patterns from real plugins
- **Question**: What do 3–5 well-built plugins (Anthropic's own + popular community) actually use hooks for? Are there idioms we should follow vs anti-patterns?
- **Sources**: Anthropic's official plugin marketplace at `~/.claude/plugins/marketplaces/claude-plugins-official/`, plus 2–3 community plugins via web search
- **Deliverable**: per-plugin one-paragraph description of what hooks they use and why; cross-cutting patterns/anti-patterns identified
- **Owner**: agent:general-purpose (plugin code reading) + claude (synthesis)
- **Mode**: research
- **Depends on**: Q1a (need event catalog as vocabulary)

---

### Q2 — Cross-platform analogues

#### Q2a — Codex hook analogues
- **Question**: Does Codex have hook events comparable to Claude Code's PostToolUse / SessionStart / UserPromptSubmit? If not, what mechanisms achieve similar behavior (AGENTS.md, slash commands, MCP)?
- **Sources**: web search for Codex plugin docs / extension API / AGENTS.md spec, `docs/09-adapters.md` (un-punt's existing Codex thinking)
- **Deliverable**: matrix of Claude Code hook events × Codex equivalent (or "no equivalent" + rationale)
- **Owner**: agent:general-purpose (web search + doc read)
- **Mode**: research
- **Parallel-with**: Q1a, Q1b, Q1c, Q2b, Q2c

#### Q2b — Cursor hook analogues
- **Question**: Same as Q2a, for Cursor (`.cursorrules`, `cursor.json`, MCP integration, custom commands)
- **Sources**: web search for Cursor docs, Cursor plugin examples
- **Deliverable**: same shape as Q2a
- **Owner**: agent:general-purpose
- **Mode**: research
- **Parallel-with**: Q1a, Q1b, Q1c, Q2a, Q2c

#### Q2c — Copilot / Gemini-CLI / others
- **Question**: Same as Q2a, for any other agent platforms our target audience uses (GitHub Copilot in IDE/CLI, Gemini CLI, Aider)
- **Sources**: web search per platform
- **Deliverable**: same shape as Q2a; coverage matrix per platform
- **Owner**: agent:general-purpose
- **Mode**: research
- **Parallel-with**: Q1a, Q1b, Q1c, Q2a, Q2b

#### Q2d — AGENTS.md as a cross-platform primer
- **Question**: AGENTS.md is the emerging convention every agent reads — does it work as a cross-platform mechanism for un-punt's session-start primer? What are its limits (no hook semantics, just text, but text the agent reads every turn)?
- **Sources**: agents.md spec (web), claude-code-guide agent, examples in this repo's CLAUDE.md (which is symlinked to AGENTS.md)
- **Deliverable**: AGENTS.md capability assessment vs un-punt's needs (load on session-start ✓, fire on tool calls ✗, fire on user prompt ✗) + recommendation
- **Owner**: agent:general-purpose + claude
- **Mode**: research
- **Depends on**: Q2a, Q2b, Q2c (need to know what each platform reads)

---

### Q3 — Re-read decisions 1, 2, 13 against dogfood evidence

#### Q3a — Decision 1 (markdown not SQLite)
- **Question**: Does any v0.2 candidate architecture imply moving away from markdown? Or do all options preserve it?
- **Sources**: `docs/08-design-decisions.md` lines 17–32; cross-reference with Q1 hook output mechanisms (do hooks need state? do they need a DB?)
- **Deliverable**: per-bullet verdict: "still true / partially true / superseded by evidence"
- **Owner**: claude
- **Mode**: synthesis
- **Depends on**: Q1, Q2

#### Q3b — Decision 2 (agent is engine, no separate classifier)
- **Question**: Does any v0.2 candidate architecture introduce a separate classifier? Where's the line between "hook prompts agent to detect" (agent stays the engine) and "hook detects, agent acts on findings" (classifier reintroduced)?
- **Sources**: `docs/08-design-decisions.md` lines 34–49; the Q4 sub-session output (when complete)
- **Deliverable**: same per-bullet verdict shape; explicit articulation of the agent/classifier line
- **Owner**: claude
- **Mode**: synthesis
- **Depends on**: Q1, Q4

#### Q3c — Decision 13 (skill not hooks for self-capture)
- **Question**: Decision 13 explicitly anticipated a Phase 2 hook-contingency trigger. Has that triggered? What's the minimum-superseding text for a new decision (#21)?
- **Sources**: `docs/08-design-decisions.md` lines 215–237; `docs/06-build-plan.md` Phase 1 + Phase 2; dogfood-log probe outcomes
- **Deliverable**: draft text of decision #21 (or whatever number) — chose / alternatives / why / tradeoff — that supersedes the relevant parts of #13 without invalidating the parts that still hold
- **Owner**: claude
- **Mode**: synthesis
- **Depends on**: Q1, Q2, Q3a, Q3b

---

### Q4 — Pattern detection vs interpretive judgment

#### Q4a — The classification line: terminology + worked sketches
- **Question**: At what point does a hook "do classification"? Sketch 3 hook designs at varying levels of pre-digestion: (i) "fire on every Edit, no filter, agent decides", (ii) "fire on every Edit to non-generated/non-gitignored files, agent decides", (iii) "fire on every Edit, hook greps for pattern set, agent acts on findings". For each, identify which side of decision 2's line it's on.
- **Sources**: `docs/08-design-decisions.md` decision 2; Q1 outcomes
- **Deliverable**: 3-sketch comparison + recommendation on which level survives decision 2
- **Owner**: claude
- **Mode**: synthesis
- **Depends on**: Q1, Q3b

#### Q4b — Long-tail signal coverage check
- **Question**: The skill body's 6-type enum + trigger table covers a known set of deferral signals. The dogfood didn't surface this question, but the user did: what about swallowed exceptions, mock implementations, hardcoded values, commented-out code, disabled lints, magic numbers? Is the enum a closed taxonomy or a starter set?
- **Sources**: `core/skill/SKILL.body.md` capture rules section; `docs/05-skill-brief.md` (the IP brief)
- **Deliverable**: list of "in the enum" vs "could-be-deferral but not in enum" signals, with judgment on whether to widen the enum, leave the agent to handle via `other` type, or accept as a known gap
- **Owner**: claude
- **Mode**: synthesis (no external research needed)
- **Depends on**: Q4a

---

### Q5 — Architecture decision

#### Q5a — Surface candidate architectures
- **Question**: Given Q1–Q4 outcomes, what architectures are on the table? List all serious candidates (likely 3–6) with one-paragraph descriptions
- **Sources**: Q1–Q4 outcomes; v2-plan.md "what we don't know" section
- **Deliverable**: list of candidate architectures, each named + described
- **Owner**: claude
- **Mode**: synthesis
- **Depends on**: Q1, Q2, Q3, Q4

#### Q5b — Per-architecture comparison matrix
- **Question**: For each Q5a candidate, evaluate against: solves probe 1? solves probe 4? solves probe 6/8? solves probe 7? cross-platform coverage? cost (LOC, complexity, maintenance)? risk dimensions? regression risk on what works today?
- **Deliverable**: comparison matrix; honest per-cell scoring; identification of frontier (which architectures are dominated by others)
- **Owner**: claude
- **Mode**: synthesis
- **Depends on**: Q5a

#### Q5c — Architecture decision + change set
- **Question**: Pick the architecture. Enumerate exactly what files change, what decisions extend/supersede, what cross-platform implications get explicitly accepted
- **Deliverable**: architecture decision (1–2 paragraphs) + change set (file-by-file) + new decision-register entry text
- **Owner**: claude proposes, **user confirms**
- **Mode**: synthesis
- **Depends on**: Q5b

---

### Q6 — Implementation (one chunk per session)

The chunk list is a Q5c output. Until Q5c lands, this section is a placeholder. Each chunk gets a session in this shape:

#### Q6.<n> — <chunk name>
- **Question**: How do we implement <chunk> correctly?
- **Sources**: relevant existing files in this repo (read first); Q5c change set
- **Deliverable**: implemented + smoke-tested chunk
- **Owner**: claude
- **Mode**: implementation
- **Depends on**: Q5c, prior Q6.<n-1>

Quality gates for implementation sessions add:
- **Smoke-tested locally** (the chunk does what it claims in isolation)
- **Doesn't break existing tests** (run `pnpm test` / `pnpm typecheck` / `pnpm lint`)
- **Edits respect the v2-plan constraints** (cross-platform, agent-as-engine, etc.) — same constraint check as research sessions

---

### Q7 — Re-dogfood validation

#### Q7a — Validation script design
- **Question**: What's the smallest reliable script that uninstalls v0.1, reinstalls v0.2, and walks the user through the probe re-runs?
- **Sources**: `packages/cli/src/install.ts`, `uninstall.ts`; v2-plan validation plan section
- **Deliverable**: a single shell script + checklist for the user
- **Owner**: claude
- **Mode**: implementation
- **Depends on**: Q6 complete

#### Q7b — Probe re-runs in punt-board
- **Question**: Do probes 1, 4, 6, 7, 8 now pass post-v0.2?
- **Sources**: punt-board repo at `/Users/bcanfield/Documents/Git/un-punt-dashboards`; dogfood-log.md as the format spec for outcomes
- **Deliverable**: dogfood-log entries for Probes 9–14 (re-runs); pass/fail per probe with evidence
- **Owner**: **user** runs the probes; claude observes + records
- **Mode**: validation
- **Depends on**: Q7a

#### Q7c — Regression checks
- **Question**: Did v0.2 break anything that worked in v0.1 (cold-start, sweep planning, refusal logic)?
- **Sources**: v0.1 dogfood-log entries for the working-finding probes
- **Deliverable**: per-regression-check pass/fail entry in dogfood-log
- **Owner**: user runs; claude observes + records
- **Mode**: validation
- **Depends on**: Q7a

---

### Q8 — Minor findings disposition

#### Q8a — Per-finding judgment
- **Question**: For each of the 6 minor findings (contract type vocab mismatch, top-3-areas double-count, uniform 0.4 confidence, refused-section enumeration gaps, line-drift in items, others surfaced during research), is the right call: fix in v0.2, defer to v0.3, or accept as known limitation?
- **Sources**: dogfood-log "Minor findings" section; Q5c chosen architecture (some may be implicit)
- **Deliverable**: per-finding verdict with one-line rationale
- **Owner**: claude proposes, **user confirms**
- **Mode**: synthesis
- **Depends on**: Q5c

#### Q8b — Implementation chunks for Q8a "fix in v0.2" verdicts
- One Q6-style implementation session per fix-in-v0.2 finding

---

## Cross-cutting review sessions

These are not tied to a specific Q; they re-evaluate the work in flight. Run on schedule, not on demand.

### After every 3 sessions — methodology audit
- **Question**: Are we following the per-session structure? Are deliverables hitting all 6 quality gates? Is anything getting sloppy?
- **Owner**: claude (with explicit user check-in)
- **Output**: 1-paragraph note in v2-plan "Research outcomes" if anything needs adjusting

### After Q5c (architecture decided) — adversarial review
- **Question**: What are the worst-case failure modes of the chosen architecture? Plant ourselves as a hostile reviewer trying to break the design. What CAN'T it handle? What edge cases (Windows, no-python3 systems, unusual repo structures, very large repos, monorepos, gitless directories, symlinks, NFS) might fail?
- **Owner**: agent:general-purpose with adversarial prompt
- **Output**: list of failure modes; per-mode "accepted as known limitation / mitigated in v0.2 / deferred to v0.3"
- **Depends on**: Q5c

### After Q6 complete (before Q7) — best-practices retrospective
- **Question**: How does our v0.2 implementation compare to similar tools' implementations? Anything we should learn from before validation?
- **Sources**: re-survey the plugin examples from Q1e with the v0.2 design in mind
- **Owner**: agent:general-purpose
- **Output**: list of "things others do that we should consider" + "things we do that look unusual — justified or not"
- **Depends on**: Q6

### After Q7c (validation done) — launch-readiness review
- **Question**: Is v0.2 ready to ship? What's the launch story? What gets explicitly disclosed (e.g., cross-platform gaps if hooks-based)?
- **Sources**: dogfood-log v0.2 section, v2-plan, v2-research-plan
- **Output**: launch-readiness checklist + draft launch-story for `docs/launch-plan.md`
- **Depends on**: Q7c

---

## Dependency graph (visualized)

```
Parallel batch 1 (no deps):
  Q1a ─┐
  Q1b ─┤
  Q1c ─┤
  Q2a ─┼─→ all complete before next batch
  Q2b ─┤
  Q2c ─┘

Parallel batch 2 (depends on batch 1):
  Q1d ──→ depends on Q1a
  Q1e ──→ depends on Q1a
  Q2d ──→ depends on Q2a, Q2b, Q2c

Sequential:
  Q3a ──→ depends on Q1, Q2
  Q3b ──→ depends on Q1, Q4 (Q4a circular — see note)
  Q3c ──→ depends on Q1, Q2, Q3a, Q3b

  Q4a ──→ depends on Q1, decision-2 read
  Q4b ──→ depends on Q4a

  Q5a ──→ depends on Q1, Q2, Q3, Q4
  Q5b ──→ depends on Q5a
  Q5c ──→ depends on Q5b  ⚠️ USER CONFIRMATION GATE

Cross-cutting:
  Adversarial review ──→ depends on Q5c

Implementation:
  Q6.* ──→ depends on Q5c (one session per chunk)

Validation:
  Q7a ──→ depends on Q6 complete
  Q7b ──→ depends on Q7a  ⚠️ USER RUNS
  Q7c ──→ depends on Q7a  ⚠️ USER RUNS

Disposition:
  Q8a ──→ depends on Q5c  ⚠️ USER CONFIRMATION GATE
  Q8b.* ──→ depends on Q8a (one session per fix)

Cross-cutting:
  Best-practices retrospective ──→ depends on Q6
  Launch-readiness review ──→ depends on Q7c
```

**Note on Q3b ↔ Q4a circularity**: Q3b needs Q4's articulation of the agent/classifier line; Q4a needs Q3b's reading of decision 2. Resolution: Q4a runs first with a *provisional* read of decision 2 (just lines 34–49 of `docs/08-design-decisions.md`); Q3b then validates or revises Q4a's articulation against the full decision context.

**Sessions that can run in parallel**: ones in the same "Parallel batch" above. The first batch is 6 sessions; batch 2 is 3 sessions. Everything else is sequential or has user gates.

---

## User-confirmation gates (explicit)

Three points where the user MUST confirm before proceeding:

1. **After Q5c — architecture decision**. No implementation begins until the user signs off on the chosen architecture + change set + cross-platform implications.
2. **After Q8a — minor-findings disposition**. No fixes begin until the user signs off on the fix/defer/accept verdicts.
3. **Before Q7b — validation runs**. The user runs the probes (or grants explicit permission for me to run them), since validation lives in the punt-board repo and may have side effects.

Other points are optional check-ins; these three are mandatory.

---

## Anti-patterns (what NOT to do)

Lessons from the May 2026 sloppiness:

- ❌ **Batch implementation across multiple components in one session.** This is what caused the v0.1 hook draft to combine architecture decision + bash + python + JSON contracts + install logic + decision-register update in one go. Split.
- ❌ **Improvise a hook script from a half-remembered API surface.** Always read the canonical docs first via the appropriate agent.
- ❌ **Codify an example list as the canonical taxonomy.** The skill body's 6-type enum and trigger table are *examples*; codifying them in shell regex turns examples into the universe. Watch for this anywhere code is reading prose.
- ❌ **Solve the Claude Code problem and ignore Codex/Cursor.** Cross-platform check is a quality gate, not an optional consideration.
- ❌ **Skip the constraint check because "it's obvious."** It's never obvious until you've done it; "obvious" is how decisions get reversed without acknowledgement.
- ❌ **Push through a sloppy session.** Stop, split, restart. Sloppy sessions compound.

---

## Living section: Session log

> Append one row per completed session here. The "Outcome" link points to the paragraph in `v2-plan.md` "Research outcomes" section. This section is the audit trail.

| Session | Date | Owner | Status | Outcome |
|---|---|---|---|---|
| Q1a — Hook events catalog | 2026-05-02 | agent:claude-code-guide + Skill plugin-dev:hook-development + claude (synthesis) | ✓ completed | [v2-plan §Q1a](v2-plan.md#q1a--2026-05-02--claude-code-emits-18-hook-events-with-two-type-modes-command-and-prompt-and-two-config-formats-plugin-hooksjson-vs-settingsjson-direct) · full catalog: [research/Q1a-hook-events-catalog.md](research/Q1a-hook-events-catalog.md) |

---

## How to start a session

When you're ready to run a session, the prompt to me is:

> *"Run session Q<id> per `docs/v2-research-plan.md`."*

I'll then:
1. Restate the question + scope (frame)
2. List sources (sources)
3. Spawn relevant agents in parallel for the read steps
4. Synthesize results
5. Run constraints check + change-my-mind + risks
6. Append the outcome paragraph to v2-plan.md
7. Update the session log table here
8. Stop and ask: "next session, or break?"

If a session goes sideways (scope creep, new question discovered, source unclear), I stop and surface the situation rather than push through.
