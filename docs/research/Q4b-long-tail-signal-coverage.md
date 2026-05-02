# Q4b — Long-tail signal coverage check

> Synthesis session per [`docs/v2-research-plan.md`](../v2-research-plan.md). Date: 2026-05-02. Owner: claude.

## Question

Is the skill body's 6-type enum a closed taxonomy or a starter set? Are the trigger examples exhaustive or illustrative? What about the long-tail signals the user flagged on May 1 — swallowed exceptions beyond `catch {}`, mocks, hardcoded values, commented-out code, disabled lints, language-specific placeholders? Should the enum widen, the trigger examples widen, or both, or neither?

## Sources consulted

| Source | Provided |
|---|---|
| `core/skill/SKILL.body.md` lines 21–50 (capture rules section) | The current trigger table + explicit closure rule |
| `core/skill/SKILL.body.md` line 456 (anti-instructions) | "❌ Invent item types outside the 6-type enum. Use `other` and flag for skill update." |
| `Q4a-classification-line.md` | Sketch (ii) recommendation — agent does the judgment, not the hook |

## What the SKILL body actually says

### The 6-type enum (closed)

From the trigger table and item-type system:

1. `deferred-implementation` — TODO with clear single intent, not-implemented stubs, deprecated APIs
2. `type-loosened` — `as any`, `@ts-ignore`, `# type: ignore`, `: any`
3. `skipped-test` — `.skip`, `xit`, `it.todo`, `@pytest.mark.skip`, `t.Skip()`
4. `hack-workaround` — HACK/KLUDGE comments, empty `catch {}`/`except: pass`
5. `duplicated-code` — observed duplicated logic not DRY'd
6. `other` — fallback type (per anti-instruction line 456: "Use `other` and flag for skill update")

The anti-instructions section explicitly forbids inventing types outside this enum: **the enum IS closed.**

### The trigger examples (illustrative)

Reading the table at lines 25–37, the language is **example-flavored**: "You wrote TODO/FIXME/...", "You used `as any`...", etc. The triggers are presented as recognizable patterns, not as an exhaustive checklist. The closing line at 39 — *"The triggers above are English. Mixed-language repos still capture English deferrals correctly; non-English equivalents are captured only when your language understanding maps them to the same intent."* — implies the table is a starter set the agent extends via judgment (mapping new patterns to the same intent).

The "Bias: when in doubt, capture" rule at line 23 also implies the trigger list is illustrative — the agent should capture *anything* that looks like a deferral signal, not just the listed patterns.

## The long-tail signals (audit)

Categorized by whether the current trigger table covers them, would benefit from added examples, or are signals the agent must extrapolate to via the "bias capture" rule.

### Already covered by the existing table

| Signal | How covered |
|---|---|
| TODO/FIXME/XXX/HACK/WIP/KLUDGE/LATER | Explicit row 1 → `deferred-implementation` or `hack-workaround` |
| `as any` / `@ts-ignore` / `# type: ignore` / `: any` | Explicit row 2 → `type-loosened` |
| `.skip` / `xit` / `it.todo` / `@pytest.mark.skip` / `t.Skip()` | Explicit row 3 → `skipped-test` |
| Empty `catch {}` / `except: pass` | Explicit row 4 → `hack-workaround` |
| `throw new Error("not implemented")` / `unimplemented!()` / `panic!("TODO")` / `raise NotImplementedError` | Explicit row 5 → `deferred-implementation` |
| Chat deferrals ("I'll handle X later", "skipping for now", "park it") | Explicit rows 6 + 7 |
| Duplicated logic | Explicit row 8 → `duplicated-code` |
| Deprecated API used instead of migration | Explicit row 9 → `deferred-implementation` |

### Missing from the table — would benefit from added examples

| Signal | Suggested type | Why add to table |
|---|---|---|
| Non-empty but trivial catch (`catch (e) { console.log(e); }`, `except: print(e)`) | `hack-workaround` | Currently only "empty" catch is listed; trivial catch is morally equivalent and very common |
| `try {} catch (_) {}`, `_ = err` (Go), `ignore(err)` | `hack-workaround` | Same idea, different syntax |
| Promise rejection ignored (`.catch(() => {})`, `.then(...).catch(() => {})`) | `hack-workaround` | Common in JS/TS; not in current table |
| Rust `todo!()` | `deferred-implementation` | Rust placeholder; only `unimplemented!()` listed |
| Go `panic("not implemented")` and bare `panic("TODO")` | `deferred-implementation` | Only `panic!("TODO")` (Rust) listed; Go variant common |
| Disabled lints (`eslint-disable-next-line`, `// noqa`, `# pylint: disable`, `# type: ignore[unused]`) | `hack-workaround` (or `type-loosened` for type-related disables) | Very common AI-generated pattern; not in table |
| Commented-out code blocks (multi-line) | `hack-workaround` (with `other` fallback for ambiguity) | "I'll come back to this" pattern |
| `console.log` / `print` / `dbg!()` left as debug output | `hack-workaround` | Common left-in artifact |
| Hardcoded values that should be config (URLs, paths, magic numbers, ports) | `hack-workaround` (or `other`) | Common AI-generated shortcut; harder to detect (judgment-heavy) |
| Mock implementations / stub functions (`return null`, `return {}`, returning hardcoded test data in prod path) | `deferred-implementation` | Common shortcut; subjective (must distinguish intentional stubs from real placeholders) |
| Bypassed validations (`if (true) { /* always pass */ }`, `// validation: TODO`) | `deferred-implementation` | Pattern recognized in security-adjacent code |
| Race condition workarounds (`setTimeout(fn, 100) // hack to wait for X`) | `hack-workaround` | Time-based hacks signal real but undebugged race |
| `pass` as Python placeholder body | `deferred-implementation` | Bare `pass` in a function body usually = deferred implementation |
| SQL `SELECT *` where specific columns are warranted | `hack-workaround` (or `other`) | Subjective; agent judgment territory |

