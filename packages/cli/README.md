# un-punt

> Capture deferrals (TODOs, `as any`, skipped tests, swallowed exceptions) during agent coding work; finish them on a verified cleanup pass at natural stopping points.

The thin installer for the [un-punt](https://github.com/bcanfield/un-punt) Claude Code skill + hooks.

## Quick start

```bash
# Install the skill, hooks, and merge permission/hook blocks into ~/.claude/settings.json
npx un-punt install claude-code

# Show what's been captured in the current repo
un-punt status

# Cleanly remove (reverses every settings.json mutation precisely)
npx un-punt uninstall
```

After install + Claude Code restart, the skill auto-loads at session start, captures deferrals during Edit/Write events, and proposes a cleanup pass at natural stopping points. You don't need to invoke `/un-punt` by hand.

## What gets installed

- `~/.claude/skills/un-punt/` — skill body, reference docs, hook scripts, contract template
- `~/.claude/settings.json` — `permissions.{allow,ask,deny}` and `hooks` blocks merged (your existing entries are preserved)
- `~/.claude/un-punt-install.json` — install manifest tracking ownership (used by `uninstall` to reverse precisely)
- `<cwd>/.un-punt/contract.md` — per-repo contract template (only written if not already present)

## Commands

| Command | Description |
|---|---|
| `un-punt install <platform>` | Install the skill + hooks. Currently `claude-code` is supported. |
| `un-punt status` | Show open / planned / resolved counts, hot zones, oldest open items. |
| `un-punt status --share` | One-line summary suitable for pasting into a feedback DM. |
| `un-punt uninstall` | Reverse the install. Leaves `<cwd>/.un-punt/` intact (your data, not ours). |

Re-running `install` is idempotent.

## Requirements

- Node.js ≥ 18
- Claude Code installed
- A git repository as the cwd when capturing or sweeping

## Marketplace install (alternative)

If you'd rather use Claude Code's plugin marketplace:

```
/plugin marketplace add bcanfield/un-punt
/plugin install un-punt@un-punt
```

## What is un-punt?

A markdown skill plus three lightweight hooks (`SessionStart`, `PostToolUse`, `UserPromptSubmit`) that record every deferral your AI coding agent makes — TODOs, skipped tests, loosened types, "I'll handle this later" — as a typed item in `.un-punt/`, then close them at natural stopping points with verified diffs and receipts you can audit. The skill is the IP — the rules. Hooks fire at deterministic events to load the skill reliably and nudge the agent at the right moments.

Not a style cleaner. Not a PR-review bot. The cross-session record of what your agent deliberately punted on, finished before you ship.

Full docs, architecture, and dogfood evidence: [github.com/bcanfield/un-punt](https://github.com/bcanfield/un-punt).

## License

MIT. © 2026 Brandin Canfield.
