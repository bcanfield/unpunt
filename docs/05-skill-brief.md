# 05 — Skill Brief

This document tells a skill-writing agent **what the un-punt skill must teach**. It is not the skill itself.

The skill is the entire IP. Everything in the architecture serves it.

---

## What the skill is

A markdown file (~6–10 KB) loaded by the user's coding agent at session start. Contains: YAML frontmatter (`name`, `description`) plus body with behavioral rules, the `.un-punt/` format reference, worked examples, refusal lists, trust contract details.

Per Anthropic's authoring guidance, only frontmatter metadata is preloaded; the body is read on-demand via progressive disclosure. Keep `SKILL.md` body under ~500 lines and split deeper reference material into sibling files one level deep.[^skills-best-practices][^skills-overview]

Multi-platform (Claude Code first, Codex/Cursor later). Per-platform variants are minor; substance is shared.

> **Slash-command form.** Bare `/un-punt` for the standalone-skill MVP. If we end up shipping as a plugin to access hooks, it becomes `/un-punt:un-punt` — see [`06-build-plan.md`](06-build-plan.md) ("If hooks become necessary").

---

## The eleven concerns the skill must address

### 1. Capture rules

**When to capture** (triggering signals):
- Deferral comment written (TODO/FIXME/XXX/HACK/WIP/KLUDGE/LATER)
- Type loosening (`as any`, `@ts-ignore`, `# type: ignore`)
- Test skipped (`.skip`, `xit`, `it.todo`, `@pytest.mark.skip`)
- Empty catch block written
- "Not implemented" thrown
- Agent says (in chat): "I'll handle X later", "skipping for now", "not in this scope", "we should come back"
- User says: "skip that", "not worth fixing", "do that later"
- Duplicated logic observed but not DRY-ed
- Deprecated API call left instead of migrating

**Bias**: *"When in doubt, capture. Cost of a low-confidence capture is one dismissable item; cost of a missed deferral is a silent loose end."*

This bias is the rule-level expression of Anthropic's "pushy description" guidance: Claude tends to *undertrigger* skills, so instructions for triggering should err toward action rather than restraint.[^skills-best-practices][^skill-creator]

**Language assumption (i18n).** The trigger token set above (`TODO`, `FIXME`, `HACK`, etc.) and the chat-deferral phrase list assume English source comments and English-language sessions. Mixed-language repos still capture English deferrals correctly; non-English equivalents (`PENDIENTE`, `FIXEN`, `做完`, etc.) are captured *only* if the agent's language understanding maps them to the same intent. This is a Phase 4 hardening item — out of scope for MVP, but flagged so non-English shops aren't surprised.

**For each capture**:
1. Compute item ID: `"up-" + first_8_chars(sha256(type + ":" + file_path + ":" + line))`
2. Check if `.un-punt/items/<id>.md` exists
3. If yes → append a lifecycle row noting re-detection
4. If no → write a new file (frontmatter + `# title` + `## Why deferred` + lifecycle table)

**Confidence**: the agent emits a single `confidence: 0.0–1.0` based on its own judgment of how clear the deferral is, how local the fix would be, whether tests cover the area. **Do not dictate a multi-factor formula** — let the agent reason. The skill provides guidance ("high confidence is when intent is clear, scope is local, and tests exist") but not arithmetic.

The skill must include 3–5 worked capture examples covering different item types.

### 2. Suggestion rules

**Suggest when**:
- User signals end-of-feature ("done", "looks good", "ship it")
- User signals end-of-day / end-of-session
- User signals area switch ("now let's switch to billing")
- ≥N items captured today for relevant files (default N=5)
- ≥7 days since last sweep, with ≥10 items pending

**Never suggest when**:
- User is mid-task
- Already suggested in this session and user said no/later
- Current branch is `main` / `master` / a protected branch
- Sweep already in progress (lock file)

**Phrasing principles**: specific (counts + types); polite, not preachy; easy to dismiss; sets expectations ("about 4 minutes, separate branch ref"); agent's natural voice, not a script.

Include 2–3 example phrasings. No rigid template.

### 3. Sweep planning rules

