# Q2c — Copilot / Gemini CLI / Aider hook analogues

> Research session per [`docs/v2-research-plan.md`](../v2-research-plan.md). Date: 2026-05-02. Web research via `other-platforms` general-purpose agent.

## Question

For each of GitHub Copilot (CLI + IDE), Gemini CLI, and Aider: what's analogous to Claude Code's hook surface, and how would un-punt port?

## Sources consulted

| Source | Provided |
|---|---|
| `other-platforms` agent (general-purpose, web research) | Per-platform matrix + tier-strategy recommendation |
| https://docs.github.com/en/copilot/reference/hooks-configuration | Copilot CLI hooks reference |
| https://code.visualstudio.com/docs/copilot/customization/hooks | Copilot VS Code hooks |
| https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/ | Copilot CLI GA (Feb 2026) |
| https://geminicli.com/docs/hooks/reference/ | Gemini CLI hooks reference |
| https://geminicli.com/docs/extensions/ | Gemini CLI extensions framework |
| https://aider.chat/docs/usage.html, /lint-test.html, /conventions.html, /config/aider_conf.html | Aider docs |
| https://agents.md/ | AGENTS.md open standard |

## Headline finding

**Hook fidelity varies dramatically across these three platforms.** Gemini CLI has arguably *richer* hook surface than Claude Code (11 events including LLM-loop hooks Claude Code lacks). Copilot has near-parity in VS Code but a thinner CLI side. Aider has essentially **no general-purpose hook system** — only `--auto-lint` and `--auto-test` post-edit. **AGENTS.md is the universal floor across all platforms** (60k+ OSS projects adopted; supported natively or via convention everywhere). Recommendation: **tiered adapter strategy** for un-punt — Tier 1 full hooks, Tier 2 partial, Tier 3 primer-only fallback (Aider).

## Per-platform results

### GitHub Copilot (CLI + IDE) — GA Feb 2026

Copilot CLI and the VS Code/JetBrains agent share a hook model. Same hook config file works in both; VS Code auto-converts `lowerCamelCase` to `PascalCase` event names.

| Claude Code event | Copilot equivalent | Notes |
|---|---|---|
| SessionStart | `sessionStart` / `SessionStart` | stdin: `timestamp`, `cwd`, `source`, `initialPrompt`. **Output ignored on CLI**; VS Code accepts `additionalContext`. |
| SessionEnd / Stop | `sessionEnd` / `Stop` | stdin: `reason` (complete/error/abort/timeout/user_exit). **VS Code Stop accepts `decision: "block"`**; CLI doesn't. |
| UserPromptSubmit | `userPromptSubmitted` / `UserPromptSubmit` | stdin: `prompt`. **CLI: prompt modification not currently supported.** VS Code: `continue: false` to abort. |
| PreToolUse | `preToolUse` / `PreToolUse` | **Most powerful hook.** `permissionDecision: allow|deny|ask` — **only `deny` honored on CLI**; VS Code honors all three. |
| PostToolUse | `postToolUse` / `PostToolUse` | stdin: `toolName`, `toolArgs`, `toolResult`. **CLI: result modification not supported.** VS Code: `decision: "block"`. |
| (none) | `errorOccurred` | Observability only. |
| SubagentStop | `SubagentStart` / `SubagentStop` (**VS Code only**) | Can inject context or block. |
| PreCompact | `PreCompact` (**VS Code only**) | `continue: false` to abort. |
| Notification | (no equivalent on CLI) | — |

**Config locations**: CLI loads from cwd; cloud agent from `.github/hooks/*.json`; VS Code from `.github/hooks/`, `.claude/settings.json`, or `~/.copilot/hooks` (configurable).

**Other extensibility**: AGENTS.md natively supported; `.github/copilot-instructions.md`; `.agent.md` files; markdown Skills; MCP (built-in GitHub server + custom); plugins via `/plugin install owner/repo`.

**Un-punt fit**: SessionStart works for primer; UserPromptSubmit works for wrap-up detection (CLI: read-only; VS Code: blockable); PreToolUse works for refusals (CLI's deny-only is fine — un-punt's refusal layer is binary). **Tier 2 candidate for CLI; Tier 1 for VS Code.**

