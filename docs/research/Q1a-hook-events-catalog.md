# Q1a — Claude Code hook events catalog

> Research session per [`docs/v2-research-plan.md`](../v2-research-plan.md). Pilot session — first run of the v2 research methodology. Date: 2026-05-02.

## Question

What hook events does Claude Code emit, when does each fire, and what is the input/output JSON schema for each?

## Sources consulted

| Source | What it provided | Authority |
|---|---|---|
| `claude-code-guide` agent (run 2026-05-02) | Comprehensive event catalog with input/output schemas, version history, citations to canonical docs | Official Anthropic docs (resolved canonical URL) |
| `plugin-dev:hook-development` skill (loaded 2026-05-02) | Plugin hook configuration formats, prompt-based vs command hook distinction, lifecycle/limitations, idiomatic patterns | Project-internal opinionated guide (`~/.claude/plugins/cache/claude-plugins-official/plugin-dev/`) |

**Canonical docs URL recorded**: https://code.claude.com/docs/en/hooks.md (also referenced as https://docs.claude.com/en/docs/claude-code/hooks)

**Claude Code version at time of research**: 2.1.126 (May 1, 2026 release per agent's confirmation)

## Headline finding

Claude Code emits **18 hook events** spanning tool lifecycle, user input, session lifecycle, subagent management, file/cwd watch, task tracking, and notifications. Hooks have **two type modes** (`type: "command"` and `type: "prompt"`) and **two configuration formats** (plugin-internal `hooks/hooks.json` with `{"hooks": {...}}` wrapper vs user `~/.claude/settings.json` direct-format). The `type: "prompt"` mode runs the model on the hook input rather than a shell script — a major architectural option that didn't surface in v0.1's planning.

## Event catalog (all 18 events)

Grouped by lifecycle stage. **Bold = events most relevant to un-punt's v0.2 dogfood-failure probes** (1, 4, 6, 7, 8).

### Tool lifecycle events

#### **PreToolUse**
- **Fires**: Immediately before any tool execution (Bash, Edit, Write, Read, Glob, Grep, Agent, WebFetch, WebSearch, AskUserQuestion, MCP tools)
- **Input fields**: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, `tool_name`, `tool_input`, `tool_use_id`
- **Output options**:
  - Exit 2 → block tool execution (stderr fed back to Claude)
  - `{"hookSpecificOutput": {"permissionDecision": "allow|deny|ask|defer"}}` → permission control
  - `{"hookSpecificOutput": {"updatedInput": {...}}}` → modify tool input before execution
  - `{"hookSpecificOutput": {"additionalContext": "..."}}` → inject context to Claude
- **Blocking**: Yes
- **Matcher**: Yes — matches `tool_name` (exact or regex, case-sensitive); e.g., `"matcher": "Write|Edit"` or `"matcher": "mcp__.*__delete.*"`
- **Citation**: https://code.claude.com/docs/en/hooks.md (PreToolUse section)

#### **PostToolUse**
- **Fires**: Immediately after a tool executes successfully
- **Input fields**: same as PreToolUse plus `tool_result` (raw output), `tool_result_mime_type`, `is_error: false`
- **Output options**:
  - Exit 2 → block (halts Claude's turn)
  - `{"decision": "block", "reason": "..."}` → halt with reason
  - `{"hookSpecificOutput": {"updatedToolOutput": "..."}}` → replace output (added v2.1.121)
  - `{"hookSpecificOutput": {"additionalContext": "..."}}` → inject context
- **Blocking**: Yes
- **Matcher**: Yes — matches `tool_name`
- **Citation**: hooks.md (PostToolUse section)
- **Un-punt relevance**: directly addresses Probe 4 (silent capture during work)

#### PostToolUseFailure
- **Fires**: After a tool execution fails (error returned)
- **Input fields**: same as PostToolUse but `is_error: true` and `tool_result` contains error
- **Output options**: same as PostToolUse
- **Blocking**: Yes
- **Matcher**: Yes — matches `tool_name`
- **Citation**: hooks.md (PostToolUseFailure section)

### User input events

#### **UserPromptSubmit**
- **Fires**: User submits a prompt, before Claude reads it
- **Input fields**: `session_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, `prompt` (the user's raw input string)
- **Output options**:
  - `{"decision": "block", "reason": "..."}` → block submission
  - `{"hookSpecificOutput": {"sessionTitle": "..."}}` → set session title
  - `{"hookSpecificOutput": {"additionalContext": "..."}}` → inject context Claude sees alongside the user prompt
- **Blocking**: Yes
- **Matcher**: No (always fires)
- **Citation**: hooks.md (UserPromptSubmit section)
- **Un-punt relevance**: directly addresses Probes 6, 8 (wrap-up suggestion at trigger phrases)

#### UserPromptExpansion
- **Fires**: A slash command is about to expand, before it runs
- **Input fields**: standard fields plus `expansion_type` (slash_command), `command_name`, `command_args`, `command_source` (plugin|builtin|skill), `prompt` (full command text)
- **Output options**: block expansion or add context
- **Blocking**: Yes
- **Matcher**: Yes — matches `command_name`; e.g., `"matcher": "un-punt"` would fire only for `/un-punt`
- **Citation**: hooks.md (UserPromptExpansion section)

### Session lifecycle events

#### **SessionStart**
- **Fires**: New session created or existing session resumed
- **Input fields**: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `source` (startup|resume|clear|compact), `model`, `agent_type` (optional, if subagent)
- **Output options**:
  - `{"hookSpecificOutput": {"additionalContext": "..."}}` → inject session-start context
  - SessionStart specifically supports persisting env vars via `$CLAUDE_ENV_FILE`: `echo "export PROJECT_TYPE=nodejs" >> "$CLAUDE_ENV_FILE"`
- **Blocking**: No (cannot prevent session start)
- **Matcher**: Yes — matches `source`; e.g., `"matcher": "startup|resume"` fires on those but not on `clear`/`compact`
- **Citation**: hooks.md (SessionStart section)
- **Un-punt relevance**: directly addresses Probes 1, 2, 7 (description-match auto-load failures)

#### SessionEnd
- **Fires**: Session ends
- **Input fields**: standard
- **Output options**: cleanup, logging — no blocking documented
- **Blocking**: No
- **Matcher**: Not documented
- **Citation**: hooks.md (skill summary; agent did not separately enumerate)

#### PreCompact
- **Fires**: Before context compaction (auto or manual) — added v2.1.105
- **Input fields**: standard plus `trigger` (manual|auto)
- **Output options**: `{"decision": "block", "reason": "..."}` → prevent compaction; `{"hookSpecificOutput": {"additionalContext": "..."}}` → preserve content
- **Blocking**: Yes
- **Matcher**: Yes — matches `trigger` (manual or auto)
- **Citation**: hooks.md + changelog.md v2.1.105

#### PostCompact
- **Fires**: After context compaction completes
- **Output options**: none documented
- **Blocking**: No
- **Citation**: hooks.md

### Turn / agent control events

#### Stop
- **Fires**: Claude finishes generating a response and the turn ends
- **Input fields**: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `stop_reason` (end_turn|max_tokens|tool_use|etc)
- **Output options**:
  - `{"decision": "block", "reason": "...", "continue": false, "stopReason": "user-facing message"}` → prevent the turn from ending; "block" tells Claude to keep working
- **Blocking**: Yes (can prevent turn end)
- **Matcher**: No (always fires)
- **Citation**: hooks.md (Stop section)
- **Un-punt potential alternative**: could be used for wrap-up suggestion if UserPromptSubmit isn't sufficient (different timing — Stop fires after Claude responds, UserPromptSubmit fires before)

#### StopFailure
- **Fires**: A turn ends due to API error (rate limit, auth, billing, server error, etc.)
- **Input fields**: standard plus `error_type`, `error_message`
- **Output options**: none documented (informational)
- **Blocking**: No
- **Matcher**: Yes — matches `error_type`
- **Citation**: hooks.md

### Subagent events

#### SubagentStart
- **Fires**: A subagent is spawned
- **Input fields**: standard plus `agent_id`, `agent_type`, `subagent_prompt`
- **Output options**: no blocking documented
- **Blocking**: No
- **Citation**: hooks.md

#### SubagentStop
- **Fires**: Subagent finishes and returns to parent
- **Input fields**: standard plus `agent_id`, `agent_type`, `subagent_result`
- **Output options**: `{"decision": "block", "reason": "..."}`
- **Blocking**: Yes
- **Matcher**: Yes — matches `agent_type`
- **Citation**: hooks.md

### Permission events

#### PermissionRequest
- **Fires**: A permission dialog is about to show (tool denied by rules, asking user approval)
- **Input fields**: standard plus `tool_name`, `tool_input`, `permission_suggestions[]`
- **Output options**: complex `decision` object with `behavior` (allow|deny), `updatedInput`, `updatedPermissions[]` (programmatically add allow/deny rules), `message` (deny reason)
- **Blocking**: Yes
- **Matcher**: Yes — matches `tool_name`
- **Citation**: hooks.md (PermissionRequest section)
- **Un-punt relevance**: relates to Decision 14 (refusal layer); could be used to enforce categorical refusals at OS level

#### PermissionDenied
- **Fires**: A tool was denied by the auto-mode classifier (added v2.1.89)
- **Input fields**: standard plus `tool_name`, `tool_input`
- **Output options**: `{"retry": true}` to allow Claude to retry
- **Blocking**: No
- **Matcher**: Yes
- **Citation**: changelog.md v2.1.89 + hooks.md

### File/state watch events (added v2.1.83)

#### FileChanged
- **Fires**: A watched file changes
- **Input fields**: standard plus `file_path`, `change_type` (modified|created|deleted)
- **Output options**: none (async)
- **Blocking**: No
- **Matcher**: Yes — matches literal filenames or globs; e.g., `"matcher": ".envrc|.env"`
- **Citation**: changelog.md v2.1.83
- **Un-punt potential**: could detect when items reference changed files (line-drift recheck — minor finding 5)

#### CwdChanged
- **Fires**: Working directory changes
- **Input fields**: standard
- **Output options**: none (async)
- **Blocking**: No
- **Citation**: changelog.md v2.1.83

### Task tracking events (added v2.1.84)

#### TaskCreated
- **Fires**: Task created via TaskCreate tool
- **Input fields**: standard plus `task_title`, `task_description`
- **Output options**: `{"decision": "block", "reason": "..."}`
- **Blocking**: Yes
- **Matcher**: No
- **Citation**: changelog.md v2.1.84

#### TaskCompleted
- **Fires**: Task completed
- **Output options**: not documented (informational)
- **Blocking**: No
- **Citation**: changelog.md v2.1.84

### Notification events

#### Notification
- **Fires**: Various UI/system notifications (permission prompts, idle, auth success, elicitation dialogs)
- **Input fields**: standard plus `notification_type`, `message`
- **Output options**: none (logging only)
- **Blocking**: No
- **Citation**: hooks.md

#### Elicitation / ElicitationResult
- **Fires**: Elicitation when MCP server requests user input; ElicitationResult when user responds
- **Output options** (Elicitation): `{"hookSpecificOutput": {"action": "accept|decline|cancel", "content": {...}}}`
- **Blocking**: Yes (Elicitation)
- **Matcher**: Yes — matches `server_name`
- **Citation**: hooks.md

## Hook type modes (cross-cutting)

Two `type` values per hook entry, applicable to most events:

| Type | What it runs | When to use | Default timeout |
|---|---|---|---|
| `"command"` | A bash command (or any shell command) | Fast deterministic checks, file system operations, external tool integration | 60s |
| `"prompt"` | An inline prompt sent to the model with hook input as context | Context-aware reasoning, complex/judgment-call validation, edge cases | 30s |

**The `"prompt"` type is supported on**: Stop, SubagentStop, UserPromptSubmit, PreToolUse (per the `plugin-dev:hook-development` skill, "Prompt-Based Hooks" section).

**Architectural significance**: a prompt-based hook does NOT pre-classify with regex. It hands the hook event payload to the model and asks it to reason. This preserves "agent is the engine" (Decision 2) while still firing at deterministic events. Q4 will evaluate this in detail.

## Hook configuration formats (cross-cutting)

Two formats depending on where the hook lives:

### Plugin format — `hooks/hooks.json`

Used when hooks are bundled in a plugin (e.g., what un-punt would ship). **Wrapper required**:

```json
{
  "description": "Brief explanation (optional)",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {"type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate.sh", "timeout": 10}
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/load-context.sh"}
        ]
      }
    ]
  }
}
```

### Settings format — `~/.claude/settings.json`

Used when hooks live in user settings (or merged in by an installer like un-punt's CLI). **Direct, no wrapper**:

```json
{
  "PreToolUse": [
    {"matcher": "Write|Edit", "hooks": [{"type": "command", "command": "..."}]}
  ]
}
```

**Key implication for un-punt**: depending on Q1c's outcome (skill-direct vs marketplace install), un-punt may use either format. The CLI install logic in `packages/cli/src/install.ts` currently merges `permissions.{allow,ask,deny}` from `adapters/claude-code/settings.json` into the user's settings.json — adding a `hooks` block to the same file follows the same pattern.

## Environment variables available in command hooks

| Variable | Available in | Purpose |
|---|---|---|
| `$CLAUDE_PROJECT_DIR` | All command hooks | Project root path |
| `$CLAUDE_PLUGIN_ROOT` | All command hooks | Plugin directory (use for portable paths) |
| `$CLAUDE_ENV_FILE` | SessionStart only | Persist env vars across the session |
| `$CLAUDE_CODE_REMOTE` | All command hooks | Set if running in remote context (vs local terminal) |

## Hook lifecycle and operational constraints

From the `plugin-dev:hook-development` skill:

- **Hooks load at session start.** Editing `hooks/hooks.json` or hook scripts requires Claude Code restart to take effect. Cannot hot-swap.
- **Hook validation at startup.** Invalid JSON in `hooks.json` causes loading failure; missing scripts cause warnings; syntax errors reported in `--debug` mode.
- **Parallel execution.** All matching hooks for an event run in parallel. Hooks don't see each other's output. Design for independence.
- **Plugin hooks merge with user hooks.** A plugin's hooks coexist with user-level hooks — both fire, in parallel.
- **Use `/hooks` slash command** to review loaded hooks in current session.
- **Use `claude --debug`** to see hook registration, execution logs, input/output JSON, timing.

## Recent changes / version history

| Event/feature | Added/changed | Version | Status |
|---|---|---|---|
| PreToolUse | Core | — | Stable |
| PostToolUse | Enhanced output replacement (`updatedToolOutput`) | v2.1.121 | Active |
| PermissionDenied | Added | v2.1.89 | Active |
| PreCompact | Added | v2.1.105 | Active |
| CwdChanged / FileChanged | Added | v2.1.83 | Active |
| TaskCreated / TaskCompleted | Added | v2.1.84 | Active |
| MCP Tool Support (all hooks) | Added | v2.1.118 | Active |
| Conditional Hooks (`if` field) | Added | v2.1.85 | Active |

**No explicit hook API versioning scheme** per the agent. Events are added/enhanced across minor releases; backwards-compatible.

## Un-punt v0.2 relevance summary

For Q5 architecture decision, the events most directly addressing v0.1's failed probes:

| Probe | Event candidates | Notes |
|---|---|---|
| 1, 2, 7 (description-match auto-load) | **SessionStart** | Fires unconditionally on session start; can inject `additionalContext` to load skill rules into Claude's awareness without relying on description-match |
| 4 (silent capture failed post-bootstrap) | **PostToolUse** with `matcher: "Edit\|Write\|MultiEdit"` | Fires after every tool call; can inject `additionalContext` reminding Claude to capture |
| 6, 8 (wrap-up suggestion silent) | **UserPromptSubmit** (preferred) or **Stop** | UserPromptSubmit fires before Claude reads — prompt-based hook can detect wrap-up phrases; Stop fires after Claude finishes — can `decision: block` to force Claude to offer suggestion before ending turn |
| Minor finding 5 (line-drift in items) | **FileChanged** | Could detect when a file referenced by an item is modified; trigger an item-recheck |
| Decision 14 (refusal layer) | **PreToolUse** with refusal-path matcher | Could complement `permissions.deny` with hook-level enforcement |

**Architecture note**: `type: "prompt"` mode (supported on PreToolUse, PostToolUse, Stop, SubagentStop, UserPromptSubmit) is the load-bearing discovery for the agent-as-engine concern raised earlier. Un-punt could ship hooks that hand each event to the model with un-punt's rules in the prompt, and let the model do the classification — preserving Decision 2 in spirit.

## Constraints check (against `v2-plan.md` non-negotiables)

This is a research catalog only — no architectural commitment yet. Constraint check is therefore mostly N/A; the constraints will bind in Q5c when an architecture is selected. Two notes:

| Constraint | Status |
|---|---|
| Cross-platform (Codex/Cursor/Copilot) | **N/A this session.** Q2 sub-sessions catalog the analogues for those platforms. |
| Agent is the engine (no separate classifier) | **Preliminary OK.** The `type: "prompt"` hook mode preserves this; the `type: "command"` mode does not unless the command refrains from classification work. Q4 evaluates the line. |
| All other constraints | N/A — this is a read-only catalog of platform capability |

## Change-my-mind

This conclusion would be invalidated if:

1. **The hook events catalog turns out to be incomplete or contains errors.** The `claude-code-guide` agent claimed to fetch from the canonical URL; if I open https://code.claude.com/docs/en/hooks.md and find events not in this catalog (or events listed here that don't exist), the catalog needs revision. Mitigation: this catalog is dated and includes the source URL — re-validate at the start of Q5c if implementation is more than 2 weeks out.
2. **`type: "prompt"` hooks behave differently than the skill describes** (e.g., they don't actually run the model with hook input as context, or their output mechanism is constrained beyond what the skill says). This would weaken the Decision 2 preservation argument. Mitigation: Q4 should include a small empirical test of a `type: "prompt"` hook before architecture commitment.
3. **Plugin hook behavior diverges from settings hook behavior** in ways that affect un-punt's install pattern. Q1c will explore this directly.

## Risks surfaced

- **Hook lifecycle constraint** (load-on-session-start, no hot-swap) means iteration during v0.2 development requires restart per change. Slows the dev loop. Mitigate by writing thorough test inputs and using `claude --debug`.
- **Parallel hook execution** means hooks must be designed independently; no shared state. If un-punt registers multiple hooks for the same event (e.g., capture-detect + wrap-up-detect both on PostToolUse), they run in parallel and don't see each other's output.
- **Default 60s command timeout / 30s prompt timeout** are large; un-punt's hooks should target sub-second to avoid perceptible agent latency. Q1d will frame the budget.
- **No documented hook API versioning** means this catalog is a snapshot at v2.1.126. Skew between Claude Code versions across users is a real concern for un-punt's deployment surface.
- **The `claude-code-guide` agent and the `plugin-dev` skill have minor inconsistencies** (e.g., agent enumerates `PostToolUseFailure` and `StopFailure` separately; skill collapses these under PostToolUse/Stop with implicit error handling). For Q5c, defer to the canonical docs URL for any disputed detail.

## Citations summary

- Canonical docs URL: https://code.claude.com/docs/en/hooks.md
- Changelog URL: https://code.claude.com/docs/en/changelog.md
- `claude-code-guide` agent run: 2026-05-02
- `plugin-dev:hook-development` skill loaded at: `~/.claude/plugins/cache/claude-plugins-official/plugin-dev/unknown/skills/hook-development/SKILL.md`
- Un-punt repo files referenced: `packages/cli/src/install.ts`, `docs/v2-plan.md`, `docs/v2-research-plan.md`
