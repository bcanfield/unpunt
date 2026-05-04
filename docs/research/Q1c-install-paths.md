# Q1c — Plugin install vs skill-direct hook registration

> Research session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Combined into the Q1b agent run via the `cc-docs` agent.

## Question

How are hooks registered when un-punt is installed via skill-direct copy (current path) vs marketplace `/plugin install`? Different settings.json blocks? `${CLAUDE_PLUGIN_ROOT}` availability differences? Recommendation for un-punt's CLI.

## Sources consulted

| Source | Provided |
|---|---|
| `cc-docs` agent (continued) | Skill-direct vs marketplace install patterns, hook registration mechanisms, path resolution behavior, recommendation framing |
| https://code.claude.com/docs/en/plugins.md | "Hooks in skills and agents" section |
| https://code.claude.com/docs/en/plugins-reference.md | `${CLAUDE_PLUGIN_ROOT}` substitution + plugin install scopes |
| https://code.claude.com/docs/en/skills.md | Skill loading rules |
| `packages/cli/src/install.ts` (un-punt repo, already read) | Current skill-direct install logic |

## Headline finding

The two install patterns have **fundamentally different hook registration models**: marketplace plugins get **auto-discovered** hooks from a `hooks/hooks.json` file in the plugin directory; skill-direct installs require the **CLI to merge a `hooks` block into the user's `~/.claude/settings.json`**. Crucially, **`${CLAUDE_PLUGIN_ROOT}` is only available in marketplace installs** — skill-direct hooks must use absolute paths or paths relative to the user's home dir. Un-punt's current skill-direct CLI works for hook registration *if extended* to merge a `hooks` block (paralleling how it already merges `permissions.{allow,ask,deny}`); the alternative is converting to a marketplace plugin, which adds discoverability + `${CLAUDE_PLUGIN_ROOT}` at the cost of marketplace hosting infrastructure.

## Side-by-side comparison