### Gemini CLI — open source (google-gemini/gemini-cli)

| Claude Code event | Gemini equivalent | Notes |
|---|---|---|
| SessionStart | `SessionStart` | `source` = startup/resume/clear. Inject `additionalContext`. |
| Stop | `SessionEnd` | `reason` = exit/clear/logout. No modification. |
| UserPromptSubmit | `BeforeAgent` | After user submit, before planning. Can inject `additionalContext`; exit 2 blocks. |
| (no direct equiv) | `AfterAgent` | After model's final response. Has `prompt`, `prompt_response`, `stop_hook_active`. Exit 2 blocks. |
| PreToolUse | `BeforeTool` | Modify `tool_input`; exit 2 blocks. Includes `mcp_context`. |
| PostToolUse | `AfterTool` | Modify via `additionalContext` or `tailToolCallRequest`; exit 2 blocks. |
| (no equivalent) | **`BeforeModel` / `AfterModel`** | **Wraps every LLM call.** Can synthesize `llm_response` (cache short-circuit). Gemini-only. |
| (no equivalent) | **`BeforeToolSelection`** | Restrict which tools the model may pick this turn. Gemini-only. |
| Notification | `Notification` | Read-only. |
| PreCompact | `PreCompress` | Read-only. |

**Config**: `.gemini/settings.json` (project) → `~/.gemini/settings.json` (user) → extension-bundled hooks, merged in precedence.

**Other extensibility**: `GEMINI.md` (project-context memory, `/memory` command); `.toml` custom slash commands; **Extensions framework** that bundles "prompts, MCP servers, custom commands, themes, hooks, sub-agents, and agent skills" — installable in one command. AGENTS.md adoption via Extensions/community; native primer is GEMINI.md.

**Un-punt fit**: Cleanly. Every required pivot is covered. **Bonus**: Extensions can bundle the un-punt skill, command, and hooks as a one-command install — closer to Claude Code's plugin model than Copilot's. **Tier 1.**

### Aider — open source (Aider-AI/aider)

| Claude Code event | Aider equivalent | Notes |
|---|---|---|
| SessionStart | `read:` in `.aider.conf.yml` (closest) | Always loads named files (e.g., `CONVENTIONS.md`) read-only at session start. **No script execution.** |
| SessionEnd / Stop | none | — |
| UserPromptSubmit | none | — |
| PreToolUse | none (no general tool gating) | Aider's "tools" are bounded: edit/run/test/lint/web/voice. No interception API. |
| PostToolUse (edit-only subset) | `--auto-lint --lint-cmd <cmd>` and `--auto-test --test-cmd <cmd>` | Fires after every AI edit. **Non-zero exit causes Aider to attempt automatic repair.** Effectively a post-edit blocking hook, scoped to edits only. |
| (n/a) | `git-commit-verify` | Toggles whether Aider's auto-commits pass `--no-verify`. |

**No plugin/extension architecture, no MCP support, no AGENTS.md first-class** (community usage exists via the `read:` convention). The third-party `aidermacs` Emacs wrapper adds an Elisp hook outside Aider proper.

**Un-punt fit**: very limited. Only the conventions-file primer (analog to a SessionStart context-injection) and the post-edit lint/test loop (a constrained PostToolUse) map. **Tier 3 — primer-only fallback.**

## Cross-cutting analysis

### Most complete hook surface

**Gemini CLI** narrowly. Eleven events including LLM-loop hooks (BeforeModel/AfterModel/BeforeToolSelection) Claude Code lacks. Extensions bundle hooks declaratively.

### Least complete

**Aider**, by a wide margin. Two real "hooks" (`--auto-lint`, `--auto-test`), both fixed to post-edit, both expressing intent only via shell exit codes. Natural target for un-punt's primer-only fallback.

### Universal conventions across all three (+ Claude Code + Cursor + Codex)

