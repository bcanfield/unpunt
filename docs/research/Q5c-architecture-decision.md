# Q5c — v0.2 architecture decision + change set

> Synthesis session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Owner: claude proposed, **user confirmed**.

## User-gate inputs (verbatim)

> 1. *not much value [in cross-platform v0.2] - i would like to do claude code first*
> 2. *no [cross-platform validation in v0.2 not important] - but it would be nice to determine the future lift to do the integration*
> 3. *your best recommendation [for effort tolerance]*
>
> *we should get this working effectively with claude code first*

## Architecture selected: Candidate A — Minimum-viable Claude Code v0.2

**One-paragraph statement**: un-punt v0.2 ships SessionStart, PostToolUse (matcher: `Edit|Write|MultiEdit`), and UserPromptSubmit hooks for Claude Code only, plus an AGENTS.md primer template that lives in any `.un-punt/`-bearing repo (universal floor for cross-platform graceful degradation, used at v0.2 launch only by Claude Code users since other adapters defer). Hooks follow Q4a's Sketch (ii) design — structural pre-filter on path + gitignore, agent does all content classification — preserving Decision 2 per Q3b. The SKILL body widens per Q4b (~5 long-tail trigger rows + "examples are not exhaustive" framing line). The CLI extends ~30 LOC to merge a `hooks` block into `~/.claude/settings.json`, paralleling the existing `permissions.{allow,ask,deny}` merge logic. Decision #21 (drafted in full at Q3c) lands in the design register. Cursor and Codex adapters are deferred to v0.2.x patches; Copilot/Gemini/Aider deferred to v0.3+. Frontmatter mitigations (`when_to_use` / `paths`) are NOT included in v0.2 — Q5b judged them dominated.

## Why Candidate A (against your inputs)

- **Input 1 ("Claude Code first")** → A is the only candidate with that scope. B/C add platforms; E ships no hooks.
- **Input 2 ("future lift to integrate other platforms")** → documented below.
- **Input 3 ("best recommendation on effort")** → A at ~450 LOC is the smallest candidate that fixes all 4 failed v0.1 probes. Tightly scoped; easy to validate; easy to iterate from.
- **"Get this working effectively with Claude Code first"** → matches A's stance.

## Future-lift estimates (your second question)

The cost of extending A to B (add Cursor + Codex) or C (add all 6 platforms) in future versions, accounting for what A has already done:

### A → B (add Cursor + Codex adapters)

| Work item | Estimated LOC / effort |
|---|---|
| **Hook scripts**: reuse from `core/hooks/` directly (per Q2 evidence: Cursor and Codex hook contracts are JSON-stdin/JSON-stdout compatible with Claude Code) | ~0 new LOC — scripts shared |
| **Cursor adapter manifest**: `adapters/cursor/skills/un-punt/SKILL.md` (using SKILL.md open standard per Q2b — same body) + `.cursor/hooks.json` registration | ~50 LOC + minor build.sh extension |
| **Cursor install path**: documentation only, since Cursor's skill loading is automatic via `.cursor/skills/` | ~30 LOC for an `un-punt install cursor` CLI subcommand if desired (or just docs) |
| **Codex adapter manifest**: `adapters/codex/.codex-plugin/plugin.json` + `hooks/hooks.json` (auto-discovered) | ~40 LOC + build.sh extension |
| **Codex install path**: similar pattern via `un-punt install codex` or `codex marketplace add <git-url>` | ~30 LOC for CLI subcommand if desired |
| **Per-platform smoke tests**: validate cold-start + post-bootstrap behavior on each | ~2 hours per platform |
| **Adapter docs in launch materials**: tier table | ~30 LOC |
| **Total A → B lift** | **~180 LOC + ~4 hours testing** |

This is significantly less than building Cursor/Codex support from scratch because:
1. Hook scripts are written once in `core/hooks/` and ship to all platforms unchanged
2. SKILL.md is the shared open standard across CC/Cursor/Codex (no body adaptation)
3. `core/build.sh` already supports per-adapter hook copying (line 21 conditional)
4. AGENTS.md primer is already shipped in A as the universal floor
5. CLI install logic mirrors the Claude Code pattern; per-adapter glue is small

### A → C (add all 6 platforms)

