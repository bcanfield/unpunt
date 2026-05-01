# Dogfood log — Phase 0c capture/non-capture seeding

This template structures observations from real Claude Code sessions so they convert cleanly into golden-set YAML scenarios. Per `docs/06-build-plan.md` Phase 0 and `docs/11-checklist.md` Phase 0c, the corpus is **error-analysis-first** — built from real misses on real repos, not imagined ones.

**Goal**: 30 capture + 25 non-capture scenarios derived from 2 days of dogfooding on personal repos. (Adversarial 8 + planning 10 are spec-driven and already authored under `core/golden-set/adv-*.yaml` + `plan-*.yaml`.)

**Working file**: `dogfood-log.md` at repo root (gitignored — keep your real session content local). This file (`docs/dogfood-log-template.md`) is the format spec; the working file is your scratchpad.

---

## Setup (one-time, per dogfood repo)

From the un-punt repo:

```bash
pnpm install && ./core/build.sh   # build the skill artifact (one-time)
```

Then `cd` into the repo you want to dogfood on and run the install CLI from the un-punt repo:

```bash
cd ~/path/to/your-personal-repo
~/path/to/un-punt/packages/cli/run.sh install claude-code
```

That installs the skill into `~/.claude/skills/un-punt/`, merges un-punt's `permissions.{allow,ask,deny}` into your `~/.claude/settings.json` (preserving anything you already had — the runtime safety net per [`08-design-decisions.md`](08-design-decisions.md) decision #20), and copies `core/skill/reference/contract-template.md` into `<cwd>/.un-punt/contract.md`. Restart Claude Code (or open a new session) to load the skill.

Verify with:

```bash
~/path/to/un-punt/packages/cli/run.sh status
```

If you iterate the skill body during dogfood (unlikely, but possible), re-run `install claude-code` to refresh the deployed copy. Re-installs are idempotent.

When you're done dogfooding:

```bash
~/path/to/un-punt/packages/cli/run.sh uninstall
```

removes `~/.claude/skills/un-punt/` and reverses the `settings.json` additions (precisely — leaves your pre-existing entries intact via the `~/.claude/un-punt-install.json` manifest). Your `<cwd>/.un-punt/` is left intact (your data, not ours to delete).

---

## What to record

Two flat lists per day. That's it. Don't structure per-session — the cognitive overhead defeats the point of dogfood.

The reason this is short: **un-punt's own `.un-punt/items/*.md` files self-document every successful capture.** I can enumerate them at end-of-dogfood and parse type, file, line, confidence, and `## Why deferred` text. The only signal I cannot get from un-punt's output alone is what un-punt **didn't** see (misses) or **shouldn't** have seen (false positives). Those are the only two things you need to write down.

### Per-day shape

```markdown
## Day 1 — <repo-name> (<language>)

### Misses
(deferrals you made that un-punt did NOT capture — one bullet per)

- <file>:<line> or <area> — what you said/did, why this should have been captured
- pages/billing.tsx — said in chat "we should clean up the duplicate format calls" but no item written
- src/auth/oauth.ts — added `// FIXME: refresh logic` after a Bash compile-error fix; un-punt missed it (maybe because it was added between two Edit calls?)

### False positives
(items un-punt captured that weren't real deferrals — one bullet per)

- tests/fixtures/parser.test.ts:14 — captured `TODO` inside a string literal that's test fixture content
- src/legacy/old-api.ts — captured an `as any` that has a comment explicitly justifying it ("type-narrowed at the boundary, this is correct")

### Wrap-up behavior
- Did the agent suggest a sweep at end-of-feature / area-switch / "looks good"? (yes / no / wrong moment)
- Phrasing (concise / preachy / off-key)
- Anything else surprising

### Other notes
- Anything that won't fit the categories above (UX surprises, install issues, things that broke)
```

That's it. Repeat for Day 2 on a different repo.

---

## Coverage targets — fill in at end-of-dogfood, not during

Don't aim for these during the dogfood — that biases what you observe. At end-of-dogfood, I'll enumerate the captures un-punt actually wrote, cross-reference your misses + false-positives lists, and we'll see whether we hit:

| Category | Target | Source |
|---|---:|---|
| capture (where un-punt got it right) | 30 | un-punt's own items + your "yes captured correctly" judgment |
| non-capture (cases un-punt correctly didn't capture) | 25 | absence-of-item observations + the 6 mandatory non-capture shapes (TODO in markdown heading, in string literal, etc.) |
| chat-only deferrals (≥5 of capture) | 5+ | from your misses list, plus instances un-punt did get |
| each language has ≥3 scenarios | 3 each | which is why day-1 and day-2 should be different languages |
| each item type has ≥3 scenarios | 3 each | derived from un-punt's captures + your judgments |

---

## What I do at end-of-dogfood

You hand me the filled-in `dogfood-log.md`. I:

1. **Enumerate captures** by walking `find ~/<your-repos>/.un-punt/items -name '*.md'` and parsing the frontmatter. This produces "the things un-punt actually captured" automatically.
2. **Cross-reference your misses + false-positives lists** to label each capture as expected, false-positive, or unrelated.
3. **Generate `core/golden-set/cap-NNN.yaml`** for each clean capture (with PII / repo-specifics scrubbed) and `nocap-NNN.yaml` for each false-positive (so future skill versions don't repeat the mistake).
4. **Generate `core/golden-set/cap-NNN.yaml`** for each miss (with the chat / code context that un-punt should have caught).
5. **Validate the corpus** parses and stratifies (≥3/language, ≥5 chat-only, etc.).
6. **Run formal Phase 0d eval** on the full ~73-corpus.

You don't need to author any YAML.

---

## Anti-patterns

- ❌ Trying to write a perfect log entry for every session. Bullets are fine.
- ❌ Including PII / secrets in observations. The file is gitignored but err on the side of caution; describe rather than quote when the content is sensitive.
- ❌ Aiming for the coverage targets *during* dogfood. Bias defeats the test.
- ❌ Writing entries for un-punt's correct captures. They self-document via `.un-punt/items/`.
- ❌ Multi-megabyte fixtures in your eventual scenario YAMLs (I'll handle that during conversion — keep ≤20 lines per file).
