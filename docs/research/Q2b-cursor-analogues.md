# Q2b — Cursor hook analogues

> Research session per [`docs/v2-research-plan.md`](../v2-research-plan.md). Date: 2026-05-02. Web research via `cursor-docs` general-purpose agent.

## Question

What does Cursor offer that's analogous to Claude Code's hooks? `.cursorrules`, `cursor.json`, MCP, custom commands, agent rules — anything that fires at deterministic events?

## Sources consulted

| Source | Provided |
|---|---|
| `cursor-docs` agent (general-purpose, web research) | Comprehensive matrix + narrative grounded in Cursor primary docs |
| https://cursor.com/docs/hooks | Cursor hooks reference |
| https://cursor.com/docs/skills | Cursor Skills (SKILL.md open standard) |
| https://cursor.com/docs/context/rules | Project rules + .cursorrules |
| https://cursor.com/docs/cli/reference/slash-commands | Slash commands |
| https://cursor.com/docs/cli/mcp | MCP support |
| https://cursor.com/changelog/1-7 | Hooks GA (Sept 2025) |
| https://cursor.com/changelog/2-4 | Skills GA (Jan 22, 2026) |

## Headline finding

**Cursor has near-perfect parity with Claude Code's hooks + skills surface.** Cursor 1.7 (Sept 2025) shipped hooks; Cursor 2.4 (Jan 22, 2026) shipped Agent Skills using the **same `SKILL.md` open standard as Claude Code**. 17 hook events vs Claude Code's ~18. JSON-stdin/JSON-stdout contract identical. **An un-punt-style "always-on capture + wrap-up suggestion" tool is fully buildable on Cursor today** — and `core/skill/SKILL.body.md` ports unchanged.

## Event matrix (Claude Code → Cursor)

| Claude Code event | Cursor equivalent | Mechanism details |
|---|---|---|
| `SessionStart` | `sessionStart` | Inject env vars, add context |
| `SessionEnd` | `sessionEnd` | Observe/log only |
| `UserPromptSubmit` | `beforeSubmitPrompt` | **Can block submission**; receives `prompt` + `attachments` |
| `PreToolUse` | `preToolUse` | Allow/deny, modify input |
| `PostToolUse` | `postToolUse` | Observe, inject context |
| `PostToolUseFailure` | `postToolUseFailure` | Observe error/denial |
| `Stop` | `stop` | Auto-continue via `followup` field |
| `SubagentStart` / `SubagentStop` | `subagentStart` / `subagentStop` | Allow/deny spawn, observe completion |
| `PreCompact` | `preCompact` | Observe context-usage % |
| `Notification` | (no direct equivalent) | — |
| (no equivalent) | `beforeShellExecution` / `afterShellExecution` | **Cursor splits shell out from generic tool-use** — first-class shell hooks |
| (no equivalent) | `beforeMCPExecution` / `afterMCPExecution` | First-class MCP interception |
| (no equivalent) | `beforeReadFile` / `beforeTabFileRead` | File-read gate (Tab autocomplete has its own) |
| (no equivalent) | `afterFileEdit` / `afterTabFileEdit` | **Observe-only file-edit notification** — directly addresses un-punt's PostToolUse-style capture surface |
| (no equivalent) | `afterAgentResponse` / `afterAgentThought` | Observe agent text + thinking blocks |

Cursor has 17 events vs Claude Code's ~18. The split-out events (shell, MCP, Tab) are Cursor-specific bonuses, not gaps.

## Companion surfaces

- **Project rules** in `.cursor/rules/*.mdc` with frontmatter (`alwaysApply`, `description`, `globs`) controlling load behavior. Loaded at chat session start. Deprecated `.cursorrules` single-file form still read but officially sunset.
- **AGENTS.md** read natively as a simpler markdown alternative. Cursor explicitly recommends AGENTS.md for cross-tool instructions and `.cursor/rules/` for Cursor-specific config. CLI also reads `CLAUDE.md` at the project root.
- **Agent Skills** (Cursor 2.4, Jan 2026): **same `SKILL.md` open standard as Claude Code**. Stored in `.cursor/skills/<name>/SKILL.md`. Invocable via slash-command menu and discovered automatically based on description matching. **Huge cross-platform implication for un-punt** — see below.
- **Custom slash commands**: reusable markdown prompts in `.cursor/commands/*.md`, surfaced when user types `/` in chat.
- **MCP servers**: configured per-project, follow standard MCP spec — tools/resources/prompts only, **cannot subscribe to lifecycle events**. Event interception is the hooks system's job, not MCP's. (Same as Claude Code and Codex; consistent with Decision 15.)
- **`cursor.json`** **does NOT exist** as a documented config file. Cursor's config conventions are `.cursor/hooks.json`, `.cursor/rules/`, `.cursor/skills/`, `.cursor/commands/`, `.cursor/environment.json` (cloud envs), and VS-Code-inherited `.vscode/settings.json`. **Don't invent or expect it.**