| Additional work item beyond A → B | Estimated LOC / effort |
|---|---|
| **Gemini CLI adapter**: `.gemini/settings.json` hooks registration + `GEMINI.md` primer (or AGENTS.md) | ~40 LOC + 2 hours testing |
| **Copilot VS Code adapter**: `.github/hooks/` registration + `.github/copilot-instructions.md` primer | ~50 LOC + 2 hours testing |
| **Copilot CLI adapter** (Tier 2 — partial): SessionStart + PreToolUse-deny only; capture nudge skipped per Q2c constraint | ~30 LOC + 1 hour testing + tier doc explaining the degraded experience |
| **Aider adapter** (Tier 3 — primer-only): `read: AGENTS.md` snippet for `.aider.conf.yml` | ~10 LOC + tier doc |
| **Tier documentation in launch materials** | ~50 LOC |
| **Total A → C lift (above A → B)** | **~180 LOC + ~5 hours testing** |
| **Total A → C lift (cumulative from A)** | **~360 LOC + ~9 hours testing** |

### What's the per-version path?

- **v0.2 (this session)**: ship A. Validate in punt-board re-dogfood. ~450 LOC.
- **v0.2.1 patch** (if punt-board re-dogfood succeeds): add Cursor adapter (~80 LOC). Low-risk because hook scripts proven in v0.2.
- **v0.2.2 patch**: add Codex adapter (~70 LOC). Same reasoning.
- **v0.3** (if Q7 measures Sketch (ii) compliance < 80%): consider Sketch (iv) prompt hooks per Q3b. Or add Tier 2/3 platforms. Or `when_to_use`/`paths` mitigations if real-world signal warrants.

The v0.2.1 / v0.2.2 patches are small enough that each is a single afternoon's work post-launch. **The "lift to integrate" is friction-free if v0.2 ships clean.**

## Per-file change set for v0.2 (input to Q6 implementation chunks)

### New files (5)

| Path | Purpose | Source |
|---|---|---|
| `core/hooks/session-start.sh` | Load skill activation reminder via `additionalContext` on every session in `.un-punt/`-bearing repo | Already drafted May 1; **MUST REVISE** per Q4a Sketch (ii) — confirm pure structural filtering, no content classification |
| `core/hooks/post-tool-use.sh` | Structural pre-filter on path + gitignore; emit `additionalContext` reminder for agent to inspect diff | **MUST REWRITE** — May 1 draft used regex pre-classification (Sketch iii anti-pattern); v0.2 must use Sketch (ii) only |
| `core/hooks/user-prompt-submit.sh` | Detect wrap-up trigger phrases; emit `additionalContext` prompting sweep offer | Already drafted May 1; review per Q4a Sketch (ii) |
| `adapters/claude-code/AGENTS.md.template` | Universal-floor primer template that gets copied into `.un-punt/`-bearing repos | New |
| `docs/research/Q5c-architecture-decision.md` | This file | New (already written) |

### Modified files (12)

| Path | Change | Source |
|---|---|---|
| `core/skill/SKILL.body.md` | Widen trigger table per Q4b: add ~5 long-tail rows (trivial catches, ignored Promise rejections, Rust `todo!()`, Go `panic("not implemented")`, disabled lints, debug logs); add "examples are not exhaustive" framing line directly above the table | Q4b verdict |
| `core/skill/reference/contract-template.md` | Add `hack-workaround` and `other` to thresholds list with explicit values; remove orphan types (`missing-edge-case`, `deprecated-api`, `dead-code`, `doc-additions`) not in skill enum; document inheritance fallback rule | Q8 minor finding fix (probe 5) |
| `adapters/claude-code/settings.json` | Add `hooks` block with SessionStart, PostToolUse (matcher `Edit\|Write\|MultiEdit`), UserPromptSubmit entries; commands point at `~/.claude/skills/un-punt/hooks/*.sh` | New |
| `packages/cli/src/install.ts` | Extend to merge `hooks` block from adapter settings into user settings.json; track added entries in `added_hooks` manifest field | Q1c recommendation |
| `packages/cli/src/uninstall.ts` | Reverse hook merge using the manifest's `added_hooks` field | Q1c recommendation |
| `packages/cli/src/util.ts` | Extend `InstallManifest` type with `added_hooks: { [eventName: string]: string[] }` field | Q1c recommendation |
| `packages/cli/src/install.ts` (continued) | Copy `AGENTS.md.template` into `<cwd>/AGENTS.md` (or append to existing) when un-punt is installed in a project, similar to how it copies the contract template | New per A's "AGENTS.md primer everywhere" |
| `core/build.sh` | No change — already supports `core/hooks/` copying via line 21 conditional | Verified Q1c |
| `docs/08-design-decisions.md` | Append Decision #21 (text drafted in full at Q3c) | Q3c |
| `docs/06-build-plan.md` | Update Phase 1: "No hooks at MVP" → "SessionStart + PostToolUse + UserPromptSubmit hooks at MVP per #21" | Q3c follow-on |
| `docs/07-risks-and-evals.md` | Annotate B8 row: "MATERIALIZED in May 2026 dogfood; mitigation = hooks per #21" | Q3c follow-on |
| `docs/05-skill-brief.md` | Minor update clarifying hooks are activation/nudging layer; skill remains IP | Q3c follow-on |

