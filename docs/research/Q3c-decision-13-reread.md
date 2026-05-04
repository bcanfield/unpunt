# Q3c — Decision 13 (skill not hooks for self-capture) re-read + Decision #21 draft

> Synthesis session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Owner: claude. Closes the Q3 series; produces the load-bearing supersession text for the v0.2 architecture decision.

## Question

Did Decision 13's Phase 2 hook-contingency trigger fire? What's the minimum-superseding text for Decision #21 — superseding only the parts the dogfood + Q1+Q2 empirically refute, preserving the parts that still hold?

## Decision 13 verbatim (from `docs/08-design-decisions.md` lines 215–237)

> **Chose**: Triggering happens via the skill's `description` field — Claude reads it on every turn and auto-invokes when a deferral signal matches. No `PostToolUse` hook for capture.
>
> **Alternatives**: A `PostToolUse` / `Stop` hook that scans tool output for deferral patterns; a slash command users must remember.
>
> **Why**:
> 1. **Skills are the right primitive for "how to behave"** — hooks are deterministic event-driven scripts; skills are model-interpreted procedural knowledge.
> 2. **Auto-invocation works when the description is well-written** — Claude matches description against intent on every turn; this is the documented pattern.
> 3. **Cross-platform** — Cursor rules, Copilot instructions, and Codex all read markdown-with-trigger-description; hooks are Claude-Code-specific.
> 4. **Hooks remain available for refusal** — see decision 14.
>
> **Tradeoff**: skill description must be calibrated; if it's vague, Claude won't invoke. Mitigated by golden-set evals.
>
> **Concrete failure modes documented April 2026** (see `07-risks-and-evals.md` B8):
> - The skill listing is truncated at `SLASH_COMMAND_TOOL_CHAR_BUDGET = 1,536 chars` (description + `when_to_use` combined). Trigger keywords past the budget are silently stripped.
> - Auto-compaction caps re-attached skills at 5,000 tokens each / 25,000 token shared budget. Long sessions can drop the skill body silently, breaking mid-session capture.
>
> **New frontmatter fields available** (April 2026):
> - `when_to_use` — separate field appended to `description` in the skill listing.
> - `paths` — glob patterns that path-scope auto-invocation.

## The Phase 2 contingency trigger

`docs/06-build-plan.md` line 60 explicitly anticipated this:

> *"**No hooks at MVP** — skill loads via description match. Add `SessionStart` / `Stop` hooks in Phase 2 only if eval shows description-match alone is unreliable."*

**The contingency has triggered.** The May 2026 punt-board dogfood is the eval. Probes 1, 2, 7 showed description-match auto-loading does not fire on coding-topic conversations. Per the build plan's own decision tree, this is the documented activation condition for hooks — not a Decision 13 reversal, but the Phase 2 contingency arriving early.

## Per-bullet verdict on Decision 13

| Bullet | Verdict | Justification |
|---|---|---|
| 1 — Skills are the right primitive for "how to behave" — model-interpreted procedural knowledge vs deterministic event scripts | ✓ **STILL TRUE** | v0.2 hooks do NOT replace the skill body. The skill remains the IP and the source of truth for behavior. Hooks are thin event-routing scripts that *load* the skill (SessionStart) and *nudge* the agent to apply it at the right moments (PostToolUse, UserPromptSubmit). Hooks teach nothing; the skill teaches. Decision 13's primitive distinction stands. |
| 2 — Auto-invocation works when the description is well-written | ✗ **SUPERSEDED — empirically false** | Dogfood Probes 1, 2, 7 (full record at [`../v0.2-dogfood-report.md`](../v0.2-dogfood-report.md)) showed description-match auto-loading does NOT fire on "build a webapp" coding-topic conversations even with a well-formed ~1,100-char description well within the 1,536-char budget. The agent's verbatim diagnostic response: *"No. I have it via your earlier message and my own searches in this session, not as a skill loaded into this Claude Code session."* The April 2026 amendment's `when_to_use` and `paths` mitigations were never empirically validated and likely don't address the core failure (description-match doesn't fire on coding topics regardless of description content). **The Phase 2 hook-contingency this bullet's failure was supposed to trigger has triggered.** |
| 3 — Cross-platform — Cursor/Copilot/Codex read markdown-with-trigger-description; hooks are Claude-Code-specific | ✗ **SUPERSEDED — empirically inverted** | Per Q2a (Codex CLI 0.124.0, April 2026 stable), Q2b (Cursor 1.7, Sept 2025 hooks GA + Cursor 2.4, Jan 2026 SKILL.md open standard), Q2c (Copilot CLI Feb 2026 + Gemini CLI hooks), **hooks are now THE cross-platform standard primitive**, not a Claude-Code lock-in. JSON-stdin/JSON-stdout contracts compatible across all 5 platforms with hooks (Claude Code, Cursor, Codex, Copilot, Gemini CLI). Aider lacks a hook system — primer-only fallback via AGENTS.md. The cross-platform argument that bullet 3 made AGAINST hooks is now an argument FOR them. |
| 4 — Hooks remain available for refusal — see Decision 14 | ✓ **STILL TRUE** | Decision 14 (revised May 2026) covers the refusal layer (`permissions.deny` + future `PreToolUse` hook). Decision #21 does not touch refusal. The capture/suggestion hooks added in v0.2 are orthogonal. |

