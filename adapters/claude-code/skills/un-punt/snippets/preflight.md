# Pre-flight check

Before any sweep starts, run these four checks **in order**. If any fails, refuse the sweep with a clear, actionable message — never silent.

---

## 1. Working tree conflict check

```bash
git status --porcelain
```

For each item picked into the plan, check whether its `file:` is dirty (appears in `git status` output as `M`, `A`, `D`, `??`, or `UU`).

**If any planned item's file is dirty**, present the user 4 options:

```
1 file you want to clean has uncommitted changes (src/auth/oauth.ts).
Choose:
  1. Commit those changes first, then run the sweep
  2. Stash those changes, run the sweep, restore after
  3. Skip the conflicting items, sweep the rest
  4. Cancel the sweep
```

Refuse to silently include or silently skip — the user picks.

---

## 2. Protected-branch check

```bash
branch=$(git rev-parse --abbrev-ref HEAD)
```

Default protected list: `main`, `master`, `develop`, `trunk`, `release/*`.

Read additional protected branches from `.un-punt/contract.md` `protected_branches:` (additive — defaults always apply).

If the current branch matches any pattern, refuse:

```
Cannot sweep on protected branch '<branch>'.
Switch branches, or re-invoke with --allow-protected.
```

`--allow-protected` is an explicit user-typed override; the agent never sets it on its own.

---

## 3. Lock-file check

```bash
lock=.un-punt/lock
```

If `$lock` does not exist: continue (no lock held).

If it exists, read the three lines:

```
<sweep-id>
<iso8601-start>
<pid>
```

Then `ps -p <pid> > /dev/null 2>&1`:

- **Process exists** → another sweep is in progress; refuse:
  *"Sweep `<sweep-id>` started at `<iso>` (pid `<pid>`) is still running. Wait or kill it before starting a new one."*
- **Process does not exist** → stale lock. Offer to remove:
  *"Stale lock from sweep `<sweep-id>` (pid `<pid>` no longer running). Remove it? [y/N]"*

If the user accepts, `rm "$lock"` and continue. Don't auto-remove.

---

## 4. Write-access check

```bash
test -w .un-punt
```

If the directory isn't writable, refuse:

```
.un-punt/ is not writable for the current user. Cannot record this sweep.
```

This catches CI-mounted-read-only situations and permission-stripped clones.

---

## After all four pass

Write the lock:

```bash
{
  echo "$sweep_id"
  date -u +"%Y-%m-%dT%H:%M:%SZ"
  echo "$$"
} > .un-punt/lock
```

Capture the pre-sweep HEAD for Option 3 of the disposition prompt:

```bash
mkdir -p ".un-punt/sweeps/$sweep_id"
git rev-parse HEAD > ".un-punt/sweeps/$sweep_id/.pre-sweep-head"
```

Then start the sweep.
