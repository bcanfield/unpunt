# Q4a — Pattern detection vs interpretive judgment: where's the line?

> Synthesis session per [`docs/v2-research-plan.md`](../v2-research-plan.md). Date: 2026-05-02. Owner: claude. **Provisional read of Decision 2 — Q3b validates against full decision context.**

## Question

At what point does a hook "do classification" vs "prompt the agent to do classification"? Sketch 3 hook designs at varying levels of pre-digestion; identify which side of Decision 2's "agent is the engine — no separate classifier" line each lands on. Recommend the right line.

## Decision 2 verbatim (provisional re-read)

> **Chose**: The user's existing agent does capture, classification, planning, fixing. We provide rules (skill) + shapes (markdown spec).
>
> **Alternatives**: A separate Sonnet-based classifier reading raw signals retrospectively (the original blueprint's central component).
>
> **Why**:
> - Higher fidelity — agent has perfect intent-context in real time vs. a retrospective string-pattern guess.
> - No precision problem — original A1 ("classifier ≥ 85% precision") had ~50% odds of failing; new A1' has ~25%.
> - No additional LLM cost — capture is part of normal work.
> - No prompt to maintain — the skill is the only artifact.
> - Items include reasoning the classifier could never recover.
> - Modern eval guidance aligns — LLM-as-judge for evaluation (binary, scoped); explicit warning against fine-tuned classifiers as the primary loop.

## The line — terminology

The decision's load-bearing distinction is **classification** (judging WHAT a signal means) vs **mechanical work** (everything else). Two kinds of mechanical work matter for hooks:

1. **Structural pre-filtering** — rules about WHICH events fire. Path globs, file-type checks, gitignore checks, matcher patterns. Every hook system supports this at the matcher level; it's a routing concern, not a judgment concern.
2. **Content classification** — rules about WHAT a signal means. Is this a TODO? Is it a real deferral or a TODO inside a string literal? What type? What confidence?

**The line**: a hook that decides WHICH events fire is fine; a hook that decides WHAT the event means is on the classifier side of Decision 2.

## Three sketches

### Sketch (i) — "fire on every Edit, no filter, agent decides"

```
Hook: PostToolUse, matcher: "Edit|Write|MultiEdit"
Pre-filter: none
Hook body: read the tool_input file_path; emit additionalContext:
  "You just edited <file>. Per the un-punt skill's Capture rules section,
   inspect your diff for any deferral, hack, type loosening, skipped test,
   swallowed exception, mock, hardcoded value, or 'I'll come back to this'
   moment. Capture per the rules if any apply."
```

**What the hook does**: nothing but route the event + remind the agent of its job.

**Classification**: zero. The agent decides everything (in scope? real deferral? what type? what confidence?).

**Verdict**: ✓ **Decision 2 preserved unambiguously.** Pure agent-as-engine.

**Trade-off**: noisy. Fires on every Edit even to generated code, fixtures, gitignored files. Agent has to spend cycles deciding "ignore this — it's generated code" on every fire.

---

### Sketch (ii) — "fire on every Edit to non-generated/non-gitignored files, agent decides"

```
Hook: PostToolUse, matcher: "Edit|Write|MultiEdit"
Pre-filter: skip if path matches __generated__/ | node_modules/ | dist/ | .un-punt/ | .next/ | .venv/ | __pycache__/
Pre-filter: skip if `git check-ignore` reports the file as ignored
Hook body: emit same additionalContext as (i) — "you edited <file> (in scope), apply rules"
```

**What the hook does**: structural filtering on path + gitignore (mechanical, no content judgment); reminds agent of job.

**Classification**: zero. The pre-filter is structural (where), not interpretive (what). The same kind of filter every hook matcher already does — `matcher: "Edit|Write|MultiEdit"` is also structural pre-filtering. Just at a different layer.

**Verdict**: ✓ **Decision 2 preserved.** Path-and-gitignore filtering is the same category of mechanical work as the matcher itself. The decision's "Higher fidelity — agent has perfect intent-context in real time" actually argues *for* this sketch over (i): the agent's cycles aren't wasted re-deciding "this is generated, ignore it" on every fire — that's mechanical work the hook can do once cheaply.

**Trade-off**: requires correct path patterns. Misses: an in-scope file path that doesn't match the patterns (e.g., `src/lib/legacy/__generated__-style/file.ts` if patterns only match folder boundaries). But these are correctable in a single config-edit, not a model-iteration.

---

### Sketch (iii) — "fire on every Edit, hook greps for pattern set, agent acts on findings"

```
Hook: PostToolUse, matcher: "Edit|Write|MultiEdit"
Pre-filter: same scope as (ii)
THEN: rg the file for 'TODO|FIXME|XXX|HACK|WIP|...|@ts-ignore|# type: ignore|.skip|...'
THEN: cross-check matches against existing .un-punt/items/*.md (find by file:line)
Hook body: emit additionalContext listing SPECIFIC NEW MATCHES the agent should
  capture: "Detected new patterns at <file>:<line>: <text>. Capture per skill rules."
```

**What the hook does**: structural filtering + **content classification** (the regex check decides "this looks like a deferral" — content-level judgment).

**Classification**: yes. The hook is now deciding WHAT the file content means. The pattern set is exactly the kind of "retrospective string-pattern guess" Decision 2 explicitly rejected as the lower-fidelity alternative.

**Verdict**: ✗ **Decision 2 violated.** The pattern list becomes the canonical taxonomy of "what is a deferral" — turning examples in the skill body into the hook's universe. Misses everything not in the regex (swallowed exceptions, magic numbers, mock implementations, hardcoded values, commented-out blocks, disabled lints, language-specific placeholders, etc.). This is **the May 1 path that triggered the slop incident** — recorded here as the canonical example of "what not to do."

**Trade-off**: faster context for the agent (specific matches pre-found) at the cost of false negatives (not in regex) and false positives (regex hit on string literal, fixture, etc.). The trade-off is bad in both directions vs (ii).

---

## Sketch (iv) — bonus option Decision 2 didn't anticipate: prompt-based hook

```
Hook: PostToolUse, matcher: "Edit|Write|MultiEdit", type: "prompt"
Pre-filter: same scope as (ii)
Prompt: "You are the un-punt skill. The agent just edited <file>. Read the
  diff. Decide if any new deferral, hack, type loosening, skipped test, or
  similar signal was introduced. Per the un-punt skill rules, capture each
  by writing .un-punt/items/<id>.md. Do not announce; capture is silent."
```

**What the hook does**: pre-filter on scope (structural); then invokes the model to do the classification.

**Classification**: yes — but **the classifier IS the agent's same model**, invoked in-context at a deterministic event. This is structurally different from both:
- Decision 2's rejected alternative (a separate Sonnet-based classifier reading raw signals retrospectively): retrospective ≠ in-the-moment; separate ≠ same model
- Decision 2's chosen path (agent does capture inline): inline ≠ event-triggered

It's a **third path Decision 2 didn't consider** because Q1b's `type: "prompt"` mode wasn't documented when Decision 2 was written.

**Provisional verdict**: 🟡 **Plausibly Decision 2 compliant, but warrants Q3b judgment.** The "agent is the engine" spirit is preserved (same model, same skill body, same intent context); the "no separate classifier" letter is debatable (the prompt hook IS structurally a separate model invocation, even if it uses the same underlying model). Q3b should explicitly rule.

**Trade-off**: 2× model calls per Edit (one for the agent's tool call, one for the prompt hook's classification). Cost concern. Latency concern. But: the model in the hook is solving a tightly-scoped binary problem ("anything to capture? if so, write items") which is much smaller than the agent's full conversation context — likely cheap in absolute terms.

---

## Comparison matrix

| Aspect | Sketch (i) — no filter | Sketch (ii) — structural filter | Sketch (iii) — regex classifier | Sketch (iv) — prompt hook |
|---|---|---|---|---|
| Hook body work | Route + remind | Path + gitignore filter; route + remind | Path filter + regex match + items lookup | Path filter + invoke model |
| Classification by hook | None | None (structural) | Yes (content regex) | Yes (model judgment) |
| Decision 2 verdict | ✓ Preserved | ✓ Preserved | ✗ Violated | 🟡 Plausibly preserved (Q3b) |
| Long-tail signal coverage (swallowed exceptions, mocks, magic numbers, etc.) | ✓ Agent decides — full coverage | ✓ Agent decides — full coverage | ✗ Limited to regex set | ✓ Model decides — full coverage |
| Performance (per Edit) | Fast (no compute) | Fast (path checks + gitignore) | Fast-ish (rg + lookup) | Slow (1 extra model call) |
| Cost (per Edit) | Free | Free | Free | 1 extra model call |
| Maintenance burden | Low | Low (one path-pattern config) | High (regex list rots; new signal types require shell edits) | Low (skill body changes flow through automatically) |
| Failure mode if hook misbehaves | Agent continues normally | Agent continues normally | Misses real deferrals not in regex; falsely flags string-literal TODOs | Extra latency + cost; may misclassify but consistent with agent's own judgment |

## Recommendation

**Sketch (ii) — structural pre-filter, agent does classification — is the right line.**

Reasoning:
1. **Preserves Decision 2 unambiguously.** The pre-filter is the same category of mechanical work the matcher already does at the framework level; it's just at a finer granularity (per-file vs per-tool-name).
2. **Preserves the long-tail signal coverage** the user correctly flagged earlier. The skill body's 6-type enum + trigger table are *examples*, not the universe. The agent reads English prose; it judges. The hook just routes.
3. **Avoids the regex-rot maintenance burden** that comes with sketch (iii).
4. **Avoids the 2×-model-cost overhead** of sketch (iv) for the common case.
5. **Doesn't preclude sketch (iv) as a future enhancement** — if (ii)'s "agent must remember to look" produces compliance gaps in v0.2 dogfood, (iv) is the empirical fallback. But (ii) is the cheapest test of whether agent compliance is sufficient.

The line, restated: **WHICH events fire = mechanical (hook owns it). WHAT the event means = interpretive (agent owns it).**

## Constraints check (provisional)

| Constraint | Verdict |
|---|---|
| Decision 2 (provisional re-read here) | Sketch (ii) preserves it. Q3b will validate. |
| Decision 1 (markdown) | Per Q3a: hooks may parse `.un-punt/` markdown without violating Decision 1. Sketch (ii) does not parse. |
| Cross-platform (Q2 catalogs) | Sketch (ii)'s structural pre-filter is implementable in any platform's hook syntax (path matchers + gitignore are universal). |
| No infrastructure | Sketch (ii) is a stateless event script. No daemon. No DB. |
| Markdown all the way down | No new state added. |
| Agent is engine | Preserved by (ii). |

## Change-my-mind

This recommendation would change if:

1. **Sketch (ii)'s "agent must remember to look" produces low compliance** in v0.2 dogfood. Mitigation: Q7 validation will measure this. If compliance < 80%, fall back to sketch (iv) for v0.3.
2. **Prompt-hook cost turns out to be substantial enough** that sketch (iv) becomes economically infeasible. Q1d (perf/edge cases) will surface this; un-punt's adapter may need to gate sketch (iv) to high-confidence triggers only.
3. **Q3b decides that sketch (iv) violates Decision 2** in a way (i)/(ii) don't, AND v0.2 dogfood shows (ii) compliance is too low. That's the worst-case scenario — would force a Decision 2 amendment alongside Decision 13's amendment.

## Risks surfaced

- **Sketch (ii)'s reliance on agent compliance** is the same compliance concern that Decision 2 itself acknowledged in its tradeoff bullet ("depends on agent compliance"). The dogfood confirmed this is real but recoverable via cold-start. v0.2 hooks reduce the gap; they don't close it to zero.
- **Path-pattern misses**: an in-scope file at an unusual path may slip through (ii)'s filter. Mitigation: log skipped files at debug level so we can audit; iterate the path patterns in v0.2.x patches.
- **Sketch (iii) is tempting because it produces specific findings** the agent can act on without thinking. Resist. The user correctly flagged this on May 1; record it here as the load-bearing anti-pattern.
- **Sketch (iv) is the right escape hatch for v0.3+**, not v0.2. Don't ship it preemptively.

## Hand-off note to Q3b

Q3b will re-read Decision 2 in full and judge whether sketch (iv) — the prompt-based hook — is a Decision 2 violation, a Decision 2 extension, or neither. The provisional verdict here is "🟡 plausibly preserved" with the reasoning that the model invoked is the same model. Q3b should specifically address:

1. Does Decision 2's "no separate classifier" mean "no separate model" or "no separate prompt invocation"?
2. Does the "no additional LLM cost" why-bullet bind in a way that sketch (iv) violates (it does add LLM cost, even if marginal)?
3. Is the "Higher fidelity — agent has perfect intent-context in real time" claim weakened or strengthened by an event-triggered prompt hook (real-time is preserved; intent-context is partial — the prompt hook only sees the diff and skill rules, not the user conversation)?

These are the three load-bearing questions for Q3b. Q4b (long-tail signal coverage) does NOT depend on Q3b's resolution — it can run in parallel with or before Q3b.
