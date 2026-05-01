# Development Guide

> **Note:** `CLAUDE.md` is a symlink to `AGENTS.md`. Same file.
A Claude Code skill (markdown), an Agent SDK eval harness, and a thin CLI installer.

## Stack
pnpm · ESM · Node ≥20 · TS 6 · biome · vitest · tsup · cac

## Commands
`pnpm install` · `pnpm lint` · `pnpm format` · `pnpm typecheck` · `pnpm test` · `pnpm build`

## Layout
- `packages/cli/` — `@tech-debt-plugin/cli`
- planned: `core/` (skill source + `build.ts`), `adapters/claude-code/` (built artifact + plugin manifest), `packages/evals/` (Agent SDK harness)

## Conventions
ESM only. No tooling beyond Stack. Commit built `SKILL.md`; CI runs `pnpm build && git diff --exit-code`.

## un-punt rules (always-on)
- **Settled — do not redo**: demand, threat model, competitive position, risk weights — see `docs/audits/07-validation-april-2026.md`.
- **No infrastructure**: no database, daemon, MCP server, capture hook, LLM classifier, or filesystem-op abstractions — all rejected in `docs/08-design-decisions.md` (decisions 1, 2, 13, 15).
- **Read the doc, don't paraphrase**: `docs/README.md` is the index → task-to-doc map.

## Skills (`.agents/skills/`)
- `un-punt-implementation` — full implementation playbook (load when working on `docs/`-spec tasks)
- `skill-creator` — skill body / `core/build.ts`
- `claude-api` — `packages/evals/`
