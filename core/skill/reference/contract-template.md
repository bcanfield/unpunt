# un-punt trust contract — template

This file is `<repo>/.un-punt/contract.md`. It tells the agent what cleanups it's allowed to attempt in this repo, with what confidence floor, and what zones it must never touch.

You can edit it. The agent reads it once at the start of every sweep — mid-sweep edits don't affect the running sweep.

> **Refuse > Flag > Fix.** A flag is success. A bad fix is failure. This file can make the agent more cautious; it cannot make the agent less cautious.

---

## Will-attempt operations

The agent will fix items of these types **only if** the item's `confidence` is at or above the threshold. Below the threshold, the item degrades to a flag (no commit). You can raise any of these; you cannot lower them below the default.

```yaml
thresholds:
  deferred-implementation: 0.85   # TODO with clear single intent
  type-loosened:           0.80   # any, as any, @ts-ignore, # type: ignore
  missing-edge-case:       0.80   # only when tests are in place
  skipped-test:            0.75   # replace .skip / xit with a real test
  duplicated-code:         0.85   # dedup within a single module
  deprecated-api:          0.85   # mechanical migrations
  dead-code:               0.90   # multiple signals required
  doc-additions:           0.90   # JSDoc, docstring additions
```

To raise a threshold for a specific path, override per-glob:

```yaml
thresholds:
  type-loosened: 0.80
  type-loosened/src/auth/**: 0.95   # be extra cautious in auth/
```

---

## Will NOT touch (categorical refusals — non-overrideable)

These are enforced by the skill regardless of what's in this file. You can *add* to them; you cannot remove or weaken them.

1. Public API surfaces (exported types, function signatures)
2. DB migrations & schema changes
3. Auth / OAuth / authorization code (`auth/`, `oauth/`, `permission/`, `acl/`, `rbac/`)
4. Cryptography (`crypto`, `subtle`, `webcrypto`, signing, encryption)
5. Payment / billing code
6. CI/CD configuration (`.github/workflows/`, `Dockerfile`, deploy scripts)
7. Lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `Cargo.lock`, etc.)
8. Generated code (`@generated`, `gen/`, `generated/`, `__generated__/`)
9. Test deletion (additions only — never delete or weaken tests)
10. Cross-module refactors (changes touching >1 top-level source dir)
11. Files modified by humans in the last 24h (assume in-flight)
12. Anything `.gitignore` excludes

Plus the **hostile-input refusals** (prompt-injection-bearing TODOs, untrusted transcripts, out-of-repo paths, outward-pointing symlinks, secret-pattern files). Same status: non-overrideable.

See [`refusal-lists.md`](refusal-lists.md) for the full detection algorithms.

### Per-repo additions

Add paths or globs the agent must refuse in *this* repo on top of the categorical list:

```yaml
refuse:
  - "src/legacy/**"           # un-supported area; do not touch
  - "src/experimental/**"
  - "scripts/release.*"
```

Add high-risk paths that should require GPG-signed human commits in the 24h-touch check:

```yaml
high_risk_paths:
  - "src/payments/**"
  - "src/audit-log/**"
```

---

## Pre-flight gates

```yaml
protected_branches:
  # The defaults always apply: main, master, develop, trunk, release/*
  # Add additional protected branches here. Sweeps refuse to commit on these
  # unless invoked with --allow-protected.
  - "production"
  - "staging"
  - "hotfix/*"
```

---

## Sweep caps

```yaml
caps:
  fixes_per_sweep: 5    # max items the agent will attempt to fix in one sweep
  flags_per_sweep: 10   # max items the agent will surface as flags
```

Raise these if you want longer sweeps; lower them for tighter scope.

---

## What this contract cannot do

- Lower a will-attempt threshold below the default.
- Remove a categorical refusal (rules 1–12 above).
- Disable hostile-input refusals.
- Override the disposition prompt (the gate that protects your branch).
- Skip the verifier (tests / tsc / lint must pass for any cleanup commit).

If you edit this file in a way the skill considers forbidden, the offending line is ignored and a one-line warning is printed at the start of the next sweep.

---

## Versioning

```yaml
contract_version: 1
```

Bump when you make material changes you want recorded in sweep `plan.md` frontmatter (`contract_version: N`). The skill carries the version into every sweep so report.md can be replayed against the contract that was active.
