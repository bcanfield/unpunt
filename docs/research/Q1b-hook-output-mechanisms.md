# Q1b — Claude Code hook output mechanisms

> Research session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Continuation of Q1a context via the `cc-docs` agent.

## Question

What are all the ways a hook script can affect Claude's behavior, and when should you use each?

## Sources consulted

| Source | Provided |
|---|---|
| `cc-docs` agent (continued from Q1a) | Output-mechanism decision tree mapped to events, with citations to canonical docs |
| https://code.claude.com/docs/en/hooks.md | Authoritative reference for output schemas |
| https://code.claude.com/docs/en/plugins-reference.md | `${CLAUDE_PLUGIN_ROOT}` substitution and plugin hook conventions |

## Headline finding

A hook can do **10 distinct things** to affect agent behavior, ranging from passive context injection to outright session termination. **`additionalContext` is the workhorse** for non-blocking influence (supported on nearly every event); **`decision: "block"`** is the workhorse for blocking actions (supported on most events but with event-specific semantics). Two output-field families coexist — top-level (`continue`, `systemMessage`, `decision`, `suppressOutput`) and event-specific (`hookSpecificOutput.*`) — with subtle precedence rules. Command vs prompt hooks support the same output mechanisms; only the invocation differs (shell vs model).

## The 10 intents → mechanism decision tree

| Intent | Mechanism | Events that support it | Format | Constraints / notes |
|---|---|---|---|---|
| **Inject context Claude reads** | `hookSpecificOutput.additionalContext` | SessionStart, SubagentStart, UserPromptSubmit, UserPromptExpansion, PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch | `{"hookSpecificOutput": {"additionalContext": "text"}}` | Wrapped in system reminder; no documented hard token limit (effective cost = session context budget). Works in both command and prompt hooks. |
| **Add a user-facing system warning** | top-level `systemMessage` | All events | `{"systemMessage": "Warning: ..."}` | User sees it (distinct from `additionalContext` which is Claude-facing). Both fields can coexist in one response. |
| **Block a tool from running** | Exit 2 + stderr (command) OR `permissionDecision: "deny"` (PreToolUse) OR `decision: "block"` (other events) | PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch, Stop, UserPromptSubmit, SubagentStop, ConfigChange, PreCompact | Per-event JSON shape (see hooks.md); command hooks can shortcut via exit 2 | "Block" semantics differ per event: PreToolUse prevents execution; PostToolUse/Stop suppress the response. |
| **Allow a tool with modifications** | `hookSpecificOutput.permissionDecision: "allow"` + `updatedInput` | PreToolUse only | `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow", "updatedInput": {...}}}` | PermissionRequest event also supports `updatedInput`. |
| **Defer permission decision to user** | `hookSpecificOutput.permissionDecision: "defer"` | PreToolUse only | `{"hookSpecificOutput": {"permissionDecision": "defer"}}` | Requires Claude Code running with permission-prompt flag. |
| **Programmatically add permission rules** | `hookSpecificOutput.decision.updatedPermissions` array | PermissionRequest only | `{"hookSpecificOutput": {"hookEventName": "PermissionRequest", "decision": {"updatedPermissions": [{...}]}}}` | Can scope to `localSettings`, `projectSettings`, or `userSettings`. |
| **Set the session title** | `sessionTitle` field | UserPromptSubmit, UserPromptExpansion | `{"sessionTitle": "Custom Title"}` | No documented length limit. |
| **Silently log/observe** | command hook with exit 0 + minimal/empty output | Any event | Exit 0 + `{}` or `{"continue": true}` | Useful for telemetry; no flow effect. |
| **Halt the session entirely** | top-level `continue: false` | All events | `{"continue": false, "stopReason": "message"}` | Stops Claude entirely (not just the current action). Use sparingly. |
| **Replace tool output Claude sees** | **Undocumented** in current canonical docs | PostToolUse / PostToolUseFailure (implied by event purpose, not documented) | Unclear | ⚠️ **CONFLICT WITH Q1a**: Q1a's agent claimed `updatedToolOutput` was added in v2.1.121. Q1b's same agent now reports the mechanism is undocumented. One of these is wrong. **Action**: re-validate against canonical docs URL before any architecture decision relies on this mechanism. |

## Field relationships and precedence

The agent's clarification on how output fields coexist:

### Exit codes (command hooks only)

- **Exit 0** → parse JSON output if present; if no JSON, treat plain stdout as observation/context
- **Exit 2** → blocking error; stderr fed to Claude; JSON ignored
- **Other non-zero** → non-blocking error logged

### `continue: false` vs `decision: "block"`

- `continue: false` → halts the **entire session**
- `decision: "block"` → blocks the **current action** (one tool call, one prompt, one turn)

This is the most likely-to-be-confused pair. `block` is the surgical option; `continue: false` is the nuclear option.

### `systemMessage` vs `additionalContext`

- `systemMessage` → **user-facing warning** (shown to the human user)
- `additionalContext` → **Claude-facing context** (wrapped in system reminder, agent reads it)

Both can be set in the same response without conflict. They serve different audiences.

### `suppressOutput`

- Boolean. If true, omits hook stdout from the debug log.
- Use case: privacy/secrets. Don't use to suppress mistakes; fix the mistakes instead.