1. **AGENTS.md as a primer file** is the closest thing to a true cross-platform standard in 2026. Native or community support across all 6 platforms surveyed (Claude Code, Cursor, Codex, Copilot, Gemini, Aider). 60k+ OSS projects adopted since 2025.
2. **JSON-over-stdin hook payloads** where hooks exist (Copilot and Gemini both adopted Claude Code's pattern).
3. **MCP** for tool extensibility on Copilot, Gemini, Cursor, Codex, Claude Code. Aider abstains.
4. **Markdown-based "skills" / agent files** on Claude Code (SKILL.md), Cursor (SKILL.md — same standard), Codex (SKILL.md), Copilot (`.agent.md`, Skills), Gemini (extension-bundled). Aider has no equivalent.

## Tier-strategy recommendation for un-punt

Tier the adapters by hook fidelity rather than treating platforms uniformly:

| Tier | Platforms | Capability | Implementation |
|---|---|---|---|
| **Tier 1 — full parity** | Claude Code, Cursor, Codex, Gemini CLI, Copilot VS Code | SessionStart primer + PostToolUse capture + UserPromptSubmit wrap-up detection + PreToolUse refusals | Hook adapter per platform; same skill body |
| **Tier 2 — partial (refuse + primer, no auto-capture)** | Copilot CLI | SessionStart primer + PreToolUse refusals (deny-only); skip auto-capture-on-defer; user invokes `/un-punt` manually | Smaller hook footprint; `/un-punt` slash command does manual capture |
| **Tier 3 — primer-only fallback** | Aider | AGENTS.md (or `read: AGENTS.md` in `.aider.conf.yml`) carries un-punt's rules as inline guidance; optionally a wrapper `--lint-cmd` that scans for new TODOs | No dynamic refusal, no auto-capture, no sweep prompt; primer carries everything |

This matches Copilot's own GA messaging ("hooks for predictable, policy-compliant execution") and avoids over-investing in Aider parity.

**The AGENTS.md primer is the universal floor; everything above it is platform-bonus.**

## Constraints check (preliminary)

| Constraint | Note |
|---|---|
| Cross-platform thesis | **Massively confirmed.** AGENTS.md is THE universal primer. Hooks are the standard primitive across 4 of 5 modern platforms. Tier-3 primer-only fallback covers the holdout (Aider). v0.2 is genuinely cross-platform. |
| Markdown all the way down | Preserved across all tiers. |
| Agent is engine | Preserved (no platform requires non-agent classification). |
| No infrastructure | Preserved across tiers. |

## Architectural implications for v0.2

The combined Q2 series produces three load-bearing findings for Q5c:

1. **Hooks are the cross-platform standard primitive in 2026, not a Claude-Code lock-in.** The May 1 concern was wrong.
2. **AGENTS.md is the universal floor.** Even on Aider it works (via `read:`). v0.2 should ship an AGENTS.md primer alongside any hooks — both for tier-3 platforms and as a redundancy layer on tier-1/2 platforms (load-on-session-start fallback if hook fires fail).
3. **Tiered adapter strategy is honest and shippable.** Don't pretend Aider can do what Cursor can. Document the tier per platform; let users choose un-punt based on their platform's tier.

## Change-my-mind

This conclusion would be invalidated if:

1. **AGENTS.md adoption regresses** (e.g., one of the platforms drops support). 60k+ OSS projects + native support across all surveyed platforms makes this unlikely in v0.2 timeframe.
2. **Aider adds a real hook system** in v0.3 that promotes it from Tier 3 to Tier 1. Watch for this; not a blocker.
3. **Copilot CLI adds prompt/result modification** that promotes it from Tier 2 to Tier 1. Watch for this; not a blocker.

## Risks surfaced

- **Per-platform hook semantic differences** add adapter-glue surface area. Mitigation: write a single hook contract document and adapt down per platform.
- **Tier 3 (Aider) users get strictly worse UX** than Tier 1 users. Honest framing in launch materials prevents over-promising.
- **Copilot CLI vs VS Code split** means same user can be Tier 1 or Tier 2 depending on which surface they use. Document this clearly.
- **Gemini CLI's richer hook surface (BeforeModel/AfterModel)** is bonus for v0.3 but doesn't affect v0.2 architecture.
