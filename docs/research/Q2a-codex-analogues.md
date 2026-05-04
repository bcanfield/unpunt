# Q2a — Codex hook analogues

> Research session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Web research via `codex-docs` general-purpose agent.

## Question

Does Codex have hook events comparable to Claude Code's PostToolUse / SessionStart / UserPromptSubmit? If not, what mechanisms achieve similar behavior?

## Sources consulted

| Source | Provided |
|---|---|
| `codex-docs` agent (general-purpose, web research) | Comprehensive matrix + narrative grounded in Codex CLI primary docs |
| https://developers.openai.com/codex/hooks | Codex hook spec |
| https://developers.openai.com/codex/guides/agents-md | AGENTS.md handling in Codex |
| https://developers.openai.com/codex/plugins/build | Plugin manifest format |
| https://developers.openai.com/codex/plugins | Plugin architecture overview |
| https://developers.openai.com/codex/changelog | Version history |

## Headline finding

**Codex shipped a hooks system structurally near-identical to Claude Code's, marked stable in Codex CLI 0.124.0 (2026-04-23)**. Plugin bundling (skills + hooks + MCP) stable in 0.117.0 (2026-03-26). The event vocabulary, JSON-stdin contract, and output mechanisms map almost 1:1; for un-punt's needs (SessionStart primer, PostToolUse capture nudge, UserPromptSubmit wrap-up detection), **everything is available**. Codex's `Stop` semantics are arguably *better* than Claude Code's for un-punt's wrap-up offer (returns a continuation prompt cleanly via `decision: "block"`).

## Event matrix (Claude Code → Codex)

| Claude Code event | Codex equivalent | Notes |
|---|---|---|
| `SessionStart` | `SessionStart` | TOML/JSON config. Matchers: `startup`/`resume`/`clear`. Output supports `systemMessage`, `additionalContext`, `continue`, `stopReason`. ✓ Direct map. |
| `UserPromptSubmit` | `UserPromptSubmit` | No matcher. Output: `additionalContext` (augment), `decision: "block"` + `reason`. Exit 2 also blocks. ✓ Direct map. |
| `PreToolUse` | `PreToolUse` | Matcher on `tool_name` (`Bash`, `apply_patch`, `mcp__*`). Output: `permissionDecision` (allow/deny), `systemMessage`. **Caveat: "doesn't intercept all shell calls yet, only the simple ones"** — known limitation. |
| `PostToolUse` | `PostToolUse` | Includes failures. Output: `decision: "block"`, `reason`, `additionalContext`. Cannot undo execution. ✓ Direct map. |
| `Stop` | `Stop` | **Inverted semantics from Claude Code**: `decision: "block"` continues the turn (treated as continuation prompt); `continue: false` halts. **Better than Claude Code for un-punt's wrap-up offer** — directly express "keep agent thinking and surface this prompt." |
| Permission prompt (no direct equiv) | `PermissionRequest` | Codex-specific. Fires before user-facing approval prompts. Cleaner seam for policy hooks than Claude Code's PreToolUse-based equivalent. |
| `SubagentStop` | None documented | Codex-specific gap. |
| `PreCompact` / `Notification` | None documented | Codex-specific gap. |
| `SessionEnd` | None documented (only `Stop` per turn) | Codex models lifecycle differently — sessions don't have a discrete "end" event. |

## Companion surfaces

- **Session-start primer**: **`AGENTS.md`** — Codex reads it (and `AGENTS.override.md`) at session start, walking from `~/.codex/` → Git root → cwd, concatenating with closer files overriding earlier. 32 KiB combined cap (`project_doc_max_bytes`). Custom fallback names via `project_doc_fallback_filenames`. Spec at https://agents.md/. **This is the cross-tool convention this project (un-punt) already uses** (`CLAUDE.md` is symlinked to `AGENTS.md`).
- **Custom slash commands**: two paths — (1) deprecated: markdown files in `~/.codex/prompts/*.md`; (2) current: **Skills** (`SKILL.md` directories), invoked via `@` or implicit auto-load.
- **MCP**: full client support (stdio + Streamable HTTP + Unix socket as of 0.125.0). Configured per-project. **MCP servers provide tools, not event listeners** — for events you use hooks. (Same as Claude Code; consistent with un-punt Decision 15.)
- **Plugin architecture**: `.codex-plugin/plugin.json` manifest (kebab-case name, version, description, plus `skills`, `mcpServers`, `apps`, `hooks` paths). Hooks at `./hooks/hooks.json` (auto-discovered if path omitted). Distribution: `.agents/plugins/marketplace.json` (local repo) or `~/.agents/plugins/marketplace.json` (user) or `codex marketplace add` for Git URLs.