When user accepts:
1. Determine scope (path / time / PR diff / "today's items")
2. Read all items matching scope (`rg` / `cat` over `.un-punt/items/`)
3. Apply `contract.md`: categorize fix-eligible / flag-eligible / refused; record which contract rule fired for refusals
4. Rank fix-eligible by `confidence` (descending). Tie-breaks via agent judgment.
5. Cap at N fixes (default 5; configurable) and M flags (default 10)
6. Compute sweep id: `<YYYY-MM-DD>-<scope-slug>`. If `sweeps/<id>/` already exists, append `-2`, `-3`, … until unique.
7. Write `sweeps/<id>/plan.md`
8. Show plan; ask for confirmation

**Planning is deterministic** — same input → same plan.

### 4. Sweep execution rules

For each fix-eligible item:
1. Read item file (frontmatter + body + lifecycle)
2. Read repo conventions (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`)
3. Read 5–10 most-recently-modified files in the same module (style match)
4. Edit the working tree (visibly)
5. Run verification using the **command-discovery ladder**:
   - Read `package.json` scripts (`test`, `typecheck`, `lint`) and **vet each candidate** before using it as a verifier:
     - **Refuse** any script whose body contains `curl`, `wget`, `fetch`, `nc`, or any other arbitrary-URL fetch.
     - **Refuse** any script that invokes a dynamically-loaded file (e.g. `node ./scripts/$VAR.js`) or that uses shell metacharacters beyond `&&` / `;` / `||`.
     - **Refuse** any script that resolves to `exit 0` (or equivalent no-op) on a repo where source files exist — assume the verifier was tampered with, FLAG-only mode.
     - Aligned with the April 2026 npm postinstall-hook attack class (SAP / Axios) — never run an attacker-controllable shell as the proof-of-correctness step.
   - **Detect watch-mode commands** (substrings: `--watch`, `vitest dev`, `jest --watch`, `tsc --watch`) and refuse them as verifiers; ascending to the explicit binary list.
   - Else fall back to common binaries the repo has on PATH: `tsc --noEmit`, `eslint`, `pytest`, `cargo test`, `go test ./...`.
   - **If neither produces a runnable command**, this sweep enters **FLAG-only mode** — no fixes are committed; everything is degraded to `flag` and surfaced in the report. (Verification is non-negotiable per `Refuse > Flag > Fix`.)
   - **FLAG-only mode is user-visible**: the report says "no verifier found in this repo (`<reason>`); switched to flag-only — every item surfaced as a flag instead of a fix." Don't pretend FLAG-only is success.
6. **If verification passes**: stage the diff for commit; update item lifecycle to `planned` (will become `resolved` after disposition)
7. **If verification fails**: roll back the working-tree edit; demote to `open`; record what was tried in a lifecycle row

**The two-receipt rule is non-negotiable**, but receipts go in **commit messages**, not separate files:
- *Why this*: which item, the deferral context (1–2 sentences quoted from the item's `## Why deferred`)
- *Why now safe*: tests passed (run, not claimed), change size, scope locality

If receipt #2 can't be produced → demoted to `open`, not committed.

#### Commit message format (canonical)

Every cleanup commit uses this exact shape. The README's `assets/commit-receipts.png` placeholder relies on this format; deviations from it break the visible audit trail.

```
cleanup: <imperative subject, ≤72 chars>

<optional 1-paragraph body if the diff isn't self-evident>

Item: up-<8hex>
File: <repo-rel-path>:<line>
Why this: <1–2 sentences quoted from the item's ## Why deferred>
Why now safe: tests passed (<N>/<N>), tsc clean, eslint clean, <files-changed> file(s) +<added> -<removed>
Sweep: <YYYY-MM-DD-scope-slug>
```

Field rules:
- `Item:` value matches the item file's frontmatter `id` exactly.
- `File:` is repo-relative; `:line` omitted only when the item is non-line-anchored.
- `Why this:` content is *quoted* from the item's `## Why deferred` body — not paraphrased — so the receipt is auditable against the source item.
- `Why now safe:` lists only checks that ran. If `tsc` wasn't on the PATH and was skipped, omit the `tsc clean` token rather than asserting it. The line/file diff stat comes from `git diff --shortstat HEAD`.
- `Sweep:` matches the sweep directory name (`sweeps/<id>/`).

For squashed commits (disposition option 2), the structured footer repeats once per item, separated by blank lines, under a single `cleanup:` subject summarizing the sweep.

The format is checked by the `commit-receipts.png` screenshot in the README. If the format changes, update the screenshot.

### 5. Disposition prompt

After every sweep, the agent **always** asks. The literal 4-option prompt is canonical in [`02-experience.md`](02-experience.md) §Disposition prompt — the skill body must include the prompt text verbatim from there.

Per-option execution:
- **1**: per-item `git commit` with provenance footer; current branch advances
- **2**: stage all; single commit with combined provenance
- **3**: per-item commits, then `git branch un-punt/sweep-<id> HEAD` and `git reset --hard <pre-sweep-HEAD>` (atomic — branch *before* reset)
- **4**: leave changes unstaged; print next-step suggestion

After: update each resolved item's lifecycle table with `commit_sha`.

### 6. Lifecycle update rules

The 3-state machine and allowed transitions are canonical in [`04-data-model.md`](04-data-model.md) §Lifecycle state machine.

For every transition the skill must:
- Read current `status` from frontmatter first
- Refuse disallowed transitions
- Append a row to the lifecycle table (`when`, `status`, `trigger`, `reference`)
- Update frontmatter `status` and `updated_at`

### 7. Pre-flight check

Before any sweep starts:
1. `git status` — refuse on conflict with target files (offer 4 options: commit / stash / skip those items / cancel)
2. `git rev-parse --abbrev-ref HEAD` — refuse on protected branch without `--allow-protected`. Default protected list: `main`, `master`, `develop`, `trunk`, `release/*`. Override via `contract.md` `protected_branches:` list (additive — defaults always apply).
3. Check `.un-punt/lock` — refuse if present. The lock contains `<sweep-id>\n<iso-start>\n<pid>`; if `ps -p <pid>` reports no such process, the lock is stale and may be removed (offer to do it).
4. Verify write access to `.un-punt/`

Pre-flight failures must be **clear and actionable** — never silent.

### 8. Cold-start inventory

On first install (no items), the skill triggers a guided inventory:
1. Acknowledge: "First time — let me inventory existing follow-ups."
2. `rg` for the standard pattern set:
   - TODO / FIXME / XXX / HACK / WIP / KLUDGE / LATER
   - `as any`, `@ts-ignore`, `# type: ignore`, `: any`
   - `.skip`, `xit`, `it.todo`, `@pytest.mark.skip`, `t.Skip()`
   - Empty catches: `catch.*\{\s*\}`, `except.*pass`
   - Unfinished: `throw new Error("not implemented")`, `unimplemented!()`, `panic!("TODO")`, `raise NotImplementedError`
3. **Cap at first 200 hits or 20 minutes of scanning**, whichever comes first. On large repos, classify those, write items, then offer: "Inventoried the first 200 hits across `<dirs>`. Want me to continue with the rest, or sweep the high-confidence ones we have?" (Enforces the ≤10-min NFR for typical repos and degrades gracefully on monorepos.)
4. For each hit (within the cap), read 10 lines of context, decide whether to capture
5. Write items with `confidence: 0.4` or so (no original deferral context — recovered)
6. Report counts ("Found 23 items; 8 high-confidence, 15 medium")
7. Offer: "Want me to sweep the high-confidence ones now?"

### 9. Recovery / feedback

When a sweep produces a bad result:
1. User discards the sweep branch / closes PR / appends a note to `.un-punt/feedback.md` (single append-only log; one section per entry)
2. Agent (next time) reads `.un-punt/feedback.md`
3. For each entry, update `contract.md`:
   - Raise threshold for the implicated item type
   - Or add a refusal rule for the implicated pattern
4. Future sweeps apply the calibration

Include 2–3 worked examples of feedback → contract updates. Example: *"User said the type tightening was wrong → raise threshold for `type-loosened` from 0.80 to 0.90 in this repo."*

**Edge cases the calibration loop must handle (each surfaces a specific failure mode):**

- **Ambiguous feedback** — e.g. *"the auth fix was kind of OK but not great."* Action: do **not** mutate `contract.md`. Append the entry to `feedback.md` under `## Pending judgment` and ask the user at next sweep start: "you flagged the last auth fix as 'kind of OK' — should the threshold rise, stay, or fall?" Calibration is binary or it doesn't run.
- **Conflicting feedback across two devs** — e.g. dev A says "the type tightening was great, keep going," dev B says the same change broke their local build. Action: in single-developer-per-repo MVP, the most recent entry wins; in multi-dev mode (Phase 3+) the conflict is surfaced and `contract.md` is not mutated until resolved.
- **Threshold already at the categorical-refusal floor** — e.g. user says "raise threshold for `type-loosened` higher" and it's already 0.95. Action: cap at 0.95 and convert the entry to a per-file or per-symbol refusal rather than a blanket threshold. Communicate the change in the next sweep's plan.
- **Non-English feedback** — at MVP, captured but not algorithmically applied; agent surfaces "I read your feedback but it's outside the languages this skill version calibrates on; here's what I think you said — confirm?" Phase 4 hardening item.
- **Feedback that contradicts a categorical refusal** — e.g. *"the migration refusal was wrong, you should have done it."* Action: explicitly **ignored** (the categorical-refusal floor is non-overrideable). Record the disagreement in `feedback.md` so it surfaces in the next sweep's plan, but do not mutate `contract.md`.

**Calibration is monotone-tightening only** at MVP — thresholds rise, refusals are added, neither relaxes. The asymptotic UX is FLAG-only mode, which is acceptable but should be visible to the user. Phase 2+ will add a "loosening" path gated on positive feedback ("the last 3 sweeps were all good — should I attempt this category at a lower threshold?") rather than direct user instruction.

### 10. Refusal logic

The skill must include the **categorical refusal list** (from [`02-experience.md`](02-experience.md)):

Public APIs, DB migrations, auth/crypto/payment code, CI/CD config, lockfiles, generated code, test deletion, cross-module refactors, files modified by humans <24h, anything in `.gitignore`-excluded paths, plus a built-in skill-level exclusion list for sensitive directories.

**"Modified by humans <24h" detection** (hardened against `--author` / `--date` spoofing):

1. Filter `git log --since=24.hours -- <file>` to commits whose **committer** email ≠ the configured agent identity (use `%cE` not `%aE`; `--author` is fully attacker-controllable, `--committer` requires the actual local git config). The subject line must also not start with `cleanup:` (our prefix).
2. On a "high-risk path" (anything matching the categorical-refusal patterns or any path the contract marks `high-risk`), additionally require that *every* commit in the 24h window carry a valid GPG/SSH signature (`git log --show-signature` reports `Good signature`). If signatures are missing on a high-risk path, treat the file as human-touched-recently regardless of authorship — refuse.
3. Reject any commit whose `AuthorDate` and `CommitterDate` differ by more than the window itself (`--date` rewriting), and any commit whose `Co-Authored-By:` trailer matches the agent identity but whose author/committer does not (the inverse spoof).

This is best-effort. A determined attacker who controls the git config can still forge committer identity locally; the categorical-refusal list and the disposition prompt are the ultimate gates.

**"Cross-module refactor" detection**: a fix is cross-module if the diff touches files under more than one top-level directory of `src/` (or, if no `src/`, more than one top-level package directory). Tighter rules can be defined per-repo in `contract.md`.

These are non-overrideable. Per-repo `contract.md` can *raise* thresholds but not *remove* refusals.

Plus the **hostile-input refusal list** (canonical: [`02-experience.md`](02-experience.md) §Hostile-input refusals): prompt-injection-bearing TODOs, untrusted transcripts, out-of-repo paths, outward-pointing symlinks, files matching secret patterns. The skill body must include the full list verbatim from `02-experience.md` — do not paraphrase here.

### 11. Error handling

The skill must teach the agent to handle:

| Failure | Response |
|---|---|
| Verification fails mid-sweep | Roll back, demote to `open`, continue |
| LLM API outage mid-sweep | Save partial state, surface error, allow resume |
| Cost cap hit | Finish current if possible, demote rest to `open`, summarize |
| User Ctrl-C | Leave working tree as-is (uncommitted; recoverable) |
| Conflicting changes detected mid-sweep | Halt; surface conflict |
| Item file corrupted | Log, skip, continue |

---

## Quality bar (measured against the golden set)

| Metric | Target |
|---|---|
| Capture recall | ≥ 80% on representative sessions |
| Capture precision | ≥ 90% (few false positives) |
| Suggestion acceptance | ≥ 40% when user says "done" |
| Sweep success | ≥ 75% of fix-eligible items committed; rest cleanly demoted |
| Two-receipt completeness | 100% of committed fixes |

These targets are project-specific; Anthropic publishes no public recall/precision benchmark for skill-only approaches. They must be established and re-validated by the golden set, per Anthropic's "evaluation-driven development" guidance for skills.[^skills-best-practices] Details in [`07-risks-and-evals.md`](07-risks-and-evals.md).

---

## Anti-instructions (what the skill must NOT do)

- ❌ Invent item types outside the enum (use `other`; flag for skill update)
- ❌ Modify current branch without going through the disposition prompt
- ❌ Push to a remote (output adapters are separate, opt-in)
- ❌ Read transcript files from disk (capture is real-time only)
- ❌ Read files outside the repo root
- ❌ Assume test/lint config (read from repo configs)
- ❌ Hold user info beyond what `git config` provides
- ❌ Suggest sweeps as a way to delay the user's actual task
- ❌ Use "debt" in user-facing language (use "cleanup" / "deferred" / "follow-ups")
- ❌ Dictate confidence math to itself (just emit one number)

---

## Calibration

Treat the skill like production code:
1. **Versioned** — every bump deliberate
2. **Eval-gated** — every bump runs the golden set
3. **Per-platform variants** — Claude Code, Codex, Cursor each tuned; track recall delta

The golden set is the regression suite. Implementation in [`07-risks-and-evals.md`](07-risks-and-evals.md).

---

## Expected deliverables from the skill-writing agent

(Layout matches [`09-adapters.md`](09-adapters.md): platform-agnostic core + thin adapter shells.)

1. `core/skill/SKILL.body.md` — the platform-agnostic skill body (no frontmatter)
2. `adapters/claude-code/skills/un-punt/SKILL.md` — built artifact: Claude Code frontmatter prepended to the core body
3. `core/golden-set/` — 50 scenarios per [`07-risks-and-evals.md`](07-risks-and-evals.md) and [`10-eval-harness.md`](10-eval-harness.md)
4. `evals/harness/` — Claude Agent SDK-based eval runner (see [`10-eval-harness.md`](10-eval-harness.md))

A first draft + calibration loop (eval → adjust → re-eval) until the quality bar is met. Expect 2–3 iterations. This matches Anthropic's recommended skill development workflow: build evals first, draft minimal instructions, then iterate against observed agent behavior rather than assumptions.[^skills-best-practices]

The skill body is *guidance for an agent*, not a deterministic policy engine. Refusal lists, pre-flight checks, and the trust contract are written as imperatives the agent is expected to follow. Skill instructions in the system-prompt slot are followed at high but not perfect rates — Constitutional-style training improves but does not guarantee compliance — so treat irreversible operations (commits, branch resets, network calls) as pre-flight-gated rather than purely instruction-gated, and rely on the eval harness to catch regressions.[^constitutional-ai][^skills-best-practices]

The pattern of an agent that *reasons about its own work, captures intermediate state, and validates before acting* is well-grounded prior art (ReAct, plan-validate-execute), not a novel claim of the skill.[^react]

---

## References

[^skills-best-practices]: Anthropic, "Skill authoring best practices." [platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). Source for: third-person descriptions, "what + when to use it" format, 1024-char description cap, ~500-line SKILL.md body limit, one-level-deep references, evaluation-driven development, plan-validate-execute pattern, model-comparison testing.

[^skills-overview]: Anthropic, "Agent Skills overview" and "Extend Claude with skills" (Claude Code). [platform.claude.com/docs/en/agents-and-tools/agent-skills/overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) and [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills). Source for: progressive-disclosure loading model (metadata preloaded, body and references loaded on-demand), YAML frontmatter requirements, file-naming and path conventions.

[^skill-creator]: Anthropic, `skill-creator` reference skill. [github.com/anthropics/skills](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md). Source for: descriptions should be "a little pushy" because Claude tends to undertrigger; include trigger phrases and contexts even when the user doesn't name the skill explicitly.

[^constitutional-ai]: Bai et al. (Anthropic), "Constitutional AI: Harmlessness from AI Feedback" (2022). [arxiv.org/abs/2212.08073](https://arxiv.org/abs/2212.08073). Background on instruction-following reliability and the limits thereof: trained behavioral preferences improve but do not guarantee compliance, motivating mechanical pre-flight checks for irreversible operations.

[^react]: Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (ICLR 2023). [arxiv.org/abs/2210.03629](https://arxiv.org/abs/2210.03629). Prior art for agents that interleave explicit reasoning with action and self-monitor progress — the pattern un-punt applies to deferral capture and sweep planning.
