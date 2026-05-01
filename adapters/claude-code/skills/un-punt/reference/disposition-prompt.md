# Disposition prompt

After every sweep, before any commit lands, the agent **always** asks the user where the cleanup commits should go. This is the gate that protects the user's current branch from unintentional mutation.

The prompt is canonical. Use the exact text below. Do not paraphrase, do not "improve" the wording, do not re-order the options.

---

## The prompt (verbatim)

```text
Done. N cleanup items completed in your working tree. Verified.
Choose:
  1. Commit on current branch as N commits prefixed "cleanup:"  (default)
  2. Commit on current branch as 1 squashed commit
  3. Move to separate branch un-punt/sweep-<id>; reset current branch
  4. Leave uncommitted — I'll commit manually
```

Substitutions:
- `N` — the number of items that completed verification (= will be committed).
- `<id>` — the sweep id (`<YYYY-MM-DD>-<scope-slug>`).

If `N == 0` (every fix-eligible item demoted to flag during execution): skip the prompt entirely. Print the report.md summary and stop.

---

## Per-option execution

### Option 1 — per-item commits on current branch (default)

For each `planned` item that completed verification:
1. Stage only the files modified for this item (`git add <files>`).
2. Run `git commit` with the canonical message format below — one item per commit.
3. Capture the commit SHA from `git rev-parse HEAD`.
4. Append a row to that item's `## Lifecycle` table: `<iso8601>` · `resolved` · `commit` · `<short-sha>`.
5. Update the item's frontmatter: `status: resolved`, `updated_at: <iso8601>`.

After all items processed: write `report.md` with `disposition: commits-on-current`. Delete `.un-punt/lock`.

### Option 2 — squashed single commit on current branch

1. Stage all modified files at once (`git add <all-changed-files>`).
2. Single `git commit`. Subject: `cleanup: <N> items in <scope>`. Body: the optional 1-paragraph summary, then the structured footer **repeated once per item** under blank lines (see *Commit message format* below).
3. Capture the SHA.
4. For each `planned` item: append the same SHA to that item's lifecycle table; flip `status: resolved`.

`report.md` records `disposition: squashed`.

### Option 3 — separate branch + reset

**Atomicity is non-negotiable: branch BEFORE reset.** If the order flips and the user Ctrl-Cs in between, work is lost.

1. Capture pre-sweep HEAD: `pre_sweep_head=$(cat .un-punt/sweeps/<id>/.pre-sweep-head)` — written by the sweep at start.
2. Execute Option 1's per-item commit loop on the current branch.
3. Capture post-sweep HEAD: `post_sweep_head=$(git rev-parse HEAD)`.
4. **`git branch un-punt/sweep-<id> "$post_sweep_head"`** — branch first.
5. **`git reset --hard "$pre_sweep_head"`** — then reset.
6. Verify the new branch exists (`git rev-parse --verify un-punt/sweep-<id>`); if missing, abort and surface the error before any reset.

`report.md` records `disposition: separate-branch`, `disposition_branch: un-punt/sweep-<id>`.

### Option 4 — leave uncommitted

1. Do not stage. Do not commit. Edits remain in the working tree.
2. For each `planned` item that completed verification: keep `status: planned`. Append a lifecycle row: `<iso8601>` · `planned` · `awaiting-manual-commit` · `—`.
3. `report.md` records `disposition: uncommitted`. Print: *"Cleanup edits left in your working tree. `git diff` to review, commit when ready. I'll back-fill the SHAs at the start of the next sweep."*
4. Delete `.un-punt/lock`.

#### Option 4 back-fill rule

At the start of every sweep, **before** loading items, scan for previously-`planned` items the user committed manually:

1. Read `last_sweep_end` from the most recent `report.md` (or `1970-01-01T00:00:00Z` if none).
2. Find all items with `status: planned` whose lifecycle ends in `awaiting-manual-commit`.
3. For each, read the file paths from the item's `file:` frontmatter.
4. Run `git log --since="$last_sweep_end" --pretty='%H %cE %s' -- <file>`.
5. Filter: committer email (`%cE`) matches the configured agent identity AND subject does NOT start with `cleanup:` AND the diff for that commit touches the line/symbol the item references.
6. Match → write a `<iso8601>` · `resolved` · `back-filled-commit` · `<short-sha>` row; flip `status: resolved`.

Skill announces back-fills at sweep start: *"Back-filled 3 items from manual commits since the last sweep."*

---

## Commit message format (canonical)

Every cleanup commit uses this exact shape. The `commit-receipts.png` screenshot in the README depends on it; deviations break the visible audit trail.

```
cleanup: <imperative subject, ≤72 chars>

<optional 1-paragraph body if the diff isn't self-evident>

Item: up-<8hex>
File: <repo-rel-path>:<line>
Why this: <1–2 sentences quoted from the item's ## Why deferred>
Why now safe: tests passed (<N>/<N>), tsc clean, eslint clean, <files-changed> file(s) +<added> -<removed>
Sweep: <YYYY-MM-DD-scope-slug>
```

### Field rules

- **`Item:`** — value matches the item file's frontmatter `id` exactly.
- **`File:`** — repo-relative; `:line` omitted only when the item is non-line-anchored.
- **`Why this:`** — content is *quoted* from the item's `## Why deferred` body, not paraphrased. Auditable against the source item.
- **`Why now safe:`** — list **only checks that ran**. If `tsc` wasn't on PATH and was skipped, omit the `tsc clean` token rather than asserting it. Diff stat from `git diff --shortstat HEAD~1`.
- **`Sweep:`** — matches the sweep directory name (`sweeps/<id>/`).

### Squashed (Option 2) variant

Subject: `cleanup: <N> items in <scope>`. Optional 1-paragraph body. The structured footer block is **repeated once per item, separated by blank lines**, all under the single subject:

```
cleanup: 3 items in src/auth

Tightened token typing, added an edge case for empty
session, replaced two skipped JWT tests.

Item: up-7f3a2b1c
File: src/auth/oauth.ts:142
Why this: Used `as any` to cast the response from `/oauth/token` to ship the happy path.
Why now safe: tests passed (84/84), tsc clean, 1 file +12 -3
Sweep: 2026-04-30-auth

Item: up-2d119e44
File: src/auth/session.ts:89
Why this: Skipped the empty-userId branch — the type allows it but we never tested.
Why now safe: tests passed (84/84), tsc clean, 1 file +6 -2
Sweep: 2026-04-30-auth

Item: up-9b41ee01
File: src/auth/jwt.test.ts:18
Why this: Two `.skip` cases marked when JWT verification was a stub.
Why now safe: tests passed (86/86), tsc clean, 1 file +14 -2
Sweep: 2026-04-30-auth
```

---

## What never appears in the disposition prompt

- A 5th option for "auto-push" — un-punt does not push to remotes.
- A "force-commit on protected branch" option — refused at pre-flight, not negotiated at disposition.
- A countdown / default timeout — the user always types the choice.
- An "abort and discard" — Ctrl-C does that. Mid-sweep state is just uncommitted edits; the user recovers however they normally would.
