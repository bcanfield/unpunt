---
name: un-punt-implementation
description: Use this skill for any work on the **un-punt** project (aka `tech-debt-plugin`) — a Claude Code / Codex plugin built from `docs/` with a `.un-punt/` filesystem convention. Trigger when the user mentions: un-punt, `.un-punt/` items/sweeps, `SKILL.body.md`, `core/` vs `adapters/`, the Claude Code or Codex adapter, the eval harness in `evals/harness/`, golden-set scenarios, phase 0/0a/0b/0c/0d, the CLI installer, or any `docs/` file (01-vision through 11-checklist, audits/07-validation-april-2026). Trigger when the user is tempted to add infrastructure to this project — SQLite/database, daemon, MCP server, capture hook (PostToolUse etc), LLM classifier, cross-session memory, or any abstraction over filesystem ops — all rejected in design decisions. Trigger when revisiting demand, threat model, competitive position, or risk weights — that validation is locked. Use when the user doesn't know which doc to read for an un-punt task. Do NOT trigger for unrelated projects or generic TS/React/testing questions.
---

# un-punt implementation playbook

You are working on **un-punt** — a Claude Code / Codex plugin consisting of (1) a markdown skill that teaches the agent how to behave and (2) a `.un-punt/` directory convention. The product is conventions and a thin install shell. There is no runtime, no service, no database, no daemon. Read this whole file before touching the repo.

## Step 0: Orient via `docs/README.md`

`docs/README.md` is the index. It tells you what to read next based on what you're doing. The bullet list below is a fast lookup; `README.md` is the source of truth.

## Task → doc map

| Your task | Read first |
|---|---|
| Drafting or editing `core/skill/SKILL.body.md` | `docs/05-skill-brief.md` |
| Building or modifying the Phase 0 eval harness | `docs/10-eval-harness.md` |
| Changing eval design, thresholds, or the golden-set scenarios | `docs/07-risks-and-evals.md` |
| Working on the Claude Code or Codex adapter | `docs/09-adapters.md` |
| Touching the markdown spec for `.un-punt/` items, sweeps, contracts | `docs/04-data-model.md` |
| Phase planning, gate criteria, time estimates | `docs/06-build-plan.md` |
| Concrete checkboxes for what-to-do-next | `docs/11-checklist.md` |
| Architectural questions ("why no SQLite?", "why no MCP?") | `docs/08-design-decisions.md` |
| User-facing flows, trust contract, refusal copy | `docs/02-experience.md` |
| What we're building, who for, why now | `docs/01-vision.md` |

**Read the doc, don't paraphrase it.** The specs are precise on purpose. Numbers, risk weights, threshold values, and refusal lists are load-bearing — paraphrasing introduces drift.

## Settled facts (do not redo this research)

The April 2026 idea-validation pass is complete and locked. See `docs/audits/07-validation-april-2026.md`. Treat its conclusions as settled:

- **Current risk weights**: A1'-a 30%, A1'-b 45%, A2 45%, A3 22%, A3' 30%, A4 50%, A5 60%, B8 elevated 30%
- **Newly discovered risks C1–C12** are catalogued in the same file
- **Competitive position, demand framing, threat model, eval design** were all examined in the validation pass

If a question feels broad-strategic, the answer is already in `audits/07-validation-april-2026.md`. Don't repeat the broad pass. Skim it instead.

## Resist complexity (the load-bearing rule)

The product principle is *conventions, not infrastructure*. The user's agent + the filesystem + the conventions are the system. If you find yourself reaching for any of the following, **stop** and re-read the cited decision:

| Tempted to add | Don't — see |
|---|---|
| A daemon, background process, or scheduled service | `docs/08-design-decisions.md` decision 2 |
| A database (SQLite, embedded KV, anything) | `docs/08-design-decisions.md` decision 1 |
| A separate LLM classifier | `docs/08-design-decisions.md` decision 2 |
| An MCP server (at MVP) | `docs/03-architecture.md` "What NOT to build"; `docs/08-design-decisions.md` decision 13 |
| A capture hook (at MVP) | `docs/08-design-decisions.md` decision 13 |
| A cross-session memory layer | `docs/08-design-decisions.md` decision 15 |
| A "smart" abstraction over filesystem ops | `docs/08-design-decisions.md` decision 15 |

Default to *less*. Bias toward inaction. **Refuse > Flag > Fix** is the trust contract — it applies to your engineering choices too.

## When you legitimately need to research

Operating principle: focused research IS OK when scoped. The validation pass covered strategy; specific implementation details are fair game.

- **Web search is fine** for narrow factual questions: a CVE, a library version, an Anthropic SDK API specific, an npm publish workflow detail.
- **Spawn one sub-agent** if the lookup needs more than 3 queries.
- **Do not** redo the broad April 2026 validation. Don't reopen "is there demand?", "what's the threat model?", "should we use a classifier?" — those are settled.

## When you find a real issue

The spec is wrong sometimes. If you genuinely believe it is:

1. Re-read the relevant doc first. Default assumption: the spec is right and you missed something.
2. If you still believe the issue is real, **edit the doc in the same PR** that contains your implementation work. Explain the issue and the new approach in the doc edit, not in a commit message or a Slack thread.
3. Use this sparingly. Most "issues" are misunderstandings of the spec.

Silent deviation is the failure mode. If you change behavior, change the doc.

## Stage gates are directional, not statistical claims

The eval thresholds in `docs/07-risks-and-evals.md` (≥80% recall, ≥90% precision, ECE ≤ 0.10, 8/8 adversarial refusal, per-language recall floor ≥0.70) carry **±0.10 Wilson 95% CI** on a 73-scenario corpus. They are directional signals.

- **Don't game them by tweaking the corpus** to hit numbers. Iterate the skill instead.
- **Don't treat them as point estimates.** A measured 0.82 and 0.79 are not meaningfully different on this corpus size.
- The stopping rule in `docs/07-risks-and-evals.md` "Scoring & thresholds" ends a calibration cycle; it does not validate or invalidate your hunch.

## The skill body is production code

`core/skill/SKILL.body.md` is the IP. Treat every change like a versioned, eval-gated production deploy.

- Calibration cycles are numbered (v1, v2, v3) per `docs/11-checklist.md` Phase 0d.
- **Don't tweak mid-Phase-0 outside a numbered cycle.** A change-then-rerun loop without a version bump is how you lose track of what's working.
- Every change goes through the golden-set eval before the next one starts.

## When in doubt, the spec wins

That is the rule. If this skill and a doc disagree, the doc is right. Edit the skill (and update the doc if the doc is the one that's wrong).
