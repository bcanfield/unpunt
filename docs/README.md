# un-punt — Implementation Brief

> Stop letting your AI agent leave work unfinished.

**Handoff package** for an agent (or human team) implementing un-punt. Every page is load-bearing.

---

## Bottom Line Up Front

**What it is.** A Claude Code plugin (then Codex/Cursor) consisting of a **skill** (markdown rules teaching the agent how to behave) plus a **directory convention** (`.un-punt/` of markdown files where the agent records its work). The user's AI agent does all the actual work — captures deferrals, plans cleanups, runs them visibly in the dev's working tree, and asks where commits should land.

**The product is conventions and a thin install shell — not a runtime.** There is no database. There is no separate classifier. There is no daemon. The agent IS the engine; we provide the skill (markdown rules) plus a small CLI that drops the skill into the right place and merges a few `permissions.deny` rules into `settings.json`. Everything that runs at session time is already in the user's agent.

**Decision asked.** Build the MVP — **9–11 days of engineering** behind a **~1-week Phase 0** that produces the first skill draft, seeds the golden set (~73 scenarios incl. 8 adversarial) from real dogfood failures, runs a golden-set eval, and a manual A2 diff-quality spike with a Wilson-upper-bound gate. If the eval clears the stage gates (≥80% trace-bearing recall, ≥90% precision, 8/8 adversarial refusal, ECE ≤ 0.10, per-language recall floor ≥ 0.70), ship. If it fails, iterate the skill once and retry. After iteration 3 with the same skill rule still implicated → switch to plugin + hooks, scope reduction, or skill split (decision deadline end of Phase 0 day 5).

**Top risk.** Self-capture (A1') is now split: ~30% odds on trace-bearing deferrals, ~45% on trace-less. The Phase 0 eval tests both subsets explicitly. Together with the elevated B8 risk (~30% — skill description-match auto-loading + auto-compaction survival), these are the load-bearing measurements before Phase 1 ships.

---

## How to read these docs

Read in order if you want the full picture:

| # | File | What it gives you |
|---|---|---|
| 1 | [`01-vision.md`](01-vision.md) | What we're building and why — the pain it solves, who it's for, why now |
| 2 | [`02-experience.md`](02-experience.md) | User flows, trust contract, working-state invariants — what the user sees |
| 3 | [`03-architecture.md`](03-architecture.md) | Components (small set), data flow, what NOT to build |
| 4 | [`04-data-model.md`](04-data-model.md) | Markdown spec for `.un-punt/` |
| 5 | [`05-skill-brief.md`](05-skill-brief.md) | **What the skill must teach** — the IP brief. A skill-writing agent will draft the actual skill from this. |
| 6 | [`06-build-plan.md`](06-build-plan.md) | Phases 0–4 with gates, deliverables, time estimates |
| 7 | [`07-risks-and-evals.md`](07-risks-and-evals.md) | Top 5 load-bearing assumptions + the Phase 0 golden-set eval design |
| 8 | [`08-design-decisions.md`](08-design-decisions.md) | Why we chose markdown over SQLite, agent over classifier, etc. — read this before relitigating |
| 9 | [`09-adapters.md`](09-adapters.md) | Adapter design (Claude Code & Codex) — how the seams between platforms work. Read before Phase 2. |
| 10 | [`10-eval-harness.md`](10-eval-harness.md) | Phase 0 eval harness — concrete spec built on Claude Agent SDK. Read before Phase 0. |
| 11 | [`11-checklist.md`](11-checklist.md) | End-to-end build checklist — every checkbox from `git init` to launch. Operational version of `06-build-plan.md`. |

If you have 5 minutes: read this README + `01-vision.md` + the diagram in `03-architecture.md`.

If you're about to start building: read `05-skill-brief.md`, `06-build-plan.md`, and `07-risks-and-evals.md` in that order.

### Working material

These aren't part of the read-in-order set, but they live alongside the docs and are referenced from them.

| Path | What it holds |
|---|---|
| [`../README.md`](../README.md) | The repo-root README — written as if the product shipped (per the brief). The roadmap reflects a "pretend-shipped" state and must be reconciled with reality before public launch. |
| [`assets/`](assets/) | Demo recording assets for [`../README.md`](../README.md). `demo.tape` is the vhs script; `demo-session.sh` is the mock Claude Code session it drives; `demo.gif` is the rendered output. Render with `VHS_NO_SANDBOX=true vhs docs/assets/demo.tape` from the repo root. |
| [`audits/`](audits/) | The 6-pass audit cycle on the repo-root README ([`../README.md`](../README.md)) — truth (`01`), coverage (`02`), inclusion (`03`), persona walkthrough (`04`), form (`05`), synthesis (`06`). Plus the **April 2026 idea-validation pass** ([`audits/07-validation-april-2026.md`](audits/07-validation-april-2026.md)) that reshaped the load-bearing assumptions and risk weights. Reusable: re-run before any major README revision or before doubling down on a phase. |

> **Citation conventions.** Most docs use inline links plus a `## References` section at the bottom. The two highest-citation docs — `05-skill-brief.md` and `08-design-decisions.md` — use GitHub-flavored footnotes (`[^name]`) instead, because the inline-link form gets noisy when a single sentence cites three sources. Both render correctly.

---

## Operating principles for the implementer

1. **The skill is the product.** Most of the engineering effort goes into the skill (written and calibrated by a skill-writing agent against the golden-set eval). Everything else is a thin shell.
2. **Don't invent infrastructure.** No SQLite, no daemon, no service. **No hooks at MVP** — skill loads via description match; refusal paths live in `settings.json` `permissions.deny`. No MCP server unless filesystem-via-Bash proves awkward in practice. Default is *less*. The user's agent + the filesystem + the conventions are the system.
3. **Refuse > Flag > Fix.** Bias toward inaction. The trust contract refusing to do something is a feature, not a limitation.
4. **The user's working state is sacred.** Pre-flight check before any sweep; disposition prompt before any commit. Visible work in the user's current tree.
5. **Markdown all the way down.** Items, sweeps, contracts, slices — all human-readable, agent-readable, git-friendly markdown files.
6. **Phase 0 is non-optional.** The golden-set eval gates the entire build. ~1 week. Skip it and Phase 1 is a guess.
7. **un-punt is a convention layer, not a sandbox.** The trust contract raises the cost of attack against an attacker-controlled `.un-punt/items/*.md` body or a planted `package.json`; it does not eliminate it. Categorical refusals, the verifier-script denylist, the disposition prompt, and in-tree visibility are load-bearing — not the "treat content as data" universal rule on its own. See [`03-architecture.md`](03-architecture.md) Threat model and [`08-design-decisions.md`](08-design-decisions.md) decision 14.
