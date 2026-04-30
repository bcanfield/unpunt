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

## Skills (`.agents/skills/`)
- `skill-creator` — skill body / `core/build.ts`
- `claude-api` — `packages/evals/`
