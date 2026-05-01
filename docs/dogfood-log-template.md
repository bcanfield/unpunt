# Dogfood log — Phase 0c capture/non-capture seeding

This template structures observations from real Claude Code sessions so they convert cleanly into golden-set YAML scenarios. Per `docs/06-build-plan.md` Phase 0 and `docs/11-checklist.md` Phase 0c, the corpus is **error-analysis-first** — built from real misses on real repos, not imagined ones.

**Goal**: 30 capture + 25 non-capture scenarios derived from 2 days of dogfooding on personal repos. (Adversarial 8 + planning 10 are spec-driven and already authored under `core/golden-set/adv-*.yaml` + `plan-*.yaml`.)

---

## Setup (one-time)

Install the built skill into your local Claude Code so it loads on every session:

```bash
mkdir -p ~/.claude/skills/un-punt
cp -r adapters/claude-code/skills/un-punt/* ~/.claude/skills/un-punt/
# Verify it loads:
claude --print "/skills" 2>&1 | grep un-punt
```

The skill description matches against your prompts via Claude Code's auto-load. You should never need to type `/un-punt` for capture to happen — it's silent, automatic.

In the repo you're dogfooding on, copy the contract template:

```bash
mkdir -p .un-punt
cp <un-punt-repo>/core/skill/reference/contract-template.md .un-punt/contract.md
```

`.un-punt/` is gitignored by default. Keep `~/.claude/skills/un-punt/` updated by re-running the cp after every Phase 0d skill iteration.

---

## Per-session log entry — copy and fill

```
### YYYY-MM-DDTHH:MM — repo: <repo-name> — language: <ts|py|go|...>

**Session summary** (1–3 sentences of what you were doing):
<e.g. "Implementing OAuth refresh; user asked me to ship the happy path
and tighten types later.">

**Deferrals the agent emitted in chat or in code:**
1. <e.g. "Wrote `as any` cast on line 142 of src/auth/oauth.ts to ship
   without typing the discriminated response.">
2. <…>

**For each deferral — did un-punt capture it correctly?**
| # | Captured? | Item file (if yes) | Notes |
|---|---|---|---|
| 1 | yes | up-7f3a2b1c.md | type=type-loosened, conf=0.87, why mentions grant_type ✓ |
| 2 | NO  | — | Chat-only deferral ("we should come back to this") — agent didn't write item file |

**False positives** (un-punt captured something it shouldn't have):
- <e.g. "Captured a TODO inside a string literal in tests/fixtures/parse.test.ts">

**Non-trivial signals worth a scenario:**
- <e.g. "User said 'skip that test for now' verbally — the .skip went into the
  code but the chat-only context wasn't preserved in the item.">
```

---

## Conversion checklist (turning a log entry into a YAML scenario)

For each captured deferral that should have been captured (whether un-punt got it right or not):

- [ ] Pick a category: `capture` (should capture) or `non-capture` (should NOT capture).
- [ ] Pick an `id`: `cap-NNN-<short-slug>.yaml` or `nocap-NNN-<short-slug>.yaml`.
- [ ] Trim the file content to a minimal reproduction (~5–20 lines is plenty).
- [ ] Strip identifying details — repo names, real customer data, secrets.
- [ ] Convert the conversation into 1–3 `turns:` entries (user → assistant). For assistant turns that did edits, add `tool_uses:` with the Edit/Write/Bash params.
- [ ] Set `expected.items[]` to what un-punt **should have** captured (one entry per expected item). Use minimal `confidence_min` (e.g. 0.6) and `why_must_contain[]` of 1–3 anchor words from the deferral context.
- [ ] For non-capture: list `forbidden_items[]` describing what un-punt should NOT capture.
- [ ] Validate: `./packages/evals/run.sh validate`.

---

## Coverage targets (per `docs/11-checklist.md` Phase 0c)

### Capture scenarios — 30 total

- [ ] All 6 item types represented (≥3 each):
  - [ ] deferred-implementation (3+)
  - [ ] type-loosened (3+)
  - [ ] skipped-test (3+)
  - [ ] hack-workaround (3+)
  - [ ] duplicated-code (3+)
  - [ ] other (3+)
- [ ] ≥3 scenarios per language: TS, Python, Go, Rust, Java
- [ ] ≥5 chat-only deferrals (no code comment — only said in chat)
- [ ] ≥3 multi-deferral scenarios in one session

### Non-capture scenarios — 25 total

The first 6 are mandatory (per checklist):
- [ ] TODO in markdown heading (e.g. `# TODO: refactor` in `README.md`)
- [ ] TODO in string literal (`const sample = "// TODO: ..."`)
- [ ] `as any` with explicit "trust me, I checked" justification
- [ ] `.skip` with a linked external issue (e.g. `// .skip — see #123`)
- [ ] Pattern in `.gitignore`-excluded path (vendor, node_modules)
- [ ] Pattern in `__generated__/`

Plus 19 more from real dogfood. The checklist hints:
- TODO inside docstring code blocks
- `.next/` build output
- `xit` retired-test comments
- Type-test fixtures with `as any`
- `.pyi` stub `# type: ignore`
- 14 from real repo audits (your dogfood will surface most of these)

---

## Tally as you go

| Category | Target | Authored |
|---|---:|---:|
| capture | 30 | 0 |
| non-capture | 25 | 0 |
| adversarial | 8 | 8 ✓ |
| planning | 10 | 10 ✓ |
| **total** | **73** | **18** |

Update this table after each conversion pass.

---

## Anti-patterns — don't do these

- ❌ Inventing scenarios from scratch (the whole point is real misses → corpus)
- ❌ Tweaking the corpus to hit the stage gates (per `docs/audits/07-validation-april-2026.md` and the `un-punt-implementation` skill rule)
- ❌ Including PII / secrets in fixtures (strip before committing)
- ❌ Multi-megabyte fixtures (≤20 lines per file is the target)
- ❌ Non-deterministic fixture content (random IDs, timestamps in file content)
