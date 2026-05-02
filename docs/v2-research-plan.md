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

### Deliverable size — when to split into a separate file

Q1a (the pilot) produced a ~400-line deliverable that doesn't fit the "one paragraph per session" v2-plan format. Codifying the pattern that worked:

- **If the deliverable fits in 1–2 paragraphs**: put it directly in `v2-plan.md` "Research outcomes" section. Done.
- **If the deliverable is bigger** (catalog, comparison matrix, design sketches, decision-register draft): write it to `docs/research/Q<id>-<slug>.md`, then **summarize in 1 paragraph** under v2-plan's "Research outcomes" with a link. The session log table in this doc gets a row pointing to both.

The full deliverable is the source of truth; the v2-plan paragraph is the digestible index entry.

### Source-conflict resolution

When two sources disagree on a fact (e.g., agent says event X has 18 entries; skill says 9):

1. **Default to the canonical/broader source** for catalogs (event lists, schema fields, capability surfaces).
2. **Default to the narrower/more-opinionated source** for idiomatic patterns (when to use what, common anti-patterns).
3. **Cite both sources** in the deliverable; explicitly call out the conflict in a sentence.
4. **For disputed details that affect a downstream architecture decision**: re-validate at the start of Q5c against the canonical docs URL.

Don't silently pick one source and discard the other — the disagreement is itself research signal.

### Constraint-check "N/A this session" is acceptable

Some sessions are pure capability discovery (Q1, Q2 series). They don't make architectural choices; they catalog what's possible. For these:

- Mark constraint-check rows as **"N/A this session — constraints bind in Q5c"** explicitly.
- Don't manufacture fake compliance statements when no constraint actually applies.
- Constraint-check failures only matter when a session is *proposing* (Q3, Q4 synthesis; Q5 architecture decision; Q6 implementation).

This avoids ritualistic check-the-box behavior that buries real signal.

### Methodology visibility in parallel-batch responses

When running 2+ sessions in a single response (parallel agent fan-out, or back-to-back synthesis like Q3b+Q4b), the 7-step structure is naturally baked into deliverable files but easy to compress out of the user-facing message. **Bar**: the user-facing message must at minimum enumerate framings + sources upfront for each session. Quality gates can be summarized at the end ("all 6 gates ✓ for both sessions") rather than enumerated per-session. The deliverable files remain the audit trail.

### "Implications for downstream sessions" sub-section

Recommended (not required) for synthesis sessions that hand off to or feed into subsequent Q-sessions. Concrete pattern: a final section listing each downstream session by ID with a one-sentence note on what this session's outcome locks in / unlocks for that session. Q3c → Q5a hand-off was materially cleaner because of this pattern. Add to deliverable when ≥2 downstream sessions are affected.

### User-confirmation-gate hygiene

When a session is upstream of a user-confirmation gate (Q5c, Q8a, pre-Q7b), the session must **enumerate options, not collapse to a verdict**. The user gate exists precisely to make the choice; pre-emptive collapse robs the user of the choice. Concrete rule: in Q5a (architecture candidates) and Q5b (comparison matrix), never write "the answer is X." Write "candidates A, B, C; matrix shows A dominates B; A and C are frontier options; user picks at Q5c." The Q3c deliverable's "the architecture is essentially decided" framing was borderline — acceptable for a decision-supersession session that's not directly upstream of the gate, but flagged here as the kind of phrasing to avoid when one step closer to the gate.

### Pending re-validations

When a session flags a fact for later re-validation (per the source-conflict resolution rule), add a row to the table below so it doesn't get lost in deliverable files. Each row: what to verify, who flagged it, what session needs the verification done before it.