| Aspect | Skill-direct (un-punt's current path) | Marketplace plugin |
|---|---|---|
| **Install command** | Custom CLI script (e.g., `packages/cli/run.sh install claude-code`) | `/plugin install <name>@<marketplace>` |
| **Files land at** | `~/.claude/skills/<name>/` | `~/.claude/plugins/marketplaces/<marketplace>/<name>/` |
| **Hook auto-discovery** | ❌ No — hooks must be explicitly merged into `~/.claude/settings.json` | ✓ Yes — `hooks/hooks.json` at plugin root is auto-loaded |
| **Hook registration format** | User's `~/.claude/settings.json` `hooks` block (direct format, no wrapper) | Plugin's `hooks/hooks.json` (with `{"hooks": {...}}` wrapper) — see Q1a §"Hook configuration formats" |
| **`${CLAUDE_PLUGIN_ROOT}` available** | ❌ No (skill-direct doesn't have a "plugin root" concept) | ✓ Yes (recommended for path references) |
| **Path resolution options** | Absolute paths, paths relative to cwd; tilde-expansion not documented | Absolute paths, `${CLAUDE_PLUGIN_ROOT}/...`, paths relative to cwd |
| **Trust / permission scope** | Merged into user's global settings; user controls | Plugin install scope per Claude Code's plugin-install settings |
| **Discoverability** | None (user must know about un-punt + run the CLI) | `/plugin search`, `/plugin install` UX |
| **Hosting infrastructure required** | None (just a git repo + npm package) | Marketplace JSON file (`marketplace.json`) hosted somewhere reachable, typically a GitHub repo |
| **Hot-disable support** | No (uninstall via CLI) | `/plugin disable <name>` |

## How un-punt's current CLI works (re-derived from `install.ts`)

For grounding, the current un-punt skill-direct install does five things (lines 39–129 of `packages/cli/src/install.ts`):

1. Copies `adapters/claude-code/skills/un-punt/` → `~/.claude/skills/un-punt/`
2. Reads bundled `adapters/claude-code/settings.json`
3. Reads user's `~/.claude/settings.json` (or empty if missing)
4. Merges `permissions.{allow,ask,deny}` arrays from bundled into user's, deduplicating
5. Writes `~/.claude/settings.json` atomically + writes a manifest at `~/.claude/un-punt-install.json` tracking exactly which entries were added (so uninstall can reverse precisely)

**To add hook support**, the same pattern extends naturally: read a `hooks` block from bundled `settings.json`, merge it into the user's settings.json, track which hook entries were added in the manifest, reverse on uninstall. **No new infrastructure**; just an extension of the existing merge logic.

## Recommendation for un-punt

The agent presented two options; here's the synthesized recommendation against un-punt's design constraints (cross-platform thesis, no infrastructure, agent-as-engine):

### Option A — Stay skill-direct + extend CLI to merge a `hooks` block

**Approach**: extend `packages/cli/src/install.ts` to handle a `hooks` block from `adapters/claude-code/settings.json`, merging it into `~/.claude/settings.json` exactly like the existing `permissions.*` merge. Track added hook entries in `~/.claude/un-punt-install.json` for clean uninstall.

**Pros**:
- ✓ Zero new infrastructure (no marketplace.json, no hosting)
- ✓ Consistent with un-punt's existing CLI pattern
- ✓ Cross-platform-friendly (Codex/Cursor adapters can use similar CLI patterns; marketplace would be Claude-Code-only)
- ✓ Faster iteration during v0.2 development (no marketplace publish step)
- ✓ Decisions 1, 4, 5, 13, 15 all preserved (no infrastructure added)

**Cons**:
- ✗ No `${CLAUDE_PLUGIN_ROOT}` — hook scripts must use absolute paths (e.g., `~/.claude/skills/un-punt/hooks/session-start.sh`)
- ✗ No `/plugin install` discoverability
- ✗ No `/plugin disable` (uninstall is the only off-switch)

### Option B — Convert to marketplace plugin

**Approach**: add `.claude-plugin/plugin.json` declaring un-punt; move hook definitions to `hooks/hooks.json`; use `${CLAUDE_PLUGIN_ROOT}` in hook script paths; create marketplace.json hosted on GitHub.

**Pros**:
- ✓ Auto-discovery; `/plugin install un-punt@bcanfield/unpunt`
- ✓ `${CLAUDE_PLUGIN_ROOT}` available
- ✓ `/plugin disable` UX
- ✓ Better long-term polish

**Cons**:
- ✗ Marketplace.json hosting + maintenance overhead
- ✗ Claude-Code-specific install path (Codex/Cursor adapters need their own distribution mechanism anyway, but this widens the gap)
- ✗ Slower iteration during v0.2 development
- ✗ Decision 4 ("the skill is the IP — open source, not a service") slightly strained — marketplace adds a distribution surface

### Recommended: Option A for v0.2

**Reasoning**: v0.2's mission is fixing the load/enforcement failures, not improving distribution. Option A delivers the architectural fix without coupling to a distribution-model change. Convert to marketplace plugin in a future v0.3 if discoverability becomes a friction point — that's a marketing question, not a v0.2-load-failure question.

The CLI extension to merge a `hooks` block is **mechanically a small change** (~30 lines added to `install.ts` + similar to `uninstall.ts` + 1 new field on the manifest). Risk is low.

## Architectural implications for un-punt v0.2

If Option A is chosen (Q5c will confirm), the v0.2 install flow becomes:

1. Same as today, plus:
2. CLI reads `hooks` block from `adapters/claude-code/settings.json`
3. Merges into user's `~/.claude/settings.json` `hooks` key (deep-merge by event name, dedupe by command/matcher)
4. Tracks added hook entries in `~/.claude/un-punt-install.json` `added_hooks` (new field)
5. Hook scripts referenced via absolute paths like `bash ~/.claude/skills/un-punt/hooks/session-start.sh` (or computed at install time using user's `$HOME`)

**Uninstall** reverses by reading the manifest and removing exactly those hook entries.

## Constraints check

**N/A this session — capability discovery only.** Preliminary alignment notes:

| Constraint | Note |
|---|---|
| Cross-platform | Option A keeps un-punt's distribution mechanism uniform across platforms (each platform's adapter can have its own CLI install logic). Option B is Claude-Code-specific. **Option A is the cross-platform-friendlier choice.** |
| No infrastructure | Both options technically add no daemon/service. Option B adds marketplace.json hosting. Option A does not. |
| Agent is engine | Install pattern is orthogonal to this. |
| Markdown all the way down | Both preserve. |

## Change-my-mind

This recommendation would change if:

1. **Marketplace install is the only path that supports a critical hook capability** we discover later (e.g., some hook event isn't fired for skill-direct installs). Currently all evidence says skill-direct hooks work the same as marketplace hooks once registered in settings.json — but Q4/Q5 implementation should empirically verify.
2. **`/plugin disable` becomes a hard requirement** for un-punt's UX (e.g., users want to temporarily turn off un-punt without uninstalling). Current evidence: `un-punt uninstall` is a clean reversal; no temporary-disable need surfaced in dogfood.
3. **The marketplace ecosystem becomes the dominant distribution path** by v0.3 launch (e.g., Claude Code starts deprecating skill-direct installs). Watch for changelog signals.
4. **CLI complexity grows** (Codex/Cursor adapters each get their own CLI; cross-cutting CLI maintenance becomes the bottleneck). At that point, marketplace becomes the simpler distribution.

## Risks surfaced

- **Hot-reload limitation**: per Q1a, hook config changes require Claude Code restart. This affects both install patterns equally; not a differentiator.
- **Path resolution brittleness**: if un-punt is installed for one user but settings.json hooks reference `~/.claude/skills/un-punt/hooks/...`, this works only if `~` resolves to the installing user's home. Multi-user systems (rare for the target audience but worth flagging) might break.
- **Manifest drift**: if a user manually edits `~/.claude/settings.json` to remove un-punt's hooks, the manifest's "added entries" list becomes stale. Existing `permissions.*` merge logic already handles this case (see install.ts lines 92–98); same approach for hooks.
- **Settings.json size growth**: adding hook entries in addition to permission entries makes the user's settings.json larger. Negligible at un-punt's scale (<10 hook entries).
