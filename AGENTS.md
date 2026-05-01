# Development Guide

> **Note:** `CLAUDE.md` is a symlink to `AGENTS.md`. Same file.
A Claude Code skill (markdown), an Agent SDK eval harness, and a thin CLI installer.

## Stack
pnpm · ESM · Node ≥20 · TS 6 · biome · vitest · tsup · cac

## Commands
`pnpm install` · `pnpm lint` · `pnpm format` · `pnpm typecheck` · `pnpm test` · `pnpm build`

Per-package wrappers (build-on-stale + run):
- `./packages/cli/run.sh install claude-code` · `status` · `uninstall` — install/manage the un-punt skill on the local machine
- `./packages/evals/run.sh all` · `one <id>` · `category <name>` · `validate` — run the golden-set eval against the current skill build

## Layout
- `core/` — skill source (`SKILL.body.md`, `reference/`, `snippets/`) + `golden-set/` scenarios + `build.sh`
- `adapters/claude-code/` — built skill artifact + plugin manifest + settings
- `packages/cli/` — `@un-punt/cli` (thin installer)
- `packages/evals/` — `@un-punt/evals` (Claude Agent SDK harness)

## Conventions
ESM only. No tooling beyond Stack. Commit built `SKILL.md`; CI runs `pnpm build && git diff --exit-code`. Shared workspace devDeps go in `pnpm-workspace.yaml` `catalog:`, referenced as `"name": "catalog:"` from each package.

**Eval auth**: `packages/evals/` runs against your Claude Code subscription via OAuth — `claude /login` once is the only setup. If `ANTHROPIC_API_KEY` is set in your shell env, the SDK uses that as a transparent fallback (CI / Anthropic-internal). Don't add `dotenv` back. See `docs/08-design-decisions.md` decision 19.

## After completing a task
Three rules — apply each independently. Most tasks need none of them.

1. **Deviated from a spec doc?** Edit the spec doc in the same change. Silent drift is the failure mode.
2. **Made a decision that constrains future work?** Append a numbered entry to `docs/08-design-decisions.md` in the *chose / alternatives / why / tradeoff* shape (see existing entries). Bar: future-constraining, irreversible-ish, or answers an architectural question an agent will plausibly re-ask. **Skip for**: bug fixes, formatting, mechanical renames, obvious tooling picks, anything already covered by an existing decision.
3. **Changed a live convention agents must follow?** Update `AGENTS.md` (this file).

Per-task narrative lives in commit messages + PR descriptions, not a `WORKLOG.md`. `CHANGELOG.md` deferred until v0.1 launch (Keep a Changelog format).

## un-punt rules (always-on)
- **Settled — do not redo**: demand, threat model, competitive position, risk weights — see `docs/audits/07-validation-april-2026.md`.
- **No infrastructure**: no database, daemon, MCP server, capture hook, LLM classifier, or filesystem-op abstractions — all rejected in `docs/08-design-decisions.md` (decisions 1, 2, 13, 15).
- **Read the doc, don't paraphrase**: `docs/README.md` is the index → task-to-doc map.

## Skills (`.agents/skills/`)
- `un-punt-implementation` — full implementation playbook (load when working on `docs/`-spec tasks)
- `skill-creator` — skill body / `core/build.sh`
- `claude-api` — `packages/evals/`
