# 08 — Design Decisions

The project's decision register. Read this before relitigating any of them.

**Each decision**: *chose*, *alternatives*, *why*, *tradeoff*. Numbered, append-only.

**Bar for adding a new entry** (per `AGENTS.md` "After completing a task"):
- Constrains future work, *or*
- Hard to reverse, *or*
- Deviates from a spec doc (also requires editing the spec doc in the same PR), *or*
- Answers an architectural question an agent will plausibly re-ask later.

**Not** for: bug fixes, formatting, mechanical renames, obvious tooling picks, anything already covered by an existing decision.

---

## 1. Markdown files, not SQLite

**Chose**: Items, sweeps, contracts, slices, lifecycle history are markdown files in `.un-punt/`.

**Alternatives**: SQLite database with normalized tables and an MCP wrapper (the original blueprint).

**Why**:
- **Agent-native** — reads/writes via existing Edit/Write/Bash tools; SQLite needs an MCP wrapper for every operation. Matches the AGENTS.md / CLAUDE.md / `.cursor/rules` / `.github/copilot-instructions.md` convention every coding agent now expects [^agents-md][^cursor-rules].
- **Human-readable** — `cat .un-punt/items/up-7f3a.md` shows full history; SQLite needs a query.
- **Git-friendly** — items can be committed; lifecycle is git-diffable.
- **No migrations** — format evolves; agent handles backward compat.
- **Sufficient at our scale** — <2k items per repo, <17 MB / repo / year; `rg` is sub-second.

**Tradeoff**: complex queries are slower. Mitigated by the small dataset (`rg` over <2k items is sub-second; no need for a maintained index file).

---

## 2. The user's agent is the engine — no separate classifier

**Chose**: The user's existing agent does capture, classification, planning, fixing. We provide rules (skill) + shapes (markdown spec).