| Item to re-verify | Source-conflict | Flagged by | Required-by session | Status |
|---|---|---|---|---|
| `updatedToolOutput` mechanism on PostToolUse — does it exist? | Q1a's agent claimed v2.1.121 added it; Q1b's same agent (continuation) reported it as undocumented | Q1b | Q5c (architecture decision) | ✓ resolved 2026-05-02 — WebFetch against canonical docs (https://code.claude.com/docs/en/hooks.md) confirms **NOT documented**. Q1b's reading was correct; Q1a's agent claim was wrong. PostToolUse JSON output fields: `continue`, `stopReason`, `suppressOutput`, `systemMessage`, `decision`, `reason`, `additionalContext` (inside `hookSpecificOutput`). No `updatedToolOutput`. v0.2 hooks must NOT depend on it. |

### Cross-cutting finding pattern

When 3+ sessions in a parallel batch surface a common load-bearing insight that doesn't fit cleanly into any single session's outcome paragraph, **write it as its own outcome paragraph** in `v2-plan.md` "Research outcomes" with a header like *"Cross-cutting finding from Q<batch> (date)"*, and add a corresponding row to this doc's session log marked **Cross-cutting**. Don't bury the synthesis in one of the contributing sessions — it will be invisible to future readers scanning by Q-number. The row's owner is `claude (synthesis across N sessions)`.

This pattern was adopted retroactively after the Q1+Q2 batch surfaced the "hooks are now cross-platform standard" finding that would otherwise have been distributed across 5 separate paragraphs.

### Agent reuse — prefer SendMessage over respawn

When multiple sessions consult the same source pool (e.g., Q1a, Q1b, Q1c all consult the `claude-code-guide` agent's reading of Claude Code docs):

1. **Spawn the agent ONCE in the first session** with a memorable `name` parameter for SendMessage routing.
2. **Continue via SendMessage** in subsequent sessions — the agent already has the docs in context; respawning makes it re-fetch.
3. **Spawn a fresh agent only when** the source pool genuinely differs (e.g., Q2a needs Codex docs, not Claude Code docs).

This was a Q1a oversight (no name set on initial spawn); fixed prospectively for Q1b and onward.

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
| Q1b — Hook output mechanisms decision tree | 2026-05-02 | agent:cc-docs (continued from Q1a) | ✓ completed | [v2-plan §Q1b](v2-plan.md#q1b--2026-05-02--10-hook-intents-map-to-a-small-set-of-mechanisms-additionalcontext-is-the-workhorse-decision-block-blocks-specific-actions-continue-false-halts-session) · full: [research/Q1b-hook-output-mechanisms.md](research/Q1b-hook-output-mechanisms.md) |
| Q1c — Plugin install vs skill-direct hook registration | 2026-05-02 | agent:cc-docs (continued from Q1a, combined with Q1b) | ✓ completed | [v2-plan §Q1c](v2-plan.md#q1c--2026-05-02--skill-direct-vs-marketplace-install-patterns-differ-in-hook-auto-discovery-and-claude_plugin_root-availability-recommendation-is-to-stay-skill-direct--extend-cli-for-v02) · full: [research/Q1c-install-paths.md](research/Q1c-install-paths.md) |
| Q2a — Codex hook analogues | 2026-05-02 | agent:codex-docs (general-purpose, web research) | ✓ completed | [v2-plan §Q2a](v2-plan.md#q2a--2026-05-02--codex-shipped-near-identical-hook-system-to-claude-code-cli-01240-april-2026-stable-un-punt-ports-cleanly-stop-semantics-actually-better-than-claude-codes) · full: [research/Q2a-codex-analogues.md](research/Q2a-codex-analogues.md) |
| Q2b — Cursor hook analogues | 2026-05-02 | agent:cursor-docs (general-purpose, web research) | ✓ completed | [v2-plan §Q2b](v2-plan.md#q2b--2026-05-02--cursor-17-shipped-hooks-sept-2025-and-cursor-24-shipped-skills-using-the-same-skillmd-open-standard-as-claude-code-jan-2026-un-punts-skill-body-ports-unchanged) · full: [research/Q2b-cursor-analogues.md](research/Q2b-cursor-analogues.md) |
| Q2c — Copilot/Gemini-CLI/Aider analogues | 2026-05-02 | agent:other-platforms (general-purpose, web research) | ✓ completed | [v2-plan §Q2c](v2-plan.md#q2c--2026-05-02--tiered-adapter-strategy-emerges-tier-1-full-hooks-claude-code-cursor-codex-gemini-cli-copilot-vs-code-tier-2-partial-copilot-cli-tier-3-primer-only-aider-agentsmd-is-the-universal-floor) · full: [research/Q2c-other-platforms.md](research/Q2c-other-platforms.md) |
| **Cross-cutting** — Q1+Q2 batch finding | 2026-05-02 | claude (synthesis across 5 sessions) | ✓ completed | [v2-plan §Cross-cutting finding from Q1+Q2 batch](v2-plan.md#cross-cutting-finding-from-q1q2-batch-2026-05-02) |
| Q3a — Decision 1 (markdown) re-read | 2026-05-02 | claude (synthesis) | ✓ completed | [v2-plan §Q3a](v2-plan.md#q3a--2026-05-02--decision-1-markdown-not-sqlite-fully-preserved-by-all-v02-candidate-architectures-strengthened-not-weakened-by-q1q2-evidence) · full: [research/Q3a-decision-1-reread.md](research/Q3a-decision-1-reread.md) |
| Q4a — Classification line + 3 hook design sketches | 2026-05-02 | claude (synthesis) | ✓ completed | [v2-plan §Q4a](v2-plan.md#q4a--2026-05-02--the-classification-line-which-events-fire--mechanical-hook-owns-it-what-the-event-means--interpretive-agent-owns-it-recommend-sketch-ii--structural-pre-filter-no-content-classification) · full: [research/Q4a-classification-line.md](research/Q4a-classification-line.md) |
| Q3b — Decision 2 (agent is engine) re-read + Q4a hand-off questions resolved | 2026-05-02 | claude (synthesis) | ✓ completed | [v2-plan §Q3b](v2-plan.md#q3b--2026-05-02--decision-2-binds-against-sketch-iv-prompt-hook--violates-2-of-6-why-bullets-cleanly--1-partially-sketch-ii-only-for-v02-sketch-iv-is-a-v03-escape-hatch-requiring-an-explicit-decision-register-supersession) · full: [research/Q3b-decision-2-reread.md](research/Q3b-decision-2-reread.md) |
| Q4b — Long-tail signal coverage check | 2026-05-02 | claude (synthesis) | ✓ completed | [v2-plan §Q4b](v2-plan.md#q4b--2026-05-02--6-type-enum-stays-closed-trigger-examples-should-widen-with-5-well-chosen-new-rows--an-examples-are-not-exhaustive-framing-line) · full: [research/Q4b-long-tail-signal-coverage.md](research/Q4b-long-tail-signal-coverage.md) |
| Q3c — Decision 13 re-read + Decision #21 supersession draft | 2026-05-02 | claude (synthesis) | ✓ completed | [v2-plan §Q3c](v2-plan.md#q3c--2026-05-02--decision-13-partially-superseded-bullets-2--3-fall-auto-invocation--cross-platform-claims-bullets-1--4-stand-decision-21-drafted-in-full) · full: [research/Q3c-decision-13-reread.md](research/Q3c-decision-13-reread.md) |
| **Methodology audit** — at Q-research → Q-architecture boundary | 2026-05-02 | claude (cross-cutting review) | ✓ completed | [v2-plan §Methodology audit](v2-plan.md#methodology-audit--2026-05-02--12-sessions-methodology-working-4-minor-refinements-codified-into-v2-research-planmd) — 4 refinements codified inline in this doc |
| `updatedToolOutput` re-validation | 2026-05-02 | claude (WebFetch against canonical docs) | ✓ completed | [v2-plan §updatedToolOutput re-validation](v2-plan.md#updatedtooloutput-re-validation--2026-05-02--confirmed-undocumented-q1bs-reading-was-correct) — tracker row updated above |
| Q5a — Architecture candidates enumeration | 2026-05-02 | claude (synthesis) | ✓ completed | [v2-plan §Q5a](v2-plan.md#q5a--2026-05-02--5-v02-architecture-candidates-enumerated-a-minimum-viable-claude-code-only-b-skillmd-adopters-claude-codecursorcodex-c-full-tiered-all-6-platforms-d-defense-in-depth-a-or-b--frontmatter-mitigations-e-agentsmd-primer-only--no-hooks) · full: [research/Q5a-architecture-candidates.md](research/Q5a-architecture-candidates.md) |
| Q5b — Comparison matrix + frontier identification | 2026-05-02 | claude (synthesis) | ✓ completed | [v2-plan §Q5b](v2-plan.md#q5b--2026-05-02--frontier-identified-a-b-c-e-d-dominated-the-choice-axis-how-much-to-ship-at-v02-vs-defer-to-v03--02x) · full: [research/Q5b-comparison-matrix.md](research/Q5b-comparison-matrix.md) |
| **Q5c — USER GATE — architecture decision** | 2026-05-02 | claude proposed; user confirmed (Candidate A) | ✓ completed | [v2-plan §Q5c](v2-plan.md#q5c--2026-05-02--user-gate-cleared--candidate-a-selected-claude-code-only-3-hooks-agentsmd-primer-future-lift-to-bc-documented-q6-chunked-into-6-implementation-sessions) · full: [research/Q5c-architecture-decision.md](research/Q5c-architecture-decision.md) |
| **Q8a — USER GATE — minor findings disposition** | 2026-05-02 | claude proposed; user confirmed (all as proposed) | ✓ completed | [v2-plan §Q8a](v2-plan.md#q8a--2026-05-02--user-gate-cleared--5-minor-findings-dispositioned-2-fix-in-v02-contract-template--confidence-promotion-docs-2-defer-to-v02xv03-top-3-areas--refused-section-enumeration-1-defer--known-limitation-line-drift) · full: [research/Q8a-minor-findings-disposition.md](research/Q8a-minor-findings-disposition.md) |
| **Q6.1 — Hook scripts (3 files)** | 2026-05-02 | claude (implementation) | ✓ completed | [v2-plan §Q6.1](v2-plan.md#q61--2026-05-02--hook-scripts-shipped-3-files-280-lines-bash-all-11-smoke-tests-pass-performance-180-355ms-per-hook-well-under-sub-second-budget-sketch-ii-compliance-verified) · files at `core/hooks/{session-start,post-tool-use,user-prompt-submit}.sh` |
| **Q6.2 — CLI hook-merging extension** | 2026-05-02 | claude (implementation) | ✓ completed | commit `be75cb7` |
| **Q6.3 — Adapter settings.json hooks + build artifact** | 2026-05-02 | claude (implementation) | ✓ completed | commit `7f9b6d2` |
| **Q6.4 — SKILL widening + confidence promotion** | 2026-05-02 | claude (implementation) | ✓ completed | commit `1db48a2` |
| **Q6.5 — Contract template type vocab fix** | 2026-05-02 | claude (implementation) | ✓ completed | commit `0b3e1cb` |
| **Q6.6 — AGENTS.md primer + Decision #21 + Phase 1 + B8 + skill brief** | 2026-05-02 | claude (implementation) | ✓ completed | commit `d70400d` · [v2-plan §Q6 series complete](v2-plan.md#q6-series-complete--2026-05-02--v02-implementation-shipped-across-6-chunks--6-commits--600-loc) |

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
