# Cold-start inventory

When `/un-punt` is invoked AND `.un-punt/items/` is empty (or the directory doesn't exist), this is the user's first run on this repo. Run the guided inventory once.

---

## Trigger

```bash
test ! -d .un-punt/items || test -z "$(ls -A .un-punt/items 2>/dev/null)"
```

If true → cold-start. If false → skip; fall through to normal sweep planning.

---

## Step 1 — Acknowledge

Say one line, in the agent's natural voice:

> *First time on this repo — let me inventory existing follow-ups. Roughly 5 minutes; I'll cap at 200 hits and check in.*

Don't dump the methodology on the user. Just go.

---

## Step 2 — Run the standard pattern set

```bash
# TODOs
rg --no-heading --line-number -e '\b(TODO|FIXME|XXX|HACK|WIP|KLUDGE|LATER)\b'

# Type loosening
rg --no-heading --line-number -e '\bas any\b' -e '@ts-ignore' -e '# type: ignore' -e ':\s*any\b'

# Skipped tests
rg --no-heading --line-number -e '\.skip\b' -e '\bxit\b' -e 'it\.todo' -e '@pytest\.mark\.skip' -e 't\.Skip\(\)'

# Empty catches / passes
rg --no-heading --line-number --multiline -e 'catch[^{]*\{\s*\}' -e 'except[^:]*:\s*pass'

# Unimplemented
rg --no-heading --line-number -e 'throw new Error\("not implemented"\)' -e 'unimplemented!\(\)' -e 'panic!\("TODO"\)' -e 'raise NotImplementedError'
```

Combine results. Deduplicate by `(file, line)`.

---

## Step 3 — Cap

**Stop after 200 hits or 20 minutes of scanning, whichever comes first.** On large repos, classify those, write items, then offer:

> *Inventoried the first 200 hits across `<top-3-dirs>`. Want me to continue with the rest, or sweep the high-confidence ones we have?*

This enforces the ≤10-minute NFR for typical repos and degrades gracefully on monorepos.

---

## Step 4 — Classify each hit

For each hit (within the cap):

1. Read 10 lines of context around the hit (`git blame -L <line>,+10 -- <file>` if useful for author).
2. Decide: is this a real deferral the user would want recorded, or is it inside a docstring code block / a string literal / a generated file / a vendored dep / a test fixture demonstrating bad code?
3. If real → write an item per [`../reference/markdown-spec.md`](../reference/markdown-spec.md).
4. **`confidence: 0.4`** for cold-start items. Original intent is recovered, not observed; medium confidence is honest.
5. `## Why deferred` body: brief — what the comment says, what it appears to be deferring. Don't invent context the agent didn't observe.

Skip (don't capture):
- Hits inside strings unless the string is documentation (tests asserting `"TODO"` strings, `String("FIXME")`, etc.).
- Hits in `.gitignore`-excluded paths (build outputs, `node_modules/`, `target/`, `dist/`).
- Hits in directories matching the categorical refusal list (auth/, crypto, migrations) — capture them but mark `flag-only` in the planned sweep.

---

## Step 5 — Report

Print a compact summary. Counts only:

```
Found 23 items.
  By type:
    deferred-implementation: 8
    type-loosened:           7
    skipped-test:            5
    hack-workaround:         3
  By confidence:
    high (≥ 0.6):  8
    medium (0.4):  15
  Top 3 areas: src/auth/ (6), src/billing/ (5), src/api/ (4)
```

Don't list every item. The user opens `.un-punt/items/` if they want detail.

---

## Step 6 — Offer next step

> *Want me to sweep the high-confidence ones now? Estimated ~3 minutes, in your working tree, you'll see each change.*

If the user says yes → fall through to normal sweep planning with `scope = "high-confidence cold-start items"`.

If the user says no → stop. The items are written; future `/un-punt` runs continue from there.

---

## When NOT to cold-start

- `.un-punt/items/` exists and is non-empty → not a cold start. Fall through to wrap-up suggestion or sweep planning.
- The repo is on a protected branch — cold-start writes items only (no sweep), so this is fine; proceed.
- The user invoked `/un-punt --no-inventory` (Phase 2 escape hatch — reserved for now).