### `hookSpecificOutput` vs top-level fields

- Some events use the `hookSpecificOutput` wrapper with event-specific nested fields (e.g., `permissionDecision` for PreToolUse, `updatedToolOutput` for Post* events if it exists, `additionalContext` for context injection).
- Other events use top-level fields directly (e.g., `decision: "block"` at the top level for PostToolUse).
- The exact JSON shape per event is in https://code.claude.com/docs/en/hooks.md — **always check per-event before writing a hook**.

## Command vs prompt hook output mechanisms

Both support the same output mechanisms. The difference is purely in invocation:

- **Command hooks** can use exit codes as a shortcut (exit 2 = block + stderr) plus full JSON output flexibility
- **Prompt hooks** return JSON from the model; the model's reasoning produces the JSON values

In practice:
- **Command hooks** are more flexible for complex logic, filesystem access, external systems
- **Prompt hooks** are simpler for binary judgment calls ("is this safe?", "is this a wrap-up signal?") because the model handles them naturally

This confirms Q1a's finding that `type: "prompt"` mode is architecturally significant for un-punt's "agent-as-engine" preservation — the model still does the reasoning even inside the hook.

## Architectural implications for un-punt v0.2 (preliminary, defer to Q5)

Mapping the 10 intents to un-punt's failed probes:

| v0.1 probe failure | Most natural mechanism | Why |
|---|---|---|
| Probes 1, 2, 7 — skill not loaded on session start | SessionStart + `additionalContext` | Inject the activation reminder Claude needs |
| Probe 4 — silent capture failed during work | PostToolUse + `additionalContext` | Inject capture reminder after each Edit/Write/MultiEdit |
| Probes 6, 8 — wrap-up suggestion silent | UserPromptSubmit + `additionalContext` | Inject suggestion-trigger reminder before Claude reads the wrap-up phrase |

**No `decision: "block"` is needed for v0.2 capture/suggestion fixes** — `additionalContext` is the right surgical tool. We don't want to block the user's flow; we want to ensure Claude sees the right context. This narrows the architecture: **non-blocking, context-injecting hooks** are the right primitive for the v0.1 dogfood failures.

This also means **`type: "prompt"` hooks are arguably unnecessary** for the failure cases above — `additionalContext` from a fast command hook achieves the same result without invoking the model twice (once in the hook, once in the agent turn). **Q4 will weigh this.**

## Source-conflict flagged for re-validation

⚠️ **Q1a vs Q1b internal disagreement on `updatedToolOutput`**: Q1a's agent said this output mechanism for PostToolUse was added in Claude Code v2.1.121. Q1b's same agent (continued via SendMessage) now reports the mechanism is undocumented. Two possibilities:

1. The agent's first claim was hallucinated/incorrect, and on more careful read of docs, the mechanism doesn't exist (or exists but isn't in the canonical docs).
2. The mechanism does exist but the docs are inconsistent.

**Action**: before any v0.2 architecture relies on tool-output-replacement, manually verify by reading https://code.claude.com/docs/en/hooks.md and https://code.claude.com/docs/en/changelog.md (v2.1.121 entry) directly. For now, treat as undocumented.

This conflict also illustrates why the methodology's "source-conflict resolution" rule matters — both findings are recorded, the conflict is flagged, and downstream sessions can re-validate.

## Constraints check

**N/A this session — capability discovery only.** Constraints will bind in Q5c when a specific architecture is selected. One preliminary note: the use of `additionalContext` for un-punt's needs is consistent with Decision 2 (agent is engine) since the agent decides what to do with the injected context — the hook itself isn't classifying.

## Change-my-mind

This conclusion would be invalidated if:

1. **`additionalContext` turns out to have an effective character/token limit** small enough that un-punt's reminder content gets truncated. The agent says no documented hard limit, but session context budgets impose a practical ceiling. **Mitigation**: keep reminders compact; budget under 500 tokens per injection; test in Q4/Q5 implementation.
2. **The `updatedToolOutput` mechanism does or doesn't exist** as Q1a claimed — relevant if v0.2 ever wants to redact tool output (e.g., for refusal layer). Not needed for the four failed probes; deferred.
3. **Some event's `additionalContext` behavior differs** from the documented Anthropic norm (e.g., gets truncated at a per-event limit, gets dropped by the agent silently, or fires after the agent has already locked in a response). **Mitigation**: smoke-test the mechanism in Q4 before committing to architecture.

## Risks surfaced

- **Field-precedence confusion**: `continue` vs `decision`, `systemMessage` vs `additionalContext` — easy to confuse. Hook authors will need a checklist or template.
- **Per-event JSON shape variance**: every event has a slightly different shape; no uniform schema. Documentation discipline matters.
- **`suppressOutput` is observability-degrading**: tempting to use to "clean up" debug logs but hides legitimate signal. Should not be used in v0.2 hooks.
- **Conflict between Q1a and Q1b on `updatedToolOutput`**: small but real signal that the agent's docs reading isn't 100% reliable. Mitigation: re-validate against canonical URLs before any v0.2 architecture decision relies on a single agent-reported field.
- **Undocumented behavior is undocumented for a reason**: don't build on `updatedToolOutput` until verified.