**Net**: Decision 13's bullets 2 + 3 are superseded by empirical evidence. Bullets 1 + 4 still hold. The decision is **partially**, not fully, reversed. The skill remains the IP; hooks become the activation + nudging layer.

## Concrete failure modes section — re-evaluation

The April 2026 amendment listed two failure modes:

1. **1,536-char description budget truncation** — was a concern; not the cause of the v0.1 failure. The deployed description is ~1,100 chars (well under the budget). Truncation didn't happen; description-match still failed. **Confirms the failure isn't description content; it's the matcher's behavior on coding topics.**
2. **Auto-compaction drops skill body in long sessions** — relevant for the post-bootstrap silence (Probe 4 / Probe 6 in the dogfood). Hooks compensate by re-loading via SessionStart on session resume + injecting reminders at PostToolUse / UserPromptSubmit so the skill body's rules reach the agent even if compaction has dropped them.

The amendment's `when_to_use` and `paths` fields are deferred — they're cheap to try but their failure mode (described in this section) is unrelated to the core trigger Decision #21 addresses. v0.2 may add them as a low-confidence experiment alongside hooks; they don't replace hooks.

## Decision #21 — proposed text

**Format follows the project's `docs/08-design-decisions.md` template (chose / alternatives / why / tradeoff). For inclusion in `docs/08-design-decisions.md` after Decision #20.**

---

