# 04 — Data Model (Markdown Spec)

There is no database. The data model is a directory of markdown files in `.un-punt/`, edited by the user's AI agent.

The shape — YAML frontmatter + markdown body — mirrors what agents already read fluently: Claude Code's `SKILL.md`, Cursor's `.cursor/rules/*.mdc`, and GitHub Copilot's `*.instructions.md` all use the same convention. ([refs](#references))

---

## Glossary

Terms used across the docs. The product UX uses the user-facing terms; design and risk docs may use the broader category words.

| Term | Meaning |
|---|---|
| **deferral** | Any moment the agent skipped, loosened, or postponed something during normal work — TODO, `as any`, `.skip`, swallowed exception, "I'll come back to this." The capture event. |
| **deferred** | The state of a piece of work that was deferred. Neutral; describes state without judgment. |
| **item** | The markdown file at `.un-punt/items/<id>.md` that records a deferral. Has frontmatter, a `## Why deferred` body, and a lifecycle table. |
| **cleanup** | The user-facing word for what un-punt does. Action-oriented. *Use this in product UX.* |
| **follow-up** | Synonym for "cleanup item" in conversational UX. *Use this in product UX.* |
| **loose end** | Synonym for a deferral the user wants to revisit. *Use this in product UX.* |
| **debt** | Internal/strategic term for the accumulated cost of unresolved deferrals. *Avoid in product UX* (per [`08-design-decisions.md`](08-design-decisions.md) decision 10). Fine in vision/risks/decisions docs and external marketing. |
| **sweep** | A single pass through the open items proposing fixes and flags. Lives in `.un-punt/sweeps/<id>/` with a `plan.md` and `report.md`. |
| **lifecycle** | The append-only table on each item file recording every state transition (capture → planned → resolved, or → dismissed). |
| **contract** | The repo-local trust contract at `.un-punt/contract.md`: will-attempt thresholds, will-not-touch zones. Per-repo overrides allowed; categorical refusals are not overrideable. |
| **disposition** | The 4-option prompt the agent emits at sweep end (commit-on-current / squashed / separate-branch / leave-uncommitted). The gate protecting the user's branch. |
| **flag** | A surfaced item the agent refuses or can't safely fix. *A flag is success* — see [`02-experience.md`](02-experience.md) §The trust contract. |

---

## Directory layout

```text
.un-punt/
├── items/
│   └── up-7f3a.md          ← one file per item
├── sweeps/
│   └── 2026-04-30-auth/   ← one directory per sweep
│       ├── plan.md
│       └── report.md
├── feedback.md            ← append-only log of user verdicts
├── contract.md            ← trust contract for this repo
└── lock                   ← present during active sweeps
```

`.un-punt/` is **gitignored by default**. Teams that want item history in git can opt in by removing the line.

No `INDEX.md`, no `slices/`, no `agent-runs/`, no `feedback/` directory, no `.un-punt-ignore`, no `skill-overrides.md`. If you find yourself wanting one of those, that's a sign of scope creep.

---

## Item file format

Each item is a single markdown file at `.un-punt/items/<id>.md`.

```markdown
---
id: up-7f3a2b1c
type: deferred-implementation
status: open
file: src/auth/oauth.ts
line: 142
symbol: refreshToken
confidence: 0.87
created_at: 2026-04-30T15:32:18Z
updated_at: 2026-04-30T17:18:45Z
---

# Tighten Token type

## Why deferred
Used `as any` to cast the response from `/oauth/token` to ship the happy path.
Should narrow to `OAuthToken | RefreshToken` based on `grant_type`. Tighten when
we touch the auth refresh flow next.

## Lifecycle
| When                   | Status   | Trigger | Reference                |
|------------------------|----------|---------|--------------------------|
| 2026-04-30T15:32:18Z   | open     | capture | session: 2026-04-30-pkce |
| 2026-04-30T17:14:02Z   | planned  | sweep   | 2026-04-30-auth          |
| 2026-04-30T17:18:45Z   | resolved | commit  | abc1234                  |
```

### Field reference

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | `w-` + 8-char content hash (see ID derivation) |
| `type` | enum | yes | One of 6 types (below) |
| `status` | enum | yes | `open`, `planned`, `resolved`, `dismissed` |
| `file` | string | yes | Repo-relative path |
| `line` | int | no | Single line number (or null for non-line-anchored) |
| `symbol` | string | no | Nearest enclosing function/class |
| `confidence` | float | yes | [0, 1] — agent's single confidence number |
| `created_at` | iso8601 | yes | UTC; written unquoted (YAML 1.2 timestamp) |
| `updated_at` | iso8601 | yes | UTC; same as above |

> **YAML parsing note.** YAML's [Norway problem](#references) (unquoted `no`/`off`/`yes` parse as booleans; bare numbers like `01` may parse as octal) bites generated content. The agent SHOULD quote any string field whose value could be ambiguous (`symbol: "no"`, `file: "01-init.sql"`). All ID, file, and symbol fields above are treated as strings regardless of quoting on the read side.