**Total**: 5 new + 12 modified = 17 file touches.

### Files explicitly NOT changing in v0.2

- `core/skill/snippets/*.md` — cold-start/preflight/lifecycle procedures unchanged
- `core/skill/reference/refusal-lists.md`, `id-derivation.md`, `disposition-prompt.md`, `markdown-spec.md` — unchanged
- `adapters/claude-code/skills/un-punt/_frontmatter.yml` — **NOT adding `when_to_use` or `paths`** per Q5b dominance verdict on D
- `core/golden-set/*.yaml` — golden-set scenarios unchanged for v0.2 (Q7 may add new scenarios; that's a v0.2.1 follow-on if needed)
- `packages/evals/*` — eval harness unchanged
- All Cursor / Codex / other-platform adapter directories — deferred to v0.2.x

## Q6 implementation chunks (6 chunks)

Sized so each is a single focused session; no batching across components.

| Chunk | Files | Estimated LOC | Validation |
|---|---|---|---|
| **1. Hook scripts (3 files)** | `core/hooks/{session-start,post-tool-use,user-prompt-submit}.sh` | ~150 | Each script smoke-tested standalone before integration |
| **2. CLI hook-merging extension** | `packages/cli/src/{install,uninstall,util}.ts` | ~50 | Run install + uninstall against fresh user settings.json; verify clean reversal |
| **3. Adapter settings.json hooks block** | `adapters/claude-code/settings.json` | ~30 | Run `core/build.sh`; verify built artifact at `adapters/claude-code/skills/un-punt/` includes hooks dir |
| **4. SKILL body widening + framing line** | `core/skill/SKILL.body.md` | ~50 | Verify built `SKILL.md` is still under 1,536-char description budget; trigger table renders cleanly |
| **5. Contract template fix** | `core/skill/reference/contract-template.md` | ~20 | Re-build; verify `adapters/claude-code/skills/un-punt/reference/contract-template.md` reflects changes |
| **6. AGENTS.md primer + 4 docs updates** | `adapters/claude-code/AGENTS.md.template`, `packages/cli/src/install.ts` (primer-copy step), `docs/{08-design-decisions,06-build-plan,07-risks-and-evals,05-skill-brief}.md` | ~150 | Run install in a clean repo; verify AGENTS.md lands at `<cwd>/AGENTS.md` (or appends correctly to existing); read each doc for consistency |

**Sequence**: Chunk 1 first (hook scripts), then Chunk 2 (CLI), then Chunk 3 (adapter settings — needs Chunk 1's scripts to exist for the references). Chunks 4–6 can run in parallel with each other after Chunk 3.

## Out-of-scope items (what user should know we're NOT doing)

- **Frontmatter mitigations** (`when_to_use`, `paths`). Q5b judged dominated. Available as v0.3 add-on if needed.
- **Sketch (iv) prompt hooks**. Q3b deferred to v0.3 (escape hatch if Sketch (ii) compliance < 60% in re-dogfood).
- **Cursor adapter, Codex adapter, Copilot/Gemini/Aider adapters**. Deferred per user input #1.
- **Cold-start procedure changes**. Worked perfectly in v0.1 dogfood; do not touch.
- **Sweep planning algorithm changes**. Probe 5 showed correct; do not touch.
- **Disposition prompt UX changes**. Wasn't exercised in v0.1 dogfood (N=0 every sweep); no evidence to act on.
- **Calibration loop changes** (`feedback.md` flow). Not exercised in v0.1.
- **Top-3-areas double-count** (minor finding from Probe 3). Q8a should decide fix-in-v0.2 vs defer; recommend defer (cosmetic).
- **Line-drift in items frontmatter** (minor finding from Day 3). Q8a should decide; recommend defer (additive `last_verified_at:` field is a v0.3 task once hooks observe edits).
- **Refused-section enumeration** walking 7 of 12 rules explicitly (Probe 5 minor finding). Q8a should decide; recommend defer (cosmetic).

The Q8 minor-findings disposition session formalizes these recommendations as the user's call.

## Constraints check (final pass)

| Constraint | A's compliance |
|---|---|
| Decision 1 (markdown) | ✓ preserved per Q3a |
| Decision 2 (agent is engine) | ✓ preserved per Q3b — Sketch (ii) only |
| Decision 4 (skill is IP) | ✓ skill body unchanged in role |
| Decision 13 | Bullets 1 + 4 hold; bullets 2 + 3 superseded by Decision #21 (per Q3c) |
| Decision #21 (NEW — drafted at Q3c) | ✓ A ships it |
| Decision 14 (refusal layer) | ✓ untouched |
| Decision 15 (plugin not MCP) | ✓ untouched |
| Cross-platform thesis | ⚠ A is intentionally Claude-Code-only at v0.2 launch — explicit user choice; future-lift to B/C documented above |
| No infrastructure | ✓ hooks are stateless event scripts |
| Markdown all the way down | ✓ |
| Agent is engine | ✓ |

The cross-platform compromise is the only constraint where A is intentionally less than maximal — and per user input, that's the right call for v0.2.

## Implications for downstream sessions

- **Q6 (implementation, 6 chunks)**: ready to start. Each chunk is its own session per methodology; do not batch across chunks.
- **Q7 (re-dogfood validation)**: probe sequence per v2-plan unchanged. Single-environment (Claude Code in punt-board) since A is Claude-Code-only. Must measure Sketch (ii) compliance percentage explicitly.
- **Q8 (minor findings disposition, USER GATE)**: pending. Recommend deferring 3 minor findings (top-3-areas double-count, line-drift, refused-section enumeration); 1 to fix in v0.2 (contract template type vocab). User confirms.
- **Q9 (build plan + risks + skill brief updates)**: Chunk 6 above absorbs this work.
- **No Q5d / Q5e** — Q5 series complete after this session.

## Decision-register entry text

The full Decision #21 text is at [`Q3c-decision-13-reread.md`](Q3c-decision-13-reread.md) under "Decision #21 — proposed text". One adjustment for v0.2 reality: replace the multi-platform adapter-coverage list with the v0.2-actual scope:

> **Adapter coverage for v0.2**:
> - Claude Code: `~/.claude/settings.json` `hooks` block merged by the CLI install
> - All other platforms: AGENTS.md primer template (universal floor); full hook adapters deferred to v0.2.x (Cursor, Codex) or v0.3+ (Copilot, Gemini, Aider) per future-lift estimates in `docs/research/Q5c-architecture-decision.md`

The rest of the Decision #21 text from Q3c lands verbatim. Chunk 6 makes this edit.

## Change-my-mind

This decision would change if:

1. **The user reverses the v0.2-scope choice** (e.g., decides to include Cursor adapter in v0.2 after all). Path: re-open Q5c and switch to B (or C). Q6 chunk list grows but methodology is the same.
2. **Q6 implementation surfaces a hook design flaw** that Q4a/Q3b didn't anticipate. Path: re-open Q4 series; possibly Sketch (iv) becomes the mid-development pivot. Treat as a v0.2 schedule risk.
3. **`updatedToolOutput` re-validation was wrong** (we already re-validated; Q1b's reading was correct per WebFetch 2026-05-02; risk closed).

## Risks surfaced

- **Hook script revisions are non-trivial.** The May 1 drafts at `core/hooks/*.sh` exist but the post-tool-use.sh especially uses Sketch (iii) regex pre-classification — must rewrite for Sketch (ii). Don't import the May 1 code uncritically; treat as reference only.
- **CLI hook-merging needs care around uninstall reversibility.** The existing `permissions.*` merge logic is the template; copy its discipline (dedupe, track-what-we-added, leave-user-entries-intact-on-uninstall).
- **AGENTS.md primer copy-into-cwd UX**: if the user already has an AGENTS.md, do we append, prompt, or skip? The `permissions.*` merge handles this for settings.json; AGENTS.md needs an analogous decision. Recommend: skip if exists, log a one-line message; user can manually add un-punt's primer paragraph.
- **Q7 must measure Sketch (ii) compliance percentage explicitly.** Not just "did capture happen?" but "what % of capture-eligible events resulted in a captured item?" If < 60%, Sketch (iv) becomes the v0.3 conversation per Q3b.
- **Future-lift estimates are model-best.** Real per-platform integration may surface unexpected differences (e.g., Cursor's `afterFileEdit` semantics differ slightly from Claude Code's `PostToolUse` per Q2b). Re-validate when each adapter is built.
