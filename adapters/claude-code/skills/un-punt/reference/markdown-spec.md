# `.un-punt/` markdown spec

The on-disk format for items, sweeps, and supporting files. The agent reads and writes these via Edit / Write / Bash. There is no database and no index file.

---

## Directory layout

```text
.un-punt/
├── items/
│   └── up-<8hex>.md          ← one file per item
├── sweeps/
│   └── <YYYY-MM-DD>-<scope-slug>/
│       ├── plan.md
│       └── report.md
├── feedback.md               ← append-only log of user verdicts
├── contract.md               ← repo-local trust contract
└── lock                      ← present during active sweeps
```

`.un-punt/` is **gitignored by default**. Teams that want item history in git remove the line themselves.

There is no `INDEX.md`, no `slices/`, no `agent-runs/`, no `.un-punt-ignore`. If you find yourself wanting one, that's scope creep.

---

## Item file (`items/<id>.md`)

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
updated_at: 2026-04-30T15:32:18Z
---

# Tighten Token type

## Why deferred
Used `as any` to cast the response from `/oauth/token` to ship the
happy path. Should narrow to `OAuthToken | RefreshToken` based on
`grant_type`. Tighten when we touch the auth refresh flow next.

## Lifecycle
| When                  | Status   | Trigger | Reference                |
|-----------------------|----------|---------|--------------------------|
| 2026-04-30T15:32:18Z  | open     | capture | session: 2026-04-30-pkce |
```

### Frontmatter fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | `up-` + 8-char content hash — see [`id-derivation.md`](id-derivation.md) |
| `type` | enum | yes | One of the 6 item types (below) |
| `status` | enum | yes | `open`, `planned`, `resolved`, `dismissed` |
| `file` | string | yes | Repo-relative path, forward slashes |
| `line` | int | no | Single line number; omit (or `null`) for non-line-anchored |
| `symbol` | string | no | Nearest enclosing function/class — purely informational |
| `confidence` | float | yes | `0.0`–`1.0` — the agent's single judgment number, not a formula |
| `created_at` | iso8601 | yes | UTC; unquoted YAML 1.2 timestamp |
| `updated_at` | iso8601 | yes | UTC; unquoted YAML 1.2 timestamp |

### Item types (6)

| Type | Captures |
|---|---|
| `deferred-implementation` | `TODO` / `FIXME` / `XXX` / missing edge cases / deprecated-API call left in place |
| `type-loosened` | `any`, `as any`, `@ts-ignore`, `# type: ignore`, `: any` |
| `skipped-test` | `.skip`, `xit`, `it.todo`, `@pytest.mark.skip`, `t.Skip()` |
| `hack-workaround` | Explicit `HACK` / `KLUDGE` language; swallowed exceptions; mocks leaking into prod code |
| `duplicated-code` | Observed-but-not-DRYed duplication; dead code (multiple signals required) |
| `other` | Fallback. Agent provides a clear `## Why deferred`. |

### Body sections

- **`# <title>`** (required) — short summary, ≤80 chars.
- **`## Why deferred`** (required) — plain text. The deferral context **is the provenance**. Quote the user's request or the agent's own reasoning inline; do not write separate slice files.
- **`## Lifecycle`** (required) — append-only markdown table; one row per state transition. Columns: `When` (UTC iso8601) · `Status` · `Trigger` · `Reference`.

`## Notes` and other free-form sections are allowed; the agent doesn't need permission.

### YAML quoting (the Norway problem)

YAML 1.1 loaders parse unquoted `no` / `off` / `yes` as booleans, and bare `01` as octal. **Quote any string field whose value could be ambiguous** — `symbol: "no"`, `file: "01-init.sql"`. ID, file, and symbol are always treated as strings on read regardless of quoting; quoting on write is the only safe path.

---

## Lifecycle state machine

Three states. History lives in the lifecycle table.

```text
   open ──── planned ──── resolved
     ▲                       │
     └──── dismissed ◄───────┘   (re-detection of a resolved item flips to open)
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

Skill enforces transitions: read current `status` from frontmatter first, refuse disallowed transitions, append a row, update `status` and `updated_at`. See [`../snippets/lifecycle.md`](../snippets/lifecycle.md) for the procedure.

---

## Sweep files (`sweeps/<sweep-id>/`)

Sweep IDs: `<YYYY-MM-DD>-<scope-slug>`. If `sweeps/<id>/` already exists, append `-2`, `-3`, … until unique.

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
disposition_branch: un-punt/sweep-2026-04-30-auth
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

**No per-item `agent-runs/` files.** The two receipts (*why this* + *why now safe*) live in the **commit message**; the lifecycle table on the item file references the commit SHA. Git already preserves the rest.

---

## `contract.md`

The repo-local trust contract: will-attempt thresholds + per-repo overrides. **Loaded once per sweep at sweep-start and held in memory for the duration** — mid-sweep mutations to the file on disk do not affect the running sweep (defends against the hostile-mid-sweep-mutation attack). See [`contract-template.md`](contract-template.md) for the shape.

---

## `feedback.md`

Append-only log of user verdicts. One markdown section per entry. Two top-level subheadings:

- **`## Resolved`** — entries the calibration loop has applied (threshold raised, refusal added).
- **`## Pending judgment`** — ambiguous entries the agent set aside to ask about at the next sweep start.

The agent moves entries between the two as it processes them. Newest-first within each section.

```markdown
## Resolved

### 2026-04-30T18:00:00Z — sweep:2026-04-30-auth — rejected

The Token type tightening broke a test I had locally. The third-party
SDK returns inconsistent shapes; we need the loose type on purpose.

→ Calibration applied: raised `type-loosened` threshold for `src/auth/**`
  from 0.80 to 0.92.

## Pending judgment

### 2026-05-02T10:14:00Z — sweep:2026-05-02-billing — kind of OK

The dedup in `lib/format.ts` was kind of OK but not great — please
ask me next time.

→ Awaiting clarification at next sweep start.
```

---

## `lock` (concurrency)

Single file at `.un-punt/lock` containing three lines:

```
<sweep-id>
<iso8601-start>
<pid>
```

The skill creates it at sweep start and refuses if one already exists. Lock cleanup is the skill's responsibility:

- Successful sweep (after `report.md` written) → delete the lock.
- Skill-handled error path (verification fail-stop, user cancel, conflict halt) → delete the lock before exiting.
- Hard crash (Ctrl-C, API outage mid-write, kill) → lock remains. Later session detects staleness via `ps -p <pid>` (no such process → stale; offer to remove).

---

## Versioning

Format version is implicit in fields used. Skill handles backward compat: new items written in current format; old items read as-is. No explicit migration tooling at MVP — add `un-punt migrate` only when a real format change requires it.

If a stricter contract is ever needed, the natural fallback is a single optional `schema_version: 1` frontmatter key.
