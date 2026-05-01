# Lifecycle update procedure

Every state change on an item appends a row to its `## Lifecycle` table and updates the frontmatter `status` + `updated_at`. The skill enforces transitions; disallowed ones must be refused.

---

## State machine

```text
   open ──── planned ──── resolved
     ▲                       │
     └──── dismissed ◄───────┘   (re-detection of a resolved item flips to open)
```

| Transition | Trigger value (column 3) | Reference (column 4) |
|---|---|---|
| capture → `open` | `capture` | `session: <session-id>` |
| `open` → `planned` | `sweep` | `<sweep-id>` |
| `planned` → `resolved` | `commit` | `<short-sha>` |
| `planned` → `open` | `verification-failed` | `<sweep-id>: <reason>` |
| `open` → `dismissed` | `user-skip` | `<sweep-id>` or `feedback` |
| `resolved` → `open` | `re-detected` | `session: <session-id>` |
| `dismissed` → `open` | `user-revisit` | `<session-id>` |
| `planned` → `planned` | `awaiting-manual-commit` | `—` (Option 4 disposition) |

Any other transition is **disallowed**. Refuse and log:

> *Cannot transition `<id>` from `<current>` to `<requested>` — not in the state machine.*

---

## The procedure (every transition)

```text
1. Read the item file at .un-punt/items/<id>.md
2. Parse the YAML frontmatter; extract current `status`
3. If (current → requested) is not in the allowed transitions above → refuse, stop
4. Compute `now = <iso8601 UTC>`
5. Append a row to the ## Lifecycle table:
   | <now> | <new-status> | <trigger> | <reference> |
6. Update frontmatter:
   status: <new-status>
   updated_at: <now>
7. Write the file back (single atomic write: same content + the appended row + the updated frontmatter)
```

**Read first, then write.** Don't blind-write — you'll clobber lifecycle rows another session added.

---

## Markdown table append (correct shape)

The lifecycle table is a standard markdown table with three trailing rows that look like:

```markdown
## Lifecycle
| When                  | Status   | Trigger              | Reference                |
|-----------------------|----------|----------------------|--------------------------|
| 2026-04-30T15:32:18Z  | open     | capture              | session: 2026-04-30-pkce |
| 2026-04-30T17:14:02Z  | planned  | sweep                | 2026-04-30-auth          |
```

To append: read the file, find the `## Lifecycle` heading, find the last row of the table (the line that starts with `|` and isn't the header / separator), insert the new row immediately after it, write back.

Column widths can drift — markdown is forgiving. Don't try to pad to constant widths; that's churn the diff doesn't need.

---

## Common transitions in context

### Capture (a new deferral spotted during work)

```
status: open       (created — frontmatter)
trigger: capture
reference: session: <session-id-or-iso-date-of-current-session>
```

If the item file already exists (same `id` because same `(type, file, line)`): this is a re-capture. **Don't overwrite.** Append a row noting `re-capture`:

```
| 2026-05-15T10:14:00Z | open | re-capture | session: 2026-05-15-billing |
```

Frontmatter `updated_at` advances; `status` stays `open`.

### Sweep planning (item picked into a plan)

```
status: planned
trigger: sweep
reference: <sweep-id>
```

### Commit (after disposition options 1, 2, 3)

```
status: resolved
trigger: commit
reference: <short-sha>
```

### Verification failed (rolled back during sweep execution)

```
status: open
trigger: verification-failed
reference: <sweep-id>: <one-line reason>
```

The fix attempt is rolled back from the working tree; the item is back to `open` for the next sweep to consider.

### User skip during plan review

```
status: dismissed
trigger: user-skip
reference: <sweep-id>
```

`dismissed` is a soft state — a future `--revisit` flips it back to `open`. Re-detection from the source code does NOT flip a `dismissed` item back; only the user does (via `--revisit` or by re-adding the comment after a revert).

### Regression (resolved item re-appears in source)

```
status: open
trigger: re-detected
reference: session: <session-id>
```

The item file already exists with `status: resolved`; re-detection appends a new row and flips `status` back to `open`. The historical `commit` row remains in the table.

---

## Things this procedure deliberately doesn't do

- ❌ Compact / rewrite old lifecycle rows (history is append-only by definition).
- ❌ Move an item file when a transition occurs (file paths are stable per-id).
- ❌ Delete an item file when it reaches `dismissed` (the file remains; the user can `--revisit`).
- ❌ Rewrite the frontmatter `created_at` (that's set once at capture).