### Item types (6)

- `deferred-implementation` — TODO with clear intent that wasn't implemented (covers TODO/FIXME/missing-edge-cases/deprecated-api migration)
- `type-loosened` — `any`, `as any`, `@ts-ignore`, `# type: ignore`
- `skipped-test` — `.skip`, `xit`, `it.todo`, `@pytest.mark.skip`
- `hack-workaround` — explicit "hack"/"workaround" language; swallowed exceptions; mocks leaking into prod code
- `duplicated-code` — observed-but-not-DRYed duplication; dead code (multiple signals required)
- `other` — fallback; agent provides clear `## Why deferred`

### Body sections

- **`# <title>`** (required) — short summary, ≤80 chars
- **`## Why deferred`** (required) — the deferral reason in plain text. **This IS the provenance.** The agent quotes whatever brief context it needs (the user's request, its own reasoning) inline. No separate slice files.
- **`## Lifecycle`** (required) — append-only table; one row per state transition. Markdown tables are the highest-fidelity tabular shape for LLMs to round-trip — heavily represented in training corpora and easier to scan than JSON or HTML ([refs](#references))

The agent can add `## Notes` or other free-form sections without our pre-specifying.

---

## Lifecycle state machine

Three states. History lives in the lifecycle table.

```text
   open ──── planned ──── resolved
     ▲                       │
     └──── dismissed ◄───────┘ (re-detection of a resolved item flips to open)
```

| Transition | Trigger |
|---|---|
| capture → `open` | New item written |
| `open` → `planned` | Planner picks for sweep |
| `planned` → `resolved` | Verified diff committed |
| `planned` → `open` | Verification failed; demoted (no fix produced) |
| `open` → `dismissed` | User skipped during plan review or via feedback |
| `resolved` → `open` | Signal re-detected (regression) |
| `dismissed` → `open` | Only with `--revisit` |

Skill enforces transitions. Every state change appends a lifecycle row; frontmatter `status` updates.

---

## ID derivation

```text
id = "up-" + first_8_chars( sha256(type + ":" + file_path + ":" + line) )
```

That's it. No "canonical signature." No "normalized surrounding code."

Properties:
- Same `(type, file, line)` discovered twice → same ID → file already exists, agent appends to lifecycle
- Item drifts to a different line → new ID, lifecycle in old file gets a final row noting the rename
- Item removed and re-added → same ID → status flips to `open` (regression detected)

If "same item drifted lines" turns out to matter in practice, we add symbol-based fallback later.

---

## Sweep file format

A sweep is a directory at `.un-punt/sweeps/<sweep-id>/`. Sweep IDs: `<YYYY-MM-DD>-<scope-slug>`.

### `plan.md`

```markdown
---
sweep_id: 2026-04-30-auth
scope_kind: path
scope_value: ./src/auth
trigger: agent-suggested
contract_version: 1
started_at: 2026-04-30T17:14:00Z
---

# Plan

## Fix (high confidence — 4)
- [up-7f3a2b1c](../../items/up-7f3a2b1c.md) — src/auth/oauth.ts:142 — Tighten Token type
- [up-2d119e44](../../items/up-2d119e44.md) — src/auth/session.ts:89 — Handle null userId
...

## Flag (lower confidence — 4)
- [up-8e22aaff](../../items/up-8e22aaff.md) — src/auth/api.ts:55 — Patched JWT clock skew
...

## Refused (3)
- [up-bb01e3d4](../../items/up-bb01e3d4.md) — migrations/0042.sql — DB migration zone
...
```

### `report.md`

```markdown
---
sweep_id: 2026-04-30-auth
ended_at: 2026-04-30T17:18:45Z
status: completed
disposition: separate-branch
disposition_branch: un-punt/sweep-2026-04-30
---

# Sweep Report

## Outcome
- Fixed: 4 / 5 attempted
- Flagged: 5
- Refused: 3
- 1 attempted fix demoted to flag (verification failed)

## Disposition
User chose option 3 — separate branch. Current branch reset to pre-sweep HEAD.
```

**No per-item `agent-runs/` files.** Receipts (*why this* + *why now safe*) live in the **commit message** itself. The lifecycle table on the item file references the commit SHA. That's all the audit trail we need — git already preserves the rest.

---

## Other files

- **`contract.md`** — trust contract for the repo: will-attempt operations with thresholds, will-not-touch zones. Plain markdown. **Loaded once per sweep at sweep-start and held as an in-memory snapshot for the duration**; mid-sweep mutations to the file on disk do not affect the running sweep (defends against the hostile-mid-sweep-mutation attack — see [`03-architecture.md`](03-architecture.md) Threat model row).
- **`feedback.md`** — append-only log of user verdicts. One markdown section per entry, newest first or oldest first; the agent reads all of it on next sweep. Two top-level subheading conventions: **`## Resolved`** for entries the calibration loop applied (threshold raised, refusal added) and **`## Pending judgment`** for ambiguous entries the agent set aside to ask about at the next sweep start (see [`05-skill-brief.md`](05-skill-brief.md) §9 — ambiguous feedback edge case). The agent moves entries between the two as it processes them.

Example `feedback.md` entry:

```markdown
## Resolved

### 2026-04-30T18:00:00Z — sweep:2026-04-30-auth — rejected

The Token type tightening broke a test I had locally. The third-party SDK
returns inconsistent shapes; we need the loose type on purpose.

→ Calibration applied: raised `type-loosened` threshold for `src/auth/**` from 0.80 to 0.92.

## Pending judgment

### 2026-05-02T10:14:00Z — sweep:2026-05-02-billing — kind of OK

The dedup in `lib/format.ts` was kind of OK but not great — please ask me next time.

→ Awaiting clarification at next sweep start.
```

---

## Concurrency

Single lock file at `.un-punt/lock` containing `<sweep-id>\n<iso8601-start>\n<pid>`. Skill creates it at sweep start, refuses if one already exists.

**Lock cleanup is the skill's responsibility:**

- On successful sweep completion (after `report.md` is written) → delete the lock.
- On any error path the skill itself handles (verification fail-stop, user cancel, conflict halt) → delete the lock before exiting.
- On hard crash (Ctrl-C, LLM API outage mid-write, process kill) → lock remains; the user removes it manually. The lock's `pid` field lets a later session detect staleness (`ps -p <pid>` empty → stale).

Sufficient for single-dev-per-repo; multi-dev coordination later.

---

## Storage estimates

Solo-dev repo, one year: items (~2k × 3KB = 6MB) + sweeps (~200 × 5KB = 1MB) + feedback.md (~50KB) ≈ **~7 MB / repo / year**. `rg` over the tree is sub-second.

---

## Versioning

Format version is implicit in fields used. Skills handle backward compat. New items written in current format; old items work as-is. No explicit migration tooling at MVP — add `un-punt migrate` only when a real format change requires it.

If a stricter contract is ever needed, the natural fallback is a single optional `schema_version: 1` frontmatter key — matching the additive pattern Cursor's MDC and GitHub Copilot's `applyTo` headers use today. We don't ship that until the first real break.

---

## What this data model deliberately doesn't track

- ❌ Code content (read live from working tree)
- ❌ Conversation transcripts of any kind (we don't read JSONL files; "why deferred" is the only context we keep)
- ❌ Per-keystroke or per-session history
- ❌ Cross-repo relationships (single-repo first)
- ❌ User identity beyond `git config`
- ❌ Network telemetry (opt-in, separate file when added)

Read [`05-skill-brief.md`](05-skill-brief.md) next for what the skill must teach.

---

## References

Conventions this format intentionally tracks:

- [Claude Code — Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — `SKILL.md` = YAML frontmatter (`name`, `description`, optional `allowed-tools`) + markdown body. Same shape as our item files.
- [Claude Code — Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — frontmatter validation rules (lowercase-hyphen names, length caps); informs our ID/slug conventions.
- [Cursor — `.cursor/rules` MDC reference](https://github.com/sanjeed5/awesome-cursor-rules-mdc/blob/main/cursor-rules-reference.md) — directory-of-files pattern with per-file YAML frontmatter (`description`, `globs`, `alwaysApply`). Matches our `items/` and `sweeps/` layout.
- [GitHub Copilot — repository custom instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) — `.github/copilot-instructions.md` and `*.instructions.md` with `applyTo` frontmatter; precedent for committed, agent-readable markdown at repo root.
- [AGENTS.md open standard](https://agents.md/) — plain markdown, no special syntax; supported by Aider, Cursor, Codex, Gemini CLI. Reinforces our choice not to invent a custom DSL.
- [Aider — coding conventions](https://aider.chat/docs/usage/conventions.html) — `CONVENTIONS.md` is just markdown loaded via `--read`. Same minimal-ceremony philosophy as our `contract.md`.

Format-choice evidence:

- [Improving Agents — Which nested data format do LLMs understand best?](https://www.improvingagents.com/blog/best-nested-data-format/) — YAML beats XML by ~17.7 pp on small models; markdown bodies score well too. Backs YAML-frontmatter + markdown over JSON-everywhere.
- [Improving Agents — Which table format do LLMs understand best?](https://www.improvingagents.com/blog/best-input-data-format-for-llms/) — markdown tables outperform JSON/HTML for tabular reads, and are the easiest format for LLMs to *generate* correctly given training-data density. Justifies the lifecycle table.
- [Frontmatter-first context-window survival](https://medium.com/@michael.hannecke/frontmatter-first-is-not-optional-context-window-survival-for-local-llms-in-opencode-15809b207977) — agents extract structured key-value pairs from frontmatter ~30–40% more accurately than from prose. Why we put `id`, `status`, `confidence` in frontmatter instead of inline.
- [The Norway problem (`hitchdev`)](https://hitchdev.com/strictyaml/why/implicit-typing-removed/) — unquoted `no`, `off`, version strings, leading-zero numbers can mis-parse in YAML 1.1 loaders. Why we recommend quoting ambiguous strings.
