# Q3b — Decision 2 (agent is engine, no separate classifier) re-read against Q4a sketches

> Synthesis session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Owner: claude. Resolves the three hand-off questions Q4a left for this session.

## Question

Does any v0.2 candidate architecture (especially Sketch ii vs Sketch iv from Q4a) introduce a separate classifier? Per-bullet verdict on Decision 2's reasoning. Answer the three Q4a hand-off questions definitively.

## Decision 2 verbatim (full re-read)

> **Chose**: The user's existing agent does capture, classification, planning, fixing. We provide rules (skill) + shapes (markdown spec).
>
> **Alternatives**: A separate Sonnet-based classifier reading raw signals retrospectively (the original blueprint's central component).
>
> **Why**:
> 1. **Higher fidelity** — agent has perfect intent-context in real time vs. a retrospective string-pattern guess.
> 2. **No precision problem** — original A1 ("classifier ≥ 85% precision") had ~50% odds of failing; new A1' has ~25%.
> 3. **No additional LLM cost** — capture is part of normal work.
> 4. **No prompt to maintain** — the skill is the only artifact.
> 5. **Items include reasoning** the classifier could never recover.
> 6. **Modern eval guidance aligns** — Husain/Shankar prescribe LLM-as-judge for *evaluation* (binary, scoped); they explicitly warn against fine-tuned classifiers as the primary loop until you have hundreds of labels and a stable taxonomy.
>
> **Tradeoff**: depends on agent compliance. Mitigated by golden-set evals + safety-net file scan + bias toward over-capture.

## Per-bullet verdict against Q4a sketches

| Bullet | Sketch (i) — no filter | Sketch (ii) — structural filter | Sketch (iii) — regex classifier | Sketch (iv) — prompt hook |
|---|---|---|---|---|
| 1 — Higher fidelity (real-time intent context) | ✓ Preserved | ✓ Preserved | ✗ Violated (regex IS the retrospective string-pattern guess Decision 2 rejected) | 🟡 Partial (real-time preserved; intent-context partial — hook sees diff + skill rules but not user conversation) |
| 2 — No precision problem | ✓ Preserved | ✓ Preserved | ✗ Violated (precision now bound by regex coverage, not model judgment) | ✓ Preserved (same model judges) |
| 3 — No additional LLM cost | ✓ Preserved | ✓ Preserved | ✓ Preserved (regex is free) | ✗ **Violated** (prompt hook IS an additional LLM call, even if cheap) |
| 4 — No prompt to maintain | ✓ Preserved | ✓ Preserved | 🟡 Partial (regex pattern set is its own artifact to maintain) | ✗ **Violated** (prompt hook has its own prompt template) |
| 5 — Items include reasoning | ✓ Preserved | ✓ Preserved | 🟡 Partial (regex finds matches but doesn't preserve why) | ✓ Preserved (model can include reasoning) |
| 6 — Modern eval guidance aligns | ✓ Preserved | ✓ Preserved | 🟡 Partial (regex is the kind of fine-tuned-style fixed classifier Husain/Shankar warn against) | ✓ Preserved (LLM-as-judge spirit) |
| Tradeoff — depends on agent compliance | ✓ Same as v0.1 | ✓ Same as v0.1 | n/a | 🟢 Reduces compliance dependency (hook actively invokes capture) |

**Net counts**: Sketch (i) and (ii) preserve all 6 bullets unambiguously. Sketch (iii) violates 2 bullets cleanly + 3 partially. **Sketch (iv) violates 2 bullets (3, 4) + 1 partially (1).**

## Resolving Q4a's three hand-off questions

### Q1: Does "no separate classifier" mean "no separate model" or "no separate prompt invocation"?

**Answer: it means "no separate prompt invocation that exists primarily to classify."**

Reasoning: Decision 2's rejected alternative was "a separate Sonnet-based classifier reading raw signals retrospectively." The disqualifying properties were:

- **Separate** = a distinct invocation surface from the agent's normal turn loop
- **Classifier** = its primary function is classification, not action
- **Retrospective** = reads signals after the fact, not in-the-moment

Sketch (iv) — the prompt hook — is **separate** (event-triggered invocation, distinct from agent's turn) and **classifier** (its primary function is "is this a deferral? if so, capture"). The "retrospective" property is the only one Sketch (iv) avoids — it fires immediately at the event. So Sketch (iv) inherits 2 of the 3 disqualifying properties from the rejected alternative.

Same model is not the load-bearing factor — same model invoked as a separate classifier is still a separate classifier. Sketch (iv) is on the **wrong side** of Decision 2's letter.

### Q2: Does the "no additional LLM cost" why-bullet bind in a way that Sketch (iv) violates?

**Answer: yes, unambiguously.**

The bullet says "capture is part of normal work" — meaning capture happens within the agent's existing turn loop with no extra invocation. Sketch (iv) adds an LLM call per matching tool use. Even if cheap (small input, focused prompt), it's empirically additional cost.

For a heavy editing session (50+ Edit/Write/MultiEdit calls in a session), Sketch (iv) is 50+ extra LLM calls. Not free.

The bullet binds against Sketch (iv).

### Q3: Is the "perfect intent-context in real time" claim weakened by an event-triggered prompt hook?

**Answer: weakened on the intent-context dimension, preserved on the real-time dimension.**

The agent in its normal turn loop has full conversation history, prior tool calls, the user's stated goals. A prompt hook receives only the hook event payload (file path, tool input/output) plus whatever skill content is loaded into the hook prompt. The hook prompt does NOT have the user's conversation context — it sees the diff, knows the file path, knows the rules, but doesn't know *why* the user asked for this edit.

That partial-context degradation matters for ambiguous cases: a TODO that's "actually fine because we agreed to defer this until next sprint" is captured by the hook (which doesn't know about the agreement) but the agent in normal flow would correctly skip it.

Mitigation: pass more context to the hook prompt (recent transcript, user goals). But this increases hook prompt cost AND increases prompt maintenance burden — making bullet 4 worse.

The bullet is partially weakened against Sketch (iv).

## Final verdict on each sketch

| Sketch | Decision 2 verdict | Recommendation |
|---|---|---|
| (i) — no filter | ✓ Compliant | Acceptable but noisy |
| (ii) — structural filter | ✓ Compliant | **Recommended for v0.2** |
| (iii) — regex classifier | ✗ Violates Decision 2 | **Anti-pattern. Do not ship.** |
| (iv) — prompt hook | ✗ Violates Decision 2 (bullets 3, 4; partially 1) | **Defer to v0.3 if v0.2 dogfood shows agent compliance gaps that (ii) can't close.** |

## Net synthesis

Sketch (ii) is the unambiguous Decision-2-compliant choice for v0.2. Sketch (iv) is **not** a casual extension — it requires a Decision 2 amendment if shipped, and that amendment would need empirical justification (specifically: that Sketch (ii)'s reliance on agent compliance produces measurable failure rates the prompt hook fixes).

**For v0.2**: Sketch (ii) only. No prompt hooks.

**For v0.3+**: if v0.2 re-dogfood (Q7) measures Sketch (ii) compliance below an acceptable threshold (e.g., < 80%), then Sketch (iv) becomes a candidate — but landing it requires:
1. New decision-register entry superseding bullets 3 and 4 of Decision 2 (with the Sketch (ii) compliance data as empirical justification)
2. Cost analysis showing hook-call overhead is acceptable
3. Prompt-template maintenance plan (how the prompt stays in sync with the skill body)

## Constraints check

This session IS a constraint check on Decision 2. **Verdict**: the constraint binds for v0.2; Sketch (ii) preserves it; Sketch (iv) violates it (would need amendment).

| Other constraint | Implication |
|---|---|
| Decision 1 (markdown) | Per Q3a: preserved by Sketch (ii). Preserved by (iv) too (storage substrate unchanged). |
| Cross-platform | Both (ii) and (iv) are cross-platform-implementable per Q2 catalogs. |
| No infrastructure | Both stateless. |
| Agent is engine | (ii) ✓; (iv) ✗ (this session's verdict). |

## Change-my-mind

This conclusion would be invalidated if:

1. **Sketch (ii) compliance in v0.2 re-dogfood is < 60%.** That would force re-evaluation of the cost/benefit; Sketch (iv) might become net-positive even with the Decision 2 amendment burden.
2. **Decision 2's why-bullets are themselves judged stale** by some new evidence (e.g., hook-call cost falls to free-tier). Unlikely but worth watching.
3. **Sketch (iv)'s "partial intent-context" turns out not to matter empirically** — i.e., the diff + skill rules are enough for accurate classification. Could be tested by running Sketch (iv) in shadow mode (capturing what it would have done, comparing to Sketch (ii) outputs) on the existing dogfood corpus before shipping.

## Risks surfaced

- **Sketch (ii)'s compliance dependency is the same v0.1 risk that motivated this whole v0.2 work.** Hooks reduce the gap; they don't close it. Honest framing in launch materials.
- **The "prompt hook is just a separate classifier" framing might feel pedantic.** It isn't — the cost and prompt-maintenance bullets bind regardless of the philosophical question about same-model-vs-different-model. Decision 2 is structural, not stylistic.
- **Sketch (iv) deferral creates an option** that should NOT be lost. If v0.2 ships and probes 1, 4, 6, 7, 8 still show meaningful gaps, Sketch (iv) is the next escape hatch. Document this.

## Implications for downstream sessions

- **Q3c (Decision 13 re-read)** can now proceed with full clarity: any v0.2 hook architecture is Sketch (ii). The Decision 13 amendment frames hooks as a structural-filter mechanism, not a classification mechanism — which makes the amendment lighter.
- **Q5a (architecture candidates)** can drop Sketch (iv)-based architectures from primary consideration; flag them as v0.3+ options.
- **Q5c (architecture decision)** picks among Sketch-(ii)-based architectures (the A/B/C/D options from the Q1+Q2 cross-cutting paragraph). Sketch (ii) is universal across them.
- **Q7 (re-dogfood validation)** must measure Sketch (ii) compliance explicitly — not just "did capture happen?" but "did capture happen as a percent of capture-eligible events?" That's the empirical data that decides whether Sketch (iv) is needed for v0.3.