## Hook configuration locations + scope precedence

`.cursor/hooks.json` (project) or `~/.cursor/hooks.json` (user). Scope precedence (highest to lowest): **Enterprise → Team → Project → User**. Same JSON-stdin/JSON-stdout contract as Claude Code. Supports both command and prompt hooks (LLM evaluates English condition, returns `{ok, reason}`).

## How un-punt would port to Cursor

Cleanly, with one notable bonus:

1. `core/skill/SKILL.body.md` ships unchanged at `.cursor/skills/un-punt/SKILL.md` — **same open standard, no adaptation**
2. `.cursor/hooks.json` registering:
   - `sessionStart` for primer (same as Claude Code's SessionStart)
   - `afterFileEdit` for capture nudge (**better surface than Claude Code's PostToolUse** — observe-only, file-specific, cleaner)
   - `beforeSubmitPrompt` for wrap-up phrase detection
   - `preToolUse` + `beforeShellExecution` for categorical refusals (auth/crypto/payments/migrations/lockfiles/generated)
3. `.cursor/commands/un-punt.md` for the `/un-punt` slash command (markdown-only, no scripting)
4. AGENTS.md gets a one-line "see `.cursor/skills/un-punt/SKILL.md`" pointer for cross-tool discoverability

The skill body, golden-set, and reference files port unchanged. The build script can emit both Claude Code and Cursor hooks from the same source — only the registration files differ.

## Constraints check (preliminary)

| Constraint | Note |
|---|---|
| Cross-platform thesis | **Massively strengthened.** Cursor uses the SAME `SKILL.md` open standard as Claude Code. Decision 4 ("the skill is the IP") + Decision 13 (skill not hooks) intersect cleanly here — the skill IS portable, and hooks are now portable too. |
| Markdown all the way down | Preserved. |
| Agent is engine | Preserved. Cursor explicitly supports prompt-based hooks (LLM evaluation of English conditions). |
| No infrastructure | Preserved. |

## Architectural implications for v0.2

Two big findings:

1. **`core/skill/SKILL.body.md` is genuinely cross-platform unchanged.** The same file ships to Claude Code and Cursor (and Codex per Q2a) as the canonical skill source. The build step's job is just to wrap it in platform-specific manifest scaffolding.

2. **Cursor's `afterFileEdit` is a *better* capture surface than Claude Code's `PostToolUse`** — observe-only, file-specific, doesn't carry the "must replace tool output" surface area that Q1b found undocumented in Claude Code. For Cursor's adapter, `afterFileEdit` is the right target; for Claude Code's, `PostToolUse` with matcher `Edit|Write|MultiEdit` is the closest analog.

This makes Cursor arguably the *cleanest* cross-platform target. Worth flagging in Q5c that the v0.2 architecture should be designed against the Cursor primitive surface and adapted down to Claude Code's, not the other way around.

## Change-my-mind

This conclusion would be invalidated if:

1. **Cursor's `SKILL.md` open standard implementation diverges** from Claude Code's in load semantics (e.g., description-match works differently, frontmatter fields behave differently). The agent reports the standard is shared, but empirical verification in Q4/Q5 implementation is warranted.
2. **`afterFileEdit` doesn't fire for AI-driven edits** (only for user-driven edits). The agent doesn't explicitly distinguish; if AI edits don't trigger it, the capture surface is broken. Mitigation: smoke-test in Q4 implementation.
3. **Cursor's `stop` hook semantics differ enough** from Claude Code's that adapter glue is non-trivial. The agent says Cursor's `stop` uses a `followup` field rather than Claude Code's exit-2-with-stderr; small difference but worth verifying.

## Risks surfaced

- **`stop` hook semantic difference** — adapter needs glue to translate.
- **Tab autocomplete has separate hooks** (`beforeTabFileRead`, `afterTabFileEdit`) — un-punt should opt into these for richer capture during inline-edit-heavy sessions; Tab edits are common in Cursor.
- **No `Notification` analog** — un-punt doesn't currently use Notification; not a blocker.
- **Settings stored in SQLite** — UI-driven settings live in a SQLite blob, not a JSON file. Hooks live in `.cursor/hooks.json` so this doesn't affect un-punt.
- **`cursor.json` is a non-thing** — design must explicitly avoid relying on it (some agent docs mistakenly reference it).