## Hook configuration locations (priority order)

1. `~/.codex/hooks.json` or `[hooks]` in `~/.codex/config.toml` (user)
2. `<repo>/.codex/hooks.json` or `[hooks]` in `<repo>/.codex/config.toml` (project)
3. Plugin manifests / `hooks/hooks.json`

Default timeout: 600s. Common stdin fields: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`. Feature-flagged historically with `[features] codex_hooks = true`; stable as of 0.124.0 — flag no longer required.

## How un-punt would port to Codex

Minimum-viable Codex adapter:

1. `.codex-plugin/plugin.json` declaring un-punt
2. `SKILL.md` (the un-punt body, **same content as Claude Code adapter**)
3. `hooks/hooks.json` registering at minimum:
   - `Stop` for wrap-up suggestion (using `decision: "block"` + continuation reason that nudges the sweep offer — cleaner than Claude Code's equivalent)
   - Optionally `UserPromptSubmit` for `/un-punt` slash-command behavior + early wrap-up phrase detection
4. Per-project trust via `.codex/config.toml`

The skill body, golden-set, and reference files port unchanged. Only the manifest + hook registration shape differs from Claude Code.

## Constraints check (preliminary)

| Constraint | Note |
|---|---|
| Cross-platform thesis | **Significantly strengthened.** Codex's hook + skill + AGENTS.md surface mirrors Claude Code's. v0.2 hook architecture is portable. |
| Markdown all the way down | Preserved. Both platforms read SKILL.md and `.un-punt/` markdown. |
| Agent is engine | Preserved. Codex's prompt-based hook capability (implied but not explicit in agent's report; needs Q4 verification) parallels Claude Code's. |
| No infrastructure | Preserved. Hooks are stateless event scripts on both platforms. |

## Architectural implications for v0.2

The "hooks are Claude-Code-only" concern that derailed the May 1 implementation **is empirically wrong as of April 2026**. Codex shipped hooks stable. Cursor (per Q2b) shipped hooks stable. The v0.2 architecture decision (Q5c) should treat hooks as a **portable abstraction** with platform-specific registration files, not a Claude-Code lock-in.

Decision 13 ("skill not hooks for self-capture") was made under the empirical assumption that hooks were Claude-Code-specific. **That assumption no longer holds.** The Q3c session (re-read decision 13 against evidence) should explicitly capture this as the change driver for the new decision entry.

## Change-my-mind

This conclusion would be invalidated if:

1. **Codex hooks have undocumented behavioral divergence from Claude Code** that breaks the abstraction (e.g., `additionalContext` doesn't actually inject into the agent's context the same way). Mitigation: empirical test in Q4/Q5 implementation before relying on cross-platform parity.
2. **Codex `PreToolUse` "doesn't intercept all shell calls" caveat** turns out to leak un-punt's refusal layer (e.g., agent runs auth-modifying shell command that Codex doesn't intercept). Mitigation: un-punt's filesystem-side contract (`.un-punt/items/*.md`) doesn't depend on shell interception, so impact is limited to refusal-layer completeness.
3. **AGENTS.md 32 KiB cap binds** for un-punt's primer (unlikely — primer is ~500 tokens / ~2 KB).

## Risks surfaced

- **Codex `PreToolUse` shell-interception caveat** — known limitation; affects refusal layer completeness. Document in adapter notes.
- **Codex `Stop` semantics inverted from Claude Code** (`decision: "block"` continues vs Claude Code's `decision: "block"` halts) — adapter glue must translate. Single-line difference; not a load-bearing concern.
- **Plugin marketplace ecosystem nascent** — official Codex Plugin Directory "coming soon" per the agent. Marketplace distribution may be premature for v0.2 launch; can ship via `codex marketplace add <git-url>` until directory is live.
