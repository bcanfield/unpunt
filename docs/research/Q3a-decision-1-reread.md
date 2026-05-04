# Q3a — Decision 1 (markdown not SQLite) re-read against Q1+Q2 evidence

> Synthesis session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Owner: claude.

## Question

Does any v0.2 candidate architecture imply moving away from markdown? For each of Decision 1's reasoning bullets, is the original logic **still true / partially true / superseded by evidence**?

## Decision 1 verbatim (from `docs/08-design-decisions.md` lines 17–32)

> **Chose**: Items, sweeps, contracts, slices, lifecycle history are markdown files in `.un-punt/`.
>
> **Alternatives**: SQLite database with normalized tables and an MCP wrapper (the original blueprint).
>
> **Why**:
> - **Agent-native** — reads/writes via existing Edit/Write/Bash tools; SQLite needs an MCP wrapper for every operation. Matches the AGENTS.md / CLAUDE.md / `.cursor/rules` / `.github/copilot-instructions.md` convention every coding agent now expects.
> - **Human-readable** — `cat .un-punt/items/up-7f3a.md` shows full history; SQLite needs a query.
> - **Git-friendly** — items can be committed; lifecycle is git-diffable.
> - **No migrations** — format evolves; agent handles backward compat.
> - **Sufficient at our scale** — <2k items per repo, <17 MB / repo / year; `rg` is sub-second.
>
> **Tradeoff**: complex queries are slower. Mitigated by the small dataset (`rg` over <2k items is sub-second; no need for a maintained index file).

## v0.2 candidate architectures (carried forward from Q1+Q2)

| Option | Description |
|---|---|
| A | AGENTS.md primer only (no hooks) |
| B | Hooks Claude-Code-only (the May 1 path — now empirically dominated) |
| C | Hooks across Tier 1 (Claude/Cursor/Codex/Gemini/Copilot-VS) + AGENTS.md fallback for Tier 2/3 |
| D | Hooks across Tier 1 + Tier 2 partial (Copilot CLI) + AGENTS.md primer-only for Aider |

## Per-bullet verdict

| Bullet | Verdict | Justification against Q1+Q2 evidence |
|---|---|---|
| **Agent-native** — reads/writes via existing Edit/Write/Bash tools; matches AGENTS.md / CLAUDE.md / `.cursor/rules` / `.github/copilot-instructions.md` conventions | ✓ **STILL TRUE — strengthened** | Q2 evidence confirms AGENTS.md is the universal cross-platform primer (60k+ OSS projects; native or community-supported across all 6 surveyed platforms). The decision's parenthetical reference to "every coding agent now expects" this convention is empirically validated stronger than at decision time. None of options A/B/C/D require the agent to reach for a non-text storage tool. |
| **Human-readable** — `cat .un-punt/items/up-7f3a.md` shows full history | ✓ **STILL TRUE** | Hooks (any flavor) don't change item file format. `cat` still works post-v0.2. |
| **Git-friendly** — items can be committed; lifecycle is git-diffable | ✓ **STILL TRUE** | Hooks operate orthogonally to git. The minor finding about line-drift in items frontmatter (dogfood Day 3) is real but does not motivate moving to SQLite — a markdown `last_verified_at:` field handles it cleanly within the existing format. |
| **No migrations** — format evolves; agent handles backward compat | ✓ **STILL TRUE** | If anything, v0.2 may want to *add* a frontmatter field (e.g., `last_verified_at:`) — markdown frontmatter handles additive changes without migration. |
| **Sufficient at our scale** — <2k items per repo, <17 MB / repo / year; `rg` is sub-second | ✓ **STILL TRUE** | Hooks don't increase storage demands. The PostToolUse hook (if shipped) reads `.un-punt/items/` to check "is this already captured?" — Q1b notes this is a sub-second `rg` operation at scale. |
| **Tradeoff**: complex queries are slower; mitigated by `rg` over small dataset | ✓ **STILL TRUE** | No new query patterns introduced by v0.2 that need a join or index. The PostToolUse hook's "find item by file:line" lookup is a single-pass scan over <2k files — well within the sub-second budget. |

## Verdict summary

**Decision 1 is fully preserved by all four candidate v0.2 architectures.** No supersession needed. No partial-truth caveat warranted. The Q1+Q2 batch *strengthens* the "Agent-native + AGENTS.md convention" bullet by providing empirical evidence for the cross-platform claim that was previously framed in part as forward-looking.

A subtle nuance worth recording: the PostToolUse hook (in any candidate architecture that uses it) will read `.un-punt/items/*.md` via shell parsing (likely Python or `awk`) for the "already-captured?" check. **This is not a Decision 1 violation** — Decision 1 prohibits SQLite as the *storage* substrate; hook-side parsing of the markdown storage substrate by a non-agent process is orthogonal. The agent itself still reads/writes via Edit/Write/Bash, which was the load-bearing claim.

## Constraints check

This session IS a constraint check. Decision 1 itself is the constraint being evaluated. **Verdict**: the constraint binds for v0.2 as written; no amendment needed.

## Change-my-mind

This conclusion would be invalidated if:

1. **A v0.2 architecture surfaces (in Q5a/b/c) that requires a queryable index over items at scales beyond 2k.** Possible if punt-board's billboard view across many repos becomes the primary use case (rather than the per-repo skill); that would push toward an aggregator service (Phase 4 territory, not v0.2). Mitigation: keep the per-repo `.un-punt/` markdown as ground truth; let aggregators index downstream. Decision 1 still holds for the source of truth.
2. **Hook-side markdown parsing turns out to be too slow** at large scales (e.g., 10k items in a monorepo). Mitigation: cap the per-hook scan or cache the file-line index in a `.un-punt/.hook-state/index.json` (state file, not storage substrate). Doesn't violate Decision 1 — same pattern as the suggested-sessions marker file Q1b discussed.
3. **Some platform's hook contract requires structured data exchange beyond stdin/stdout JSON.** Q1+Q2 evidence shows all 6 platforms use stdin/stdout JSON. No platform requires a database for hook scripts to function.

## Risks surfaced

- **None new** beyond the already-known minor finding (line-drift in items). The line-drift fix is additive (`last_verified_at:` field) and does not motivate any storage change.
- **Hook-side parsing performance** is the only watch-item; sub-second at <2k items per Q1b but worth instrumenting if scale grows.

## Implications for downstream sessions

- Q5a (architecture candidates): all carry forward unchanged on the storage axis.
- Q5c (architecture decision): no Decision 1 amendment needed in the new design-register entry.
- Q6 (implementation): hook scripts can freely parse `.un-punt/` markdown; Decision 1 doesn't restrict this.
- Q8 (minor findings): the line-drift finding can be addressed via a markdown frontmatter addition without any storage-model change.