### Signals the agent should extrapolate to via "bias capture" rule (no table change)

Anything else not listed but recognizable as a deferral, hack, loose type, or "I'll come back to this" moment. The skill body's "Bias: when in doubt, capture" rule (line 23) is the load-bearing instruction here.

## Verdict — should the enum widen, examples widen, or both?

**Enum stays closed.** All 6 types are well-scoped; the long-tail signals all map to existing types (`hack-workaround`, `deferred-implementation`, `type-loosened`, `other`). Adding new types would dilute the categorization without improving capture quality.

**Trigger examples should widen.** The current table has 9 rows of examples; the audit above suggests adding ~10 more rows (or expanding existing rows) would meaningfully nudge agent recall toward signals it might otherwise miss. This is a low-risk, high-value SKILL body edit.

**Reinforce the "examples are not exhaustive" framing.** Add an explicit line to the capture-rules section: *"The trigger table is examples, not the universe. Apply the rules to anything that looks like a deferral, hack, loose type, swallowed exception, mock implementation, or hardcoded value that should be config — even if the specific pattern isn't listed below."* This is the line that prevents future contributors (or readers) from treating the table as a closed taxonomy.

**Update the contract template** to add `hack-workaround` and `other` thresholds (per the dogfood Probe 5 minor finding). This is a Q8 disposition decision but worth flagging here for traceability.

## Concrete recommendation for v0.2

1. **Add ~10 rows to the trigger table** in `core/skill/SKILL.body.md` covering the "missing from the table" audit above. Same column shape as existing rows.
2. **Add the "examples are not exhaustive" framing** as a new sentence directly above the trigger table.
3. **Don't widen the 6-type enum.** Update the anti-instructions line (456) to reinforce closure: *"❌ Invent item types outside the 6-type enum. The enum is closed; anything not fitting goes to `other` with the body explaining why. The trigger examples expand over time; the type enum does not."*
4. **In the SessionStart hook reminder** (whichever architecture Q5c picks), include a reminder about the "examples are not exhaustive" framing — so the agent doesn't anchor too tightly on the table during normal work.
5. **Defer the contract.md threshold fix** for `hack-workaround` and `other` to Q8 (minor finding disposition).

## How this interacts with Q4a's Sketch (ii) recommendation

Sketch (ii) means the agent does the judgment based on the skill body's prose. **The widened trigger table is the v0.2 mechanism for nudging recall on long-tail signals.** Without it, the agent's recall is bounded by what it remembers from the skill body — and the user's May 1 concern (that the regex-codified list misses long-tail) translates to: "if the SKILL body's examples are too narrow, agent recall is too narrow."

Widening the examples is the cheapest, most direct lever. It costs zero LLM calls per turn (vs Sketch (iv)) and zero classification logic (vs Sketch (iii)). It's the SKILL body iteration the dogfood already validated as the right path (cold-start recall was 18/18 with the existing table; the issue isn't recall on listed patterns, it's potential under-recall on unlisted patterns the user flagged).

## Constraints check

| Constraint | Verdict |
|---|---|
| Decision 1 (markdown) | Preserved — SKILL.body.md is markdown. |
| Decision 2 (agent is engine) | Preserved — widening examples doesn't move classification work; the agent still judges. Per Q3b, this is the right architectural side. |
| Cross-platform | Preserved — SKILL body is shared across Claude Code, Cursor, Codex. Widened examples flow through the build to all adapters. |
| Markdown all the way down | Preserved. |

## Change-my-mind

This conclusion would change if:

1. **The widened trigger table makes the SKILL body exceed Claude Code's 1,536-char description budget** (decision 13 lines 229–230). The trigger table is in the body, not the description, so unaffected — but verify in implementation.
2. **v0.2 re-dogfood shows agent recall is bound by listed patterns** even with the widened table + "examples are not exhaustive" framing — i.e., the model anchors too hard regardless of explicit instruction. Mitigation: Q7 measurement; if recall lift is <10% from widening, consider Sketch (iv) for the long-tail-coverage problem specifically.
3. **The 6-type enum turns out to be too narrow in practice** — i.e., real deferrals don't fit any of the 6 cleanly even with `other` as fallback. Watch for `other` percentage in v0.2 corpus; if >20%, the enum needs widening as a v0.3 conversation.

## Risks surfaced

- **Trigger-table widening can backfire** if the new examples are too specific (over-fits to particular patterns) or too vague (causes false-positive captures). The audit above listed 10+ candidates; the actual SKILL body edit should be ~5 well-chosen ones, not all 10. Q6 implementation session should curate.
- **The "examples are not exhaustive" framing is a paragraph** — easily deleted in future edits if a contributor doesn't understand its load-bearing role. Mark it explicitly with a comment in the SKILL body source: *"<!-- LOAD-BEARING: do not delete; see Q4b research outcome -->"*
- **`other` capture frequency is itself a signal.** If post-v0.2 dogfood shows `other` is >15% of captures, the enum is missing a real type. Track this as a v0.3 input.