> ## 21. Hooks for skill activation + structural pre-filter (supersedes Decision 13 bullets 2 + 3)
>
> **Chose**: v0.2 ships **SessionStart**, **PostToolUse** (matcher: `Edit|Write|MultiEdit`), and **UserPromptSubmit** hooks per platform. Hooks are stateless event scripts that:
>
> 1. **Load the skill body into the agent's context on SessionStart** (regardless of description-match outcome) by emitting `hookSpecificOutput.additionalContext` containing the skill's activation reminder.
> 2. **Apply structural pre-filtering on PostToolUse** — skip files matching `__generated__/`, `node_modules/`, `dist/`, `.un-punt/`, `.next/`, `.venv/`, `__pycache__/`, gitignored paths — then emit `additionalContext` reminding the agent to inspect the diff and apply capture rules from the skill body. The hook does NOT pre-classify content (no regex over file contents; that would violate Decision 2 per Q3b).
> 3. **Detect wrap-up phrases on UserPromptSubmit** (`done`, `looks good`, `ship it`, `ready to ship`, `wrap up`, `switching to`, `moving on`, etc.) and emit `additionalContext` prompting the agent to offer a sweep per the skill's Suggestion rules section.
>
> The skill body at `core/skill/SKILL.body.md` remains the IP and the source of truth for behavior. Hooks do not classify content; the agent does. Hooks make the skill body's rules reach the agent reliably at the right deterministic events.
>
> Adapter coverage:
> - **Claude Code**: `~/.claude/settings.json` `hooks` block merged by the CLI install (extends the existing `permissions.{allow,ask,deny}` merge logic per `packages/cli/src/install.ts`); hook scripts in `~/.claude/skills/un-punt/hooks/`.
> - **Cursor**: `.cursor/hooks.json` registering the equivalent events (`sessionStart`, `afterFileEdit`, `beforeSubmitPrompt`); hook scripts share the same logic per platform.
> - **Codex**: `.codex-plugin/plugin.json` declaring the plugin; `hooks/hooks.json` auto-discovered.
> - **Copilot CLI** (Tier 2): `SessionStart` + `PreToolUse` (deny-only) only; capture nudge skipped due to `userPromptSubmitted` being read-only on CLI.
> - **Aider** (Tier 3): no hooks; AGENTS.md primer via `read: AGENTS.md` in `.aider.conf.yml`.
> - **AGENTS.md primer is the universal floor across all platforms** for graceful degradation.
>
> **Alternatives**:
> - **(Decision 13 path, now superseded for v0.2)**: rely on description-match auto-loading + agent vigilance during normal work. Empirically failed in May 2026 dogfood (Probes 1, 2, 7).
> - **Sketch (iii) from Q4a (rejected as Decision 2 violation)**: hook greps for capture-pattern set, agent acts on findings. Codified as the canonical anti-pattern at [`Q4a-classification-line.md`](../research/Q4a-classification-line.md). The May 1 implementation drift this entry exists to prevent.
> - **Sketch (iv) from Q4a (deferred to v0.3)**: `type: "prompt"` hook invokes the model for classification at each event. Per Q3b, violates Decision 2 bullets 3 + 4 (adds LLM cost; adds prompt to maintain). Available as escape hatch if v0.2 re-dogfood shows Sketch (ii) compliance < 60%; would require its own decision-register entry.
> - **`when_to_use` and `paths` frontmatter fields** (Decision 13 April 2026 amendment): low-cost description-match mitigations; can be added alongside hooks as defense-in-depth but do not address the core failure (description-match doesn't fire on coding topics).
> - **AGENTS.md primer alone** (no hooks): cross-platform-universal but doesn't address Probe 4 (post-load enforcement gap) — only addresses Probes 1, 2, 7 (auto-load gap). Insufficient.
>
> **Why**:
> - **Decision 13's bullet 2 was wrong empirically.** Per dogfood Probes 1, 2, 7: description-match auto-loading does not fire on coding-topic conversations even when the skill description is well-formed and within the 1,536-char budget. The Phase 2 contingency the build plan documented (`docs/06-build-plan.md` line 60: *"Add SessionStart / Stop hooks in Phase 2 only if eval shows description-match alone is unreliable"*) has triggered.
> - **Decision 13's bullet 3 was wrong empirically.** Per Q2 catalogs: Cursor 1.7 (Sept 2025), Codex 0.124.0 (April 2026), Copilot CLI (Feb 2026), and Gemini CLI all shipped stable hook systems with Claude-Code-compatible JSON-stdin/JSON-stdout contracts. Hooks are now THE cross-platform standard primitive, not a Claude-Code lock-in. AGENTS.md is the universal floor for the one platform without hooks (Aider).
> - **Decision 13's bullets 1 + 4 still hold.** Skill body is the IP; hooks remain available for refusal per Decision 14. Decision #21 does not touch these.
> - **Decision 2 preserved (Q3b verdict).** Sketch (ii) — structural pre-filter, agent does classification — preserves all 6 of Decision 2's why-bullets. Hooks route events; the agent classifies content. The temptation to have hooks "do the looking" (Sketch iii) was the May 1 sloppy path; Q4a codified it as the anti-pattern; Q3b ratified the structural-vs-content line.
> - **Decision 1 preserved (Q3a verdict).** Hooks parse `.un-punt/items/` markdown for state queries; this is not a Decision 1 violation since Decision 1 prohibits SQLite as the *storage substrate*, not non-agent processes parsing the markdown substrate.
> - **Two of v0.2's hook scripts (PostToolUse + UserPromptSubmit) are also paired with widened SKILL body trigger examples** per Q4b — adds ~5 carefully-curated long-tail signal rows + an explicit "examples are not exhaustive" framing line. The widened SKILL body is the v0.2 mechanism for long-tail recall under Sketch (ii); the hooks ensure the SKILL body's rules reach the agent reliably.
>
> **Tradeoff**:
> - **Hook configuration syntax differs per platform.** Adapter glue per platform (different registration files, slightly different event names, slightly different output schema variance per Q1b). The hook scripts themselves can be kept cross-platform; only the registration files differ.
> - **Sketch (ii)'s reliance on agent compliance is the same v0.1 risk** that Decision 2's tradeoff bullet acknowledged. Hooks reduce the gap (skill loaded reliably + reminders fired at the right events); they don't close it to zero. Q7 (re-dogfood validation) must measure compliance explicitly — not just "did capture happen?" but "did capture happen as a percent of capture-eligible events?"
> - **Hot-reload limitation**: per Q1a, hook configuration changes require Claude Code restart. Iteration during v0.2 dev is slower than skill-body-only changes were.
> - **Bypass mode (`--dangerously-skip-permissions`)**: hooks are silently disabled per Decision 14's GH-issues evidence. Bypass-mode users get the v0.1 experience. Document this as a known limitation alongside the existing Decision 14 framing.
> - **Tier 2 (Copilot CLI) and Tier 3 (Aider) users get progressively reduced UX.** Document the tiering in the launch story; do not over-promise.
> - **The `updatedToolOutput` mechanism on PostToolUse may or may not exist** (Q1b flagged a Q1a-vs-Q1b conflict). v0.2 hooks do not depend on it; if needed, manually re-validate against canonical docs URL.
>
> **Concrete supersession of Decision 13**:
> - Bullet 1 (skills are the right primitive): STILL HOLDS unchanged.
> - Bullet 2 (auto-invocation works when description is well-written): SUPERSEDED. Dogfood shows description-match doesn't fire on coding topics regardless of description quality. SessionStart hook compensates.
> - Bullet 3 (cross-platform — hooks are Claude-Code-specific): SUPERSEDED. Q2 evidence shows hooks are cross-platform standard.
> - Bullet 4 (hooks remain available for refusal): STILL HOLDS unchanged. Decision 14 covers refusal independently.
>
> **What this decision does NOT do**:
> - Does not reverse Decision 1 (markdown stays). Per Q3a.
> - Does not reverse Decision 2 (agent is engine). Per Q3b. Sketch (ii) is the explicit Decision-2-preserving design.
> - Does not reverse Decision 4 (skill is the IP). The skill body is unchanged in role; hooks are the activation/nudging layer.
> - Does not reverse Decision 13 fully — bullets 1 + 4 still hold.
> - Does not adopt `type: "prompt"` hooks (Sketch iv from Q4a). Deferred to v0.3 if needed.
> - Does not change the cold-start path. Cold-start via `/un-punt` worked perfectly in v0.1 dogfood (100% recall, 0 FP); preserve unchanged.
> - Does not address minor findings (contract type vocab, top-3-areas, line-drift, etc.). Q8 disposition.

---

## Constraints check

This session IS a constraint check on Decision 13. **Verdict**: bullets 2 + 3 are superseded with empirical justification (dogfood + Q2 catalogs). Bullets 1 + 4 stand unchanged.

| Other constraint | Implication |
|---|---|
| Decision 1 (markdown) | Preserved per Q3a. v0.2 hooks read markdown for state queries; not a violation. |
| Decision 2 (agent is engine) | Preserved per Q3b. Sketch (ii) — structural filter only — is the load-bearing choice. |
| Decision 4 (skill is the IP) | **Strengthened** by v0.2 design — the skill body is the authoritative source; hooks are thin shells. |
| Decision 14 (refusal layer) | Untouched. v0.2 capture/suggestion hooks are orthogonal to Decision 14's refusal hooks. |
| Decision 15 (plugin not MCP) | Untouched. Hooks are not MCP servers. |
| Cross-platform | **Strengthened** per Q2 evidence + AGENTS.md universal floor. |

## Change-my-mind

This conclusion would change if:

1. **A future Claude Code release fixes description-match auto-loading on coding topics.** Decision 13's bullet 2 might un-supersede. Hooks would still be useful for the wrap-up suggestion gap (Probe 6/8) and post-compaction recovery, so the decision wouldn't fully reverse.
2. **One of Cursor/Codex/Gemini deprecates its hook system.** Cross-platform argument weakens. No current signal of this. Watch changelogs.
3. **Sketch (ii)'s compliance in v0.2 dogfood is < 60%.** Sketch (iv) becomes the next escape hatch and Decision 2 needs additional supersession (per Q3b's deferred path).
4. **AGENTS.md adoption regresses.** Tier 3 fallback weakens. 60k+ OSS adoption + native support across all surveyed platforms makes this unlikely in v0.2 timeframe.