**Alternatives**: A separate Sonnet-based classifier reading raw signals retrospectively (the original blueprint's central component).

**Why**:
- **Higher fidelity** — agent has perfect intent-context in real time vs. a retrospective string-pattern guess.
- **No precision problem** — original A1 ("classifier ≥ 85% precision") had ~50% odds of failing; new A1' has ~25%.
- **No additional LLM cost** — capture is part of normal work.
- **No prompt to maintain** — the skill is the only artifact.
- **Items include reasoning** the classifier could never recover.
- **Modern eval guidance aligns** — Husain/Shankar prescribe LLM-as-judge for *evaluation* (binary, scoped); they explicitly warn against fine-tuned classifiers as the primary loop until you have hundreds of labels and a stable taxonomy [^hamel-evals][^hamel-judge]. Our golden-set evals are the classifier's role; the agent does capture.

**Tradeoff**: depends on agent compliance. Mitigated by golden-set evals + safety-net file scan + bias toward over-capture.

---

## 3. In-tree sweep execution (visible in the user's current worktree)

**Chose**: Sweeps run in the user's actual current working tree. Edits visible. Disposition prompt at the end.

**Alternatives**: Isolated `/tmp/...` worktree (HEAD untouched); auto-commit to current branch; pure patch-file output.

**Why**:
- **Devs want to *see* the agent working.** Visibility is the trust mechanism, not isolation.
- **Matches normal feature work** — feels the same as everyday agent edits.
- **User can interject** ("don't touch that file") at any point.
- **Disposition prompt is the gate** — nothing lands on current branch without explicit approval.
- **Recovery is natural** — mid-sweep state is uncommitted edits; same as any interrupted agent task.

**Tradeoff**: requires pre-flight check to refuse on conflicting in-flight changes. Acceptable. `isolated` mode remains as opt-in for CI/scheduled use.

---

## 4. The skill is the IP — open source, not a service

**Chose**: Value concentrates in the skill (markdown rules). Everything else is a thin shell. Skill is MIT.

**Alternatives**: Hosted classifier service; closed-source binary with embedded prompts; "secret sauce" model.

**Why**:
- **Faster iteration** — skill change is a markdown edit + eval run, not a deployment.
- **Trust through openness** — every rule the agent follows is auditable.
- **Calibration is the moat** — anyone can write a skill; few will invest in golden-set evals across platforms iterated continuously.
- **Privacy by construction** — no service to send code to.

**Tradeoff**: easy to fork and compete on the skill itself. The eval-and-calibration discipline is what's hard to copy.

---

## 5. Local-first — no service touches the code

**Chose**: Everything happens on the user's machine. The only network call is the user's existing LLM API call.

**Alternatives**: Hosted backend ingesting transcripts; "un-punt cloud"; centrally-run MCP server.

**Why**:
- **Air-gapped/regulated orgs work out of the box** — no credentials, no new attack surface, no third-party access.
- **Trust by construction** — "your code never leaves your machine" needs no caveats.
- **Operating cost is zero** — no SRE, no hosting, no SOC2 until enterprise asks.
- **Privacy is the headline, not a footnote** — important for the eng-leader pitch.

**Tradeoff**: team aggregation (Phase 4) requires opt-in metadata sync (counts/types/ages — never code).

---

## 6. Refuse > Flag > Fix

**Chose**: When in doubt, refuse. When fixing might be wrong, flag. Only fix when reversible, scoped, high-confidence, verified.

**Alternatives**: Aggressive auto-fix with revert recovery; confidence-weighted with no hard refusals.

**Why**:
- **Trust takes 5 sweeps to build, 1 to lose.** A bad fix is much costlier than a flag.
- **A flag is success** — surfaces silent debt; reinforces "un-punt catches things."
- **Verification is mandatory** — no fix without `tests + tsc + eslint` clean.
- **Categorical refusals are absolute** — auth, crypto, payments, migrations, lockfiles, generated code never touched.

**Tradeoff**: more flags, fewer fixes per sweep. Accepted — bad commits are worse.

---

## 7. Disposition prompt, not auto-commit

**Chose**: At sweep end, the agent asks where commits should land (4 options).

**Alternatives**: Auto-commit to separate branch; auto-commit to current branch; "remember my choice."

**Why**:
- **Different sweeps want different outcomes** — feature-mid sweep vs. pre-break vs. trunk-based dev.
- **Trust through agency** — user always decides where commits go.
- **Easy to opt into auto-mode later** — observe what people pick first.
- **Specific 4-option prompt > yes/no** — never trust an "are you sure?" pattern.

**Tradeoff**: 1 extra interaction per sweep. Acceptable.

---

## 8. Real-time capture, no transcript ingestion

**Chose**: Agent captures deferrals as it makes them, in the active session. We do not read JSONL transcript files.

**Alternatives**: Tier-1 transcript ingestion at hook time (parse, extract, classify retrospectively).

**Why**:
- **Agent has full context in real time** vs. retrospective recovery.
- **Privacy improves dramatically** — no transcript files = no scrubbing risk = no leak surface.
- **No format-stability dependency** — Claude Code can change transcript format; we don't care.
- **Simpler architecture** — no parser, no extractor, no incremental ingest.
- **Cross-platform consistency** — Codex/Cursor have different/no transcript storage.

**Tradeoff**: cross-session self-audit (Phase 2) is harder; optional, not load-bearing.

---

## 9. Cleanup framing, not tracker framing

**Chose**: Position as an "AI code janitor" that *finishes the agent's work*. Output is cleanup commits.

**Alternatives**: Tracker ("track AI debt"); memory tool; static analyzer ("score your debt").

**Why**:
- **Trackers get ignored. Janitors get paid.** The services market (Beam, Autonoma, etc.) is the validation.
- **Demo-able in 30 seconds** — a diff beats a dashboard.
- **Resolution loop, not recall loop.** Memory tools (claude-mem, Anthropic's Remember) end at "search past sessions." un-punt ends at a verified cleanup branch with disposition. claude-mem could grow a cleanup feature on top of its capture infrastructure (~2–3 weeks of work — see [`07-risks-and-evals.md`](07-risks-and-evals.md) §A3'); we lead on the resolution-loop pieces (categorical refusals, two-receipt provenance, lifecycle states, disposition prompt) that require structural commitments upfront.
- **Pricing maps to value** — per-PR / per-cleanup-hour is clearer than per-seat.

**Tradeoff**: requires the resolution-loop infrastructure (verification, receipts, disposition). Worth it.

---

## 10. Drop "debt" from user-facing language

**Chose**: UX uses "cleanup", "deferred", "follow-ups", "loose ends." Internal docs can use "debt."

**Alternatives**: Lead with "tech debt" / "AI debt" / "vibe debt" — the organic category names.

**Why**:
- **"Debt" creates ontology friction** — users argue "this isn't debt, it's a feature request."
- **"Debt" feels moralizing.** "Cleanup" is action-oriented.
- **"Deferred" is neutral** — describes state without judgment.

Marketing can still use debt-related language for the eng-leader narrative ("the AI debt crisis"). The product UX uses "cleanup."

---

## 11. The agent suggests, doesn't enforce — slash commands aren't required

**Chose**: The skill teaches the agent when it's polite to suggest. Users never have to remember `/un-punt` for the default experience.

**Alternatives**: Force `/un-punt` invocation; auto-run on every session end; block feature work when debt threshold crossed.

**Why**:
- **Adoption barrier disappears** — no vocabulary to learn.
- **Respects flow** — never interrupts mid-task.
- **Easy to dismiss** ("later", "not that area").
- **Agent's natural voice carries it** — not a rigid template.

**Tradeoff**: depends on the skill's suggestion rules being well-calibrated. Tested in evals.

---

## 12. Single-developer-per-repo at MVP

**Chose**: Each dev's `.un-punt/` is local. Multi-dev team coordination is Phase 3+.

**Alternatives**: Shared `.un-punt/` committed to the repo from day 1.

**Why**:
- **Concurrency explodes** with multiple writers — lock-file convention fails for many.
- **MVP wedge is solo + 2–5 person teams** — no need yet.
- **Optional team commit** of `.un-punt/` is supported (remove from `.gitignore`).
- **Phase 3 GitHub App** brings team aggregation properly.

**Tradeoff**: until Phase 4, eng leaders can't see aggregate views. Not the wedge.

**Personas this excludes at MVP** (acknowledged explicitly so the build plan's targeting matches reality): the persona-2 ("AI-native startups, 10–50 eng") and persona-3 ("Mid-market eng orgs, 50–500") groups in [`01-vision.md`](01-vision.md) routinely have multiple devs editing the same repo. Single-developer-per-repo at MVP means those personas get a *partially* working un-punt — captures and sweeps work, but their teammates' captures don't aggregate, and item dedup across devs only lands in Phase 3. The wedge persona ("solo + 2–5 person teams") gets the full MVP; personas 2 and 3 are deliberately served at a reduced level until the GitHub App. README and landing page should set this expectation.

---

## 13. Skill (with auto-invocation), not hooks, for self-capture

**Chose**: Triggering happens via the skill's `description` field — Claude reads it on every turn and auto-invokes when a deferral signal matches. No `PostToolUse` hook for capture.

**Alternatives**: A `PostToolUse` / `Stop` hook that scans tool output for deferral patterns; a slash command users must remember.

**Why**:
- **Skills are the right primitive for "how to behave"** — hooks are deterministic event-driven scripts; skills are model-interpreted procedural knowledge [^cc-skills][^cc-hooks]. Capture is a judgment call, not a regex match.
- **Auto-invocation works when the description is well-written** — Claude matches description against intent on every turn; this is the documented pattern [^cc-skills][^skill-trigger].
- **Cross-platform** — Cursor rules, Copilot instructions, and Codex all read markdown-with-trigger-description; hooks are Claude-Code-specific.
- **Hooks remain available for refusal** — see decision 14.

**Tradeoff**: skill description must be calibrated; if it's vague, Claude won't invoke. Mitigated by golden-set evals.

**Concrete failure modes documented April 2026** (see [`07-risks-and-evals.md`](07-risks-and-evals.md) B8 for the full Day-7 dogfood spec):
- The skill listing is truncated at `SLASH_COMMAND_TOOL_CHAR_BUDGET = 1,536 chars` (description + `when_to_use` combined). Trigger keywords past the budget are silently stripped. The skill brief's frontmatter must keep the combined length under this cap.
- Auto-compaction caps re-attached skills at 5,000 tokens each / 25,000 token shared budget. Long sessions can drop the skill body silently, breaking mid-session capture.

**New frontmatter fields available** (April 2026):
- `when_to_use` — separate field appended to `description` in the skill listing; useful for additional trigger keywords without bloating the headline description.
- `paths` — glob patterns that path-scope auto-invocation. Useful for narrowing un-punt to project files where deferrals are likely (`src/**/*.ts`, etc.) vs. fixtures or vendored code.

---

## 14. Refusal via `permissions.deny` + `PreToolUse` hook + skill-level bypass-mode detection (revised April 2026)

**Chose**: Categorical refusals (auth, crypto, payments, migrations, lockfiles, generated code) are enforced **three** ways — `settings.json` `permissions.deny` patterns, a `PreToolUse` hook that returns `permissionDecision: "deny"`, **and a skill-level bypass-mode refusal** (skill aborts on session start if bypass mode is detected).

**Alternatives**: Skill-only ("the agent shouldn't touch these"); hook-only; permissions-only.

**Why**:
- **`permissions.deny` is the documented declarative deny mechanism** but has known matching gaps (multiline commands, project vs. user precedence). [^cc-permissions][^cc-perm-traps] In addition, **Adversa disclosed in Mar 2026** a bypass when a Bash command contains > 50 subcommands (token-cost short-circuit in `bashPermissions.ts`); patched in v2.1.90, but un-punt cannot assume users are on that version.
- **`PreToolUse` hooks see the full command string** including pipes/subshells and run *before* permission resolution. [^cc-hooks]
- **Earlier drafts of this doc claimed `permissionDecision: "deny"` blocks even in `bypassPermissions` / `--dangerously-skip-permissions` mode. That claim does not hold.** GitHub issues anthropics/claude-code [#39523](https://github.com/anthropics/claude-code/issues/39523), [#18846](https://github.com/anthropics/claude-code/issues/18846), and [#41615](https://github.com/anthropics/claude-code/issues/41615), plus the Agentic Control Plane analysis, document that hooks are silently disabled (or behave unpredictably) under `--dangerously-skip-permissions` in current versions. The truth is **mode-and-version-dependent.**
- **Therefore: skill-level refusal is now load-bearing**, not redundant. The skill detects bypass mode at session start (env var `CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS`, the runtime permission state, or any future Anthropic-supplied probe) and **refuses to operate** — emits a one-line message explaining un-punt requires the standard permission system. No sweeps, no captures, no edits in bypass mode.
- **Defense in depth** — settings are convenience, hooks are enforcement *when not bypassed*, skill-level refusal is the floor. [^perm-vs-hooks]
- **Skill alone is insufficient for normal-mode refusals** — the skill is interpretive. Categorical rules must be deterministic when the permission system is functioning.

**Tradeoff**: three configuration surfaces. Worth it; refusal is the load-bearing trust mechanism. The skill-level bypass-mode refusal is what closes the gap when hooks aren't reliable. See [`03-architecture.md`](03-architecture.md) Threat model for the bypass-mode row and [`07-risks-and-evals.md`](07-risks-and-evals.md) C7 / C8 for the falsifying tests.

---

## 15. Plugin (skill + commands) — not an MCP server

**Chose**: Ship as a Claude Code plugin (skill + slash commands + hooks). Codex/Cursor adapters are the same markdown via their respective conventions.

**Alternatives**: Ship as an MCP server exposing `un-punt_capture`, `un-punt_sweep`, etc.

**Why**:
- **Skills teach how to think; MCP servers extend what you can reach** — un-punt is procedural knowledge over the existing filesystem and git, not a new external system [^skills-vs-mcp][^cc-customization].
- **No external system to integrate** — items are local files, sweeps are local edits. MCP would be a wrapper around tools the agent already has.
- **MCP adds a process to run, an auth surface, and protocol overhead** — none of which buys us anything.
- **Reconsider MCP** if/when team aggregation (Phase 4) needs a remote service to ingest counts/types/ages — that *is* an external system.

**Tradeoff**: each platform needs a thin adapter (Claude plugin, Codex `AGENTS.md`, Cursor rule). The skill content is shared.

---

## 16. Hybrid workspace layout — `packages/` for TS workspaces, repo root for spec trees

**Chose**: Pnpm workspace packages (`@un-punt/cli`, `@un-punt/evals`) live under `packages/`. Spec-driven trees (`core/`, `adapters/claude-code/`) live at the repo root. Both `pnpm-workspace.yaml` and `docs/11-checklist.md` Phase −1 reflect this.

**Alternatives**:
- *Strict per-original-checklist*: `core/`, `adapters/`, `evals/harness/`, `cli/` all at repo root, no `packages/` dir.
- *All-under-packages*: even `core/` and `adapters/` become workspace packages.

**Why**:
- **TS workspaces want `packages/*`** — pnpm workspace, catalog refs, `pnpm --filter @un-punt/<name>` all assume the convention. Putting `cli/` and `evals/harness/` at root works but loses the visual signal that these are publishable npm packages.
- **`core/` and `adapters/` aren't TS packages** — they're spec content (markdown skill body + reference + scenarios) and built skill artifacts (markdown SKILL.md + plugin.json). Forcing them into the `packages/` mold would lie about what they are.
- **Adapter installer paths stay sane** — `cp -r adapters/claude-code/skills/un-punt ~/.claude/skills/` matches what 09-adapters.md prescribes; nesting it under `packages/` would make the path uglier.

**Tradeoff**: two top-level conventions to remember (`packages/*` vs root). Mitigated by AGENTS.md "Layout" block listing all four. Required updating `docs/11-checklist.md` and `docs/{05,06,10}-*.md` path references in the same change to match (per the deviation rule).

---

## 17. pnpm catalog for shared workspace devDeps

**Chose**: Versions of `@types/node`, `tsup`, `tsx`, `vitest` declared once in `pnpm-workspace.yaml` `catalog:`, referenced as `"name": "catalog:"` from each package's `devDependencies`.

**Alternatives**:
- *Per-package duplication*: each `packages/*/package.json` carries its own version pin. Drift over time.
- *Root devDependencies + hoisting accident*: only declare at root; rely on pnpm hoisting so workspace packages find them via `node_modules` lookup. Each package.json then lies about what it uses; `pnpm --filter` semantics get fragile; future package extraction breaks.

**Why**:
- **Single source of truth for versions** — upgrading tsup is one line, not N.
- **Each package still declares what it uses** — explicit dependency graph; honest lockfile; future package extraction works.
- **Stable in pnpm 10+** — we're already on 10.7.0.

**Tradeoff**: pnpm-specific (no npm/yarn fallback). Acceptable — `packageManager: "pnpm@10.7.0"` is locked in `package.json`.

---

## 18. Verifier discovery is execution-time, not planning-time

**Chose**: Sweep planning categorizes items by *confidence + categorical refusals only*. Verifier discovery (looking for `package.json` test scripts, `tsc`, etc.) and FLAG-only mode are execution-time concerns. The plan listed in `plan.md` reflects what *would* be fixed; the actual execution-time degradation (if verifier turns out unavailable) is recorded in `report.md`.

**Alternatives**:
- *Pre-degrade at planning time*: detect missing verifier upfront and put fix-eligible items in the Flag bucket of `plan.md`. The user sees one consistent view of "what will happen".
- *Always require a verifier before planning at all*: refuse to plan if no verifier exists, force the user to add one first.

**Why**:
- **Honesty about what was planned vs what was executed.** If `plan.md` already pre-degrades, the user can't see what the skill *would* have attempted given a working verifier — they only see the degraded outcome. Splitting concerns lets the user diff "intended" vs "executed" and decide whether to add a verifier and re-run.
- **Phase 0d eval evidence**: when planning was ambiguous about verifier-discovery timing, identical scenarios produced different `plan.md` contents (some pre-degraded, some didn't), making the eval flap on sampling noise alone. Forcing planning to be verifier-agnostic eliminates that variance.
- **Matches the spec's section split**: `SKILL.body.md` / `05-skill-brief.md` cover Sweep planning §3 and Sweep execution §4 separately; verifier rules live under §4. Pre-degrading at planning time conflates the two phases.

**Tradeoff**: a user reviewing only `plan.md` (without reading `report.md`) might think "the skill plans to fix these 3 items" when the actual outcome will be flag-only. Mitigated by the skill's planning-time chat warning ("heads up — no `package.json` test script visible; if you proceed, all 3 fix items will degrade to flag at execution"). The skill body's Sweep planning section now states this explicitly.

---

## 19. Eval harness assumes Claude Code subscription auth (API key is invisible fallback)

**Chose**: `packages/evals/` does no auth setup of its own. The Claude Agent SDK reads OAuth credentials from the user's existing Claude Code login (`claude /login`); if `ANTHROPIC_API_KEY` is set in the user's shell env, the SDK silently uses that instead. No `dotenv`, no `.env.example`, no flag.

**Alternatives**:
- *API-key primary with `.env` loading via `dotenv`*: previous state. Required `.env` setup, exposed users to surprise API bills, polluted the package with an auth-config dep.
- *Two flags, two modes (`--use-claude-subscription` + `--use-api-key`)*: explicit but adds CLI surface area for a binary choice the SDK already handles.
- *Detect-and-warn at startup*: probe `~/.claude/auth.json` and `process.env.ANTHROPIC_API_KEY`, print which mode is active. The SDK's own error messages already do this clearly enough; redundant.

**Why**:
- **un-punt is a Claude Code plugin.** Every dev running the evals already has Claude Code installed and (almost certainly) a subscription. Asking them to *also* set up an API key + `.env` is friction without value.
- **Eliminates accidental-spend risk.** During Phase 0d triage we burned ~$14 on API runs partly because dotenv made the API path frictionless. Subscription auth has a fixed monthly fee; can't be over-spent.
- **The SDK's auth precedence (`ANTHROPIC_API_KEY` → OAuth) is exactly what we want.** Default = subscription (no setup). CI / Anthropic-internal = `export ANTHROPIC_API_KEY=...` works as a transparent override. Two paths, no harness code branching.
- **Matches the eval's purpose.** Cost-tracking was useful in Phase 0d triage but isn't load-bearing. The SDK still reports `total_cost_usd` as a token-count proxy regardless of billing mode — informational either way.

**Tradeoff**: CI eval runs need an API key (no OAuth flow in headless envs). Solved by the silent-fallback: any future CI workflow just does `export ANTHROPIC_API_KEY=...` before `pnpm --filter @un-punt/evals run all`. Cost reporting is misleading on subscription (shows "$X estimated" when nothing was actually charged) — the report header now labels it `Token cost (est.)` with a footnote to clarify.

---

## When NOT to apply these decisions

Reconsider if:

- **Markdown over SQLite**: items cross 50k per repo (massive monorepo, 5+ years). Until then, no.
- **Agent-as-engine**: golden-set evals consistently fail across multiple skill iterations → hybrid with a separate audit step is on the table.
- **Local-first**: a regulated customer needs centralized audit logs → opt-in audit-log sync is reasonable.
- **In-tree default**: never reconsider. Load-bearing for trust.
- **Refuse > Flag > Fix**: never reconsider. The bias is the product.
- **Plugin over MCP**: Phase 4 team aggregation needs a remote ingest endpoint → an MCP server (or plain HTTP) becomes appropriate then.
- **No daemon**: if Anthropic ships a stable always-on subagent runtime (cf. KAIROS-style background daemons [^kairos]) and users want passive cross-session audit, a thin background sub-agent becomes considerable. Today, opt-in only.

---

## The unifying principle

Every decision serves one principle:

> **The user's agent is smart. The user is smart. We provide conventions, not control.**

When tempted to add a feature, ask: does this give the agent more context, or does it constrain what the agent does? If the latter, you're probably on the wrong path.

The skill teaches. The conventions shape. The user decides. Everything else is plumbing.

---

## References

- [^agents-md]: [AGENTS.md — open standard for agent instructions](https://agents.md/) (Sourcegraph, OpenAI, Google, Cursor; now under the Linux Foundation's Agentic AI Foundation).
- [^cursor-rules]: [Cursor — Best practices for coding with agents](https://cursor.com/blog/agent-best-practices) — `.cursor/rules/` and `.cursor/plans/` as agent-readable markdown state.
- [^hamel-evals]: Hamel Husain, [*Your AI Product Needs Evals*](https://hamel.dev/blog/posts/evals/).
- [^hamel-judge]: Hamel Husain, [*Using LLM-as-a-Judge for Evaluation: A Complete Guide*](https://hamel.dev/blog/posts/llm-judge/) — judges should do scoped binary classification; classifiers earn their place via golden-set alignment, not as the primary loop.
- [^cc-skills]: [Claude Code — Extend Claude with Skills](https://code.claude.com/docs/en/skills) — auto-invocation matches the SKILL.md `description` against user intent.
- [^cc-hooks]: [Claude Code — Hooks reference](https://code.claude.com/docs/en/hooks) — `PreToolUse` runs before the permission system; `permissionDecision: "deny"` blocks even under `bypassPermissions`.
- [^cc-permissions]: [Claude Agent SDK — Configure permissions](https://platform.claude.com/docs/en/agent-sdk/permissions).
- [^cc-perm-traps]: [6 Claude Code Permission Traps](https://dev.to/yurukusa/6-claude-code-permission-traps-i-found-answering-github-issues-this-week-3ja2) — multiline-command and user-vs-project deny gaps motivating hook-as-enforcement.
- [^perm-vs-hooks]: [Claude Code Hooks: Complete Guide](https://claudefa.st/blog/tools/hooks/hooks-guide) — "permissions are convenience, hooks are enforcement; use both."
- [^skill-trigger]: [How Claude Code Auto-Triggers Skills vs Manual Invocation](https://docs.bswen.com/blog/2026-03-24-skill-triggering/) — description-driven auto-invocation pattern.
- [^skills-vs-mcp]: [Claude Code Skills vs MCP vs Plugins](https://www.morphllm.com/claude-code-skills-mcp-plugins) — "Skills change how Claude thinks; MCP servers change what Claude can do."
- [^cc-customization]: Aaron Ott, [*The Claude Customization Stack: MCP vs Skills vs Plugins*](https://www.ado.im/posts/claude-customization-stack-mcp-skills-plugins/).
- [^kairos]: Anthropic, [*Building agents with the Claude Agent SDK*](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — subagent orchestration; KAIROS-style background-daemon mode is experimental, not yet a stable runtime to depend on.
