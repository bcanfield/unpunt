# un-punt — docs index

> **Where the project is right now**: v0.2 implementation + dogfood + fix1 are complete. Pre-launch tasks remain (README rewrite, tag, announce). v0.3 is documented but deferred until a trigger fires. The skill body + hooks + spec docs are stable.
>
> **If you've been away for a week**: read [§ Current state](#current-state) first. Then [`v0.2-dogfood-report.md`](v0.2-dogfood-report.md) for what we found and fixed. Then [`v0.2-followups.md`](v0.2-followups.md) for what's pending. That's enough to re-orient in 10 minutes.

---

## Current state

**Status**: ✅ v0.2 ship-ready for Claude Code; pre-launch tasks pending.

| Area | Where it stands |
|---|---|
| Architecture | Locked. Hooks (SessionStart + PostToolUse + UserPromptSubmit) per [Decision #21](08-design-decisions.md). Sketch (ii) — structural pre-filter, no content classification. Decision 2 ("agent is the engine") preserved. |
| Skill body | At `core/skill/SKILL.body.md`. Widened with long-tail trigger examples + "examples are not exhaustive" framing line + Confidence promotion subsection. 6-type enum closed. |
| Hooks | At `core/hooks/{session-start,post-tool-use,user-prompt-submit}.sh`. Sub-second performance. Sketch (ii) compliant. |
| CLI | `packages/cli/` — install merges hooks block + AGENTS.md primer; uninstall reverses cleanly via v2 manifest. `$HOME` path-expansion bug fixed in commit `b3b1303`. |
| Docs | This index, plus 11 numbered spec docs (`01-vision.md` … `11-checklist.md`), the v0.2 cluster (this section ↓), the v0.2 research deliverables ([`research/`](research/)), and `launch-plan.md`. |
| Validation | All 4 failed v0.1 probes pass. Sketch (ii) compliance: 100% on observed events (n=1, expanding). Cold-start regression-free. End-to-end validated 2026-05-04. |
| Outstanding work | Pre-launch (README, tag, announce) + v0.2.x patches. See [`v0.2-followups.md`](v0.2-followups.md). |
| Next major | v0.3 deferred until compliance / stability / external trigger fires. See [`v0.3-roadmap.md`](v0.3-roadmap.md). |

**Recent commits worth noting**:

- `b3b1303` — CLI `$HOME` path-expansion fix (the May 4 silent-failure cause)
- `4096e6e` — `validate-v0.2.sh` regression check for `$HOME` literals
- `bb478bb` — canonical `v0.2-dogfood-report.md`
- `892e3f7` — `v0.2-followups.md` backlog
- `0c23728` — wrap-up cleanup: re-pointed source-of-truth refs + Decision 13 forward-pointer
- `f72763d` — docs cleanup: organize for clear current-state + v0.3 prominence

**Currently outstanding** (per [`v0.2-followups.md`](v0.2-followups.md)):

- **PL-1** — `git push origin main` (5 sec; user's hand)
- **PL-2** — Update `README.md` per [`v0.2-launch-readme-draft.md`](v0.2-launch-readme-draft.md) (~30 min)
- **PL-3** — Tag `v0.2.0` + push tag
- **PL-4** — Announcement post
- **PL-5** — Optional: deploy punt-board publicly as launch hero asset

---

## Lessons learned (the dogfood story in 5 bullets)

1. **Description-match auto-loading does not fire on coding-topic conversations.** Probes 1, 2, 7 of the v0.1 dogfood proved this. A well-formed description within the 1,536-char budget is not enough; the matcher needs an explicit topic-level signal that "build a webapp" doesn't provide. Decision #21 ships hooks to compensate.

2. **Hooks are now the cross-platform standard primitive in 2026.** The May 1 implementation drift (toward Claude-Code-only thinking) was empirically wrong: Cursor 1.7, Codex 0.124.0, Copilot CLI, and Gemini CLI all shipped stable hook systems with Claude-Code-compatible JSON-stdin/stdout contracts. Cursor + Codex additionally adopted the same `SKILL.md` open standard.

3. **The classification line is `WHICH events fire = mechanical (hook owns it) / WHAT the event means = interpretive (agent owns it)`.** The May 1 implementation drift attempted regex pre-classification of file content (Sketch iii) — Decision 2 violation. Sketch ii (structural pre-filter only) is the right line. v0.2 codifies it; future hook design should follow it.

4. **Real-time agent capture is fundamentally higher-fidelity than retrospective regex.** Probe 10's capture landed at 0.95 confidence with bonus reasoning about an untyped parameter — neither of which the regex-based cold-start could produce. Decision 2 ("agent is the engine") was strengthened by the dogfood, not weakened.

5. **Silent failures are the worst kind.** The May 4 `$HOME` regression installed correctly, hooks fired, but bash couldn't find scripts because `$HOME` stayed literal. **No log, no warning, no signal except items not being captured.** Always include observability + regression checks for paths and config that depend on shell-context-specific behavior. v0.2.0-fix1 added a regression check; future architecture changes should plan observability up front.

---

## Read-in-order docs (the project spec)

These are the load-bearing spec docs. Read in order if you want the full picture; they didn't change in v0.2 except for `06-build-plan.md` Phase 1 and `07-risks-and-evals.md` B8 row (both annotated with v0.2 outcomes).

| # | File | What it gives you |
|---|---|---|
| 1 | [`01-vision.md`](01-vision.md) | What we're building and why — the pain it solves, who it's for, why now |
| 2 | [`02-experience.md`](02-experience.md) | User flows, trust contract, working-state invariants — what the user sees |
| 3 | [`03-architecture.md`](03-architecture.md) | Components (small set), data flow, what NOT to build |
| 4 | [`04-data-model.md`](04-data-model.md) | Markdown spec for `.un-punt/` |
| 5 | [`05-skill-brief.md`](05-skill-brief.md) | **What the skill must teach** — the IP brief. Includes v0.2 hook-supplement clarification. |
| 6 | [`06-build-plan.md`](06-build-plan.md) | Phases 0–4 with gates, deliverables, time estimates. Phase 1 updated for v0.2 hooks-at-MVP per #21. |
| 7 | [`07-risks-and-evals.md`](07-risks-and-evals.md) | Top load-bearing assumptions + Phase 0 eval design. **B8 row annotated MATERIALIZED** with v0.2 mitigation. |
| 8 | [`08-design-decisions.md`](08-design-decisions.md) | The decision register. **Decision #21 added** (hooks for activation + structural pre-filter). Decision 13 has a forward-pointer noting partial supersession. |
| 9 | [`09-adapters.md`](09-adapters.md) | Adapter design (Claude Code & Codex) — read before Phase 2 / cross-platform expansion |
| 10 | [`10-eval-harness.md`](10-eval-harness.md) | Phase 0 eval harness spec |
| 11 | [`11-checklist.md`](11-checklist.md) | End-to-end build checklist — operational version of `06-build-plan.md` |

If you have 5 minutes: read this index + `01-vision.md` + the diagram in `03-architecture.md`.

If you're picking up implementation work: read `05-skill-brief.md`, `06-build-plan.md`, and `07-risks-and-evals.md` in that order.

---

## v0.2 cluster (where the recent work lives)

These are the docs created during the v0.2 dogfood + design + implementation arc (April–May 2026). The dogfood report is the canonical record; the rest is process artifact.

| Doc | Purpose |
|---|---|
| [`v0.2-dogfood-report.md`](v0.2-dogfood-report.md) | **Canonical evidence** — v0.1 probes + v0.2 validation + fix1. The single doc to read if you want to know what we found and fixed. Replaces punt-board's working dogfood-log. |
| [`v0.2-followups.md`](v0.2-followups.md) | **Outstanding work** — pre-launch tasks (PL-1 through PL-5) + v0.2.x patches. v0.3 work moved to its own doc for prominence. |
| [`v0.3-roadmap.md`](v0.3-roadmap.md) | **Next major work** — V03-1 through V03-4 with triggers, rationale, implementation sketches |
| [`v0.2-plan.md`](v0.2-plan.md) | Strategic plan that drove the v0.2 work. Per-session research outcomes appended chronologically. Historical record. |
| [`v0.2-research-plan.md`](v0.2-research-plan.md) | Per-session methodology. 4 codified refinements added during the work. Apply verbatim to v0.3. |
| [`v0.2-launch-readme-draft.md`](v0.2-launch-readme-draft.md) | Section-by-section diff plan for updating the repo-root `README.md` at v0.2 launch (PL-2). |
| [`research/`](research/) | 15 individual research-session deliverables (Q1a, Q1b, Q1c, Q2a, Q2b, Q2c, Q3a, Q3b, Q3c, Q4a, Q4b, Q5a, Q5b, Q5c, Q8a). Each is the full deliverable for one Q-session of the v0.2 research arc. Cited from the v0.2-plan and Decision #21. |

---

## Operational + working material

| Path | Purpose |
|---|---|
| [`launch-plan.md`](launch-plan.md) | One-day, everywhere-at-once launch strategy — venues, timing, copy patterns. Read before announcement (PL-4). |
| [`dogfood-log-template.md`](dogfood-log-template.md) | Format spec for dogfood-log files in subject repos. Reusable for future dogfood cycles. |
| [`assets/`](assets/) | Demo recording assets for repo-root `README.md`. `demo.tape`, `demo-session.sh`, `demo.gif`. Render with `VHS_NO_SANDBOX=true vhs docs/assets/demo.tape`. |
| [`audits/`](audits/) | Past audit cycles on the README + the locked April 2026 idea-validation pass. Reusable: re-run before any major README revision. |
| [`../README.md`](../README.md) | Repo-root README — currently in v0.1 "as-if-shipped" framing; v0.2 update pending per `v0.2-launch-readme-draft.md`. |
| [`../scripts/validate-v0.2.sh`](../scripts/validate-v0.2.sh) | Re-dogfood validation orchestration script. Includes `$HOME` regression check. |

---

## Citation conventions

Most docs use inline links plus a `## References` section at the bottom. The two highest-citation docs — `05-skill-brief.md` and `08-design-decisions.md` — use GitHub-flavored footnotes (`[^name]`) instead, because the inline-link form gets noisy when a single sentence cites three sources. Both render correctly.

---

## Operating principles for the implementer

These haven't changed since v0.1; they constrain v0.3 too.

1. **The skill is the product.** Most of the engineering effort goes into the skill (calibrated against the golden-set eval and iterated). Hooks are thin event-routing scripts; they don't replace the skill, they just make it reach the agent reliably.
2. **Don't invent infrastructure.** No SQLite, no daemon, no service. Hooks are stateless event scripts. No MCP server unless team-aggregation eventually demands it. Default is *less*.
3. **Refuse > Flag > Fix.** Bias toward inaction. The trust contract refusing to do something is a feature, not a limitation.
4. **The user's working state is sacred.** Pre-flight check before any sweep; disposition prompt before any commit. Visible work in the user's current tree.
5. **Markdown all the way down.** Items, sweeps, contracts, slices, lifecycle — all human-readable, agent-readable, git-friendly markdown files.
6. **`v0.2-research-plan.md`'s methodology is the load-bearing process artifact.** Apply verbatim to v0.3 + future major work.
7. **un-punt is a convention layer, not a sandbox.** Categorical refusals + verifier discipline + disposition prompt + in-tree visibility are the load-bearing safety mechanisms.