## Risks surfaced

- **Decision-register integrity**: Decision 13 is left as written but supersession is documented in #21 and via a forward-pointer comment. Future readers must understand the partial-reversal nature.
- **Phase 1 build plan needs update**: line 60's "No hooks at MVP" is no longer accurate. Q9 (build plan + risks + skill brief update) handles this.
- **Risks doc B8 row needs annotation as MATERIALIZED + mitigation**: Q9 work.
- **Cross-platform hook scripts**: writing one set of bash that works for Claude Code + Cursor + Codex requires careful handling of event-name differences, output-schema variance, and `${CLAUDE_PLUGIN_ROOT}` availability differences. Q6 implementation work.

## Implications for downstream sessions

- **Q5a** (architecture candidates): the architecture is essentially decided. Q5a enumerates the small remaining variations (e.g., do we ship Cursor + Codex adapters in v0.2 or only Claude Code?), but the core hook design is locked.
- **Q5b** (comparison matrix): one row per remaining variant; probably 2–3 rows total (Claude-Code-only v0.2 vs Claude-Code+AGENTS-fallback v0.2 vs Claude-Code+Cursor+Codex v0.2).
- **Q5c** (architecture decision + change set): user-confirmation gate. The change set is now well-defined: 3 hook scripts, 1 CLI extension (~30 LOC), SKILL body edits per Q4b, contract template fix per Q8, AGENTS.md primer template, plus the docs (Decision #21 + build plan + risks + skill brief).
- **Q6** (implementation): one chunk per change-set item. Depends on Q5c.
- **Q7** (re-dogfood validation): unchanged from v0.2-plan.md design. Must measure Sketch (ii) compliance percentage.
- **Q8** (minor findings disposition): unchanged. Now includes the contract template fix as a load-bearing dependency on Decision #21.
- **Q9** (build plan + risks + skill brief updates): well-defined. Update Phase 1 to reflect hooks-at-MVP per Decision #21; annotate B8 as MATERIALIZED; clarify skill brief that hooks are the activation layer.
