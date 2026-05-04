# Q5b — v0.2 architecture comparison matrix

> Synthesis session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Owner: claude.
>
> **User-gate hygiene rule (methodology refinement #3) explicitly applied here**: this session compares the Q5a candidates and identifies which are Pareto-optimal (frontier) vs dominated. **It does NOT pick a winner.** Q5c is the user-confirmation gate where the choice happens. The frontier identification narrows the choice space; the user picks.

## Question

For each Q5a candidate (A–E), evaluate against the load-bearing dimensions: solves each failed probe? cross-platform v0.2 coverage? cost? regression risk on what works today? Identify which candidates are on the frontier (Pareto-optimal) vs dominated.

## Candidates (carried from Q5a)

- **A** — Minimum-viable: Claude Code only, 3 hooks, AGENTS.md primer
- **B** — SKILL.md adopters: Claude Code + Cursor + Codex, 3 hooks per platform, AGENTS.md primer
- **C** — Full tiered: all 6 platforms (Tier 1 hooks / Tier 2 partial / Tier 3 primer-only)
- **D** — Defense-in-depth: A or B base + `when_to_use`/`paths` frontmatter mitigations
- **E** — Primer-only: AGENTS.md primer + SKILL widening, no hooks

## Comparison matrix

Cells use: ✓ (addresses), ⚠ (partial / conditional), ✗ (does not address), with brief justification.

| Dimension | A — Min-viable | B — SKILL.md trio | C — Full tiered | D — A or B + frontmatter | E — Primer only |
|---|---|---|---|---|---|
| **Solves Probe 1** (description-match auto-load failed on existing session) | ✓ SessionStart hook fires unconditionally | ✓ same per platform | ✓ same Tier 1; ✓ Tier 2 SessionStart; ⚠ Tier 3 primer-only (compliance-dependent) | ✓ (base) + maybe slight `when_to_use` boost | ⚠ AGENTS.md is read on session start by all platforms but is "context to be applied" not "rules enforced" — same compliance dependency as v0.1's failed Decision 13 bullet 2 |
| **Solves Probe 4** (silent capture failed during work post-bootstrap) | ✓ PostToolUse hook fires after every Edit/Write/MultiEdit | ✓ same per platform | ✓ Tier 1; ✗ Tier 2 (Copilot CLI PostToolUse can't modify result, only deny); ✗ Tier 3 (no hooks) | ✓ (base); frontmatter doesn't help | ✗ no mechanism to nudge agent at tool calls |
| **Solves Probes 6 + 8** (wrap-up suggestion silent on trigger phrases) | ✓ UserPromptSubmit hook fires before agent reads | ✓ same per platform | ✓ Tier 1; ✗ Tier 2 (Copilot CLI userPromptSubmitted is read-only); ✗ Tier 3 | ✓ (base) | ✗ no mechanism to detect wrap-up phrases |
| **Solves Probe 7** (description-match failed on fresh session) | ✓ SessionStart unconditional | ✓ same per platform | ✓ Tier 1+2; ⚠ Tier 3 | ✓ (base) | ⚠ same caveat as Probe 1 — read into context vs enforced |
| **Cross-platform v0.2 coverage** | 1 of 6 (CC hooks) + 5 of 6 primer-only | 3 of 6 (CC+Cursor+Codex hooks) + 3 of 6 primer-only | 6 of 6 (5 hooks Tier 1 + 1 partial + 1 primer-only) | same as base | 6 of 6 (primer-only universal) |
| **Cost — LOC** (rough) | ~150–300 (3 hooks + ~30 LOC CLI + SKILL widening + AGENTS.md template + 4 docs) | ~300–500 (A's + 2 more adapters; shared hook logic where possible) | ~500–800 (5 platform adapters + Tier 2 partial + Aider config + tier docs) | base + ~10 LOC frontmatter | ~50–100 (no hooks; SKILL widening + AGENTS.md template + docs) |
| **Cost — adapter count + maintenance** | 1 adapter ongoing | 3 adapters ongoing | 5–6 adapters ongoing (incl. Tier 3 docs) | same as base | 0 adapters; just primer template |
| **Regression risk — cold-start (Probe 3)** | Low. Risk: SessionStart hook may fire when `/un-punt` cold-start ALSO runs; need to validate they don't double-load skill content. | Same as A per platform; risk multiplied across 3 adapters. | Same as A per platform; risk multiplied across 5 adapters. | Same as base; frontmatter `paths` could narrow auto-invocation in unintended ways → mitigate by validating `paths` against punt-board's actual file layout. | Lowest (no new infrastructure). |
| **Frontmatter-mitigation surface** | None | None | None | Explicit `when_to_use` + `paths` (D's distinguishing feature) | Optional add-on |
| **Validation surface in v0.2 dogfood** | Single env (Claude Code in punt-board) | 3 envs (CC + Cursor + Codex spot-check) | 5+ envs (CC + Cursor + Codex + Gemini CLI + Copilot VS + manual Copilot CLI + Aider tier docs) | same as base | Single env primer-only test |
| **Deferred to v0.3** | Cursor + Codex + Copilot/Gemini/Aider adapters, frontmatter, Sketch (iv) | Copilot/Gemini/Aider adapters, frontmatter, Sketch (iv) | Frontmatter, Sketch (iv) | Sketch (iv); base's deferred list | All hooks (every adapter) |
| **Honesty in launch story** | "Works on Claude Code; other platforms via primer fallback; full adapters in 0.2.x" | "Works on the SKILL.md trio; Copilot/Gemini/Aider via primer; full adapters in 0.2.x" | "Works on every major platform with platform-specific tier docs" | adds "and we tried frontmatter belt-and-suspenders" | "AGENTS.md primer everywhere; hooks coming in v0.3" |

## Frontier identification (Pareto analysis)

A candidate is on the frontier if no other candidate beats it on every dimension that matters.

### Pareto-optimal (frontier) candidates

- **A — Minimum-viable**. Lowest hook-based cost. Solves all 4 failed probes on the primary dogfood platform. Dominated on cross-platform coverage by B/C/E, but cheaper than B/C and addresses Probes 4/6/8 that E doesn't. **Frontier.**
- **B — SKILL.md trio**. Mid cost. Solves all 4 failed probes on 3 of 6 platforms. Adds cross-platform IP validation in v0.2 (de-risks "we shipped Claude-Code-only and now Cursor/Codex don't work in v0.3"). Dominated by C on cross-platform coverage but cheaper. **Frontier.**
- **C — Full tiered**. Highest hook-based cost. Solves all 4 failed probes on Tier 1 platforms; partial on Tier 2; primer-only on Tier 3. Maximum cross-platform coverage at v0.2 launch. **Frontier.**
- **E — Primer-only**. Lowest cost overall. Maximum cross-platform coverage. **Does NOT solve Probes 4, 6, 8.** Frontier on (cost × cross-platform) axis; **dominated on probe-coverage axis**. Whether it's "on the frontier" depends on which axis the user weights. **Frontier conditionally** — if user prioritizes "ship a baseline; let dogfood drive v0.3 hook layer" over "fix the failures now."

### Dominated (not frontier) candidates

- **D — Defense-in-depth**. D = (base A or B) + frontmatter mitigations. Adds ~10 LOC for `when_to_use` + `paths`. Per Decision 13's April 2026 amendment, these fields *might* improve description-match auto-loading — but the dogfood evidence (Probes 1, 2, 7) suggests description-match doesn't fire on coding topics regardless of description content. **Frontmatter mitigations are likely cosmetic in the presence of hooks.** D is dominated by its base (same probe coverage, same cross-platform, marginally higher cost, added maintenance surface). **D is dominated.** *Caveat*: if user wants a v0.3-readiness hedge (frontmatter mitigations are needed if hooks ever break), D might be valued differently.

## Trade-off framing for the user gate (Q5c)

The frontier candidates differ on a single axis: **how much do we want to ship at v0.2 vs defer to v0.3 / v0.2.x?**

| Stance | Best-fit candidate |
|---|---|
| "Ship the smallest hook layer that fixes all 4 v0.1 probes; add adapters in patches" | A |
| "Ship cross-platform IP validation in v0.2 for the SKILL.md adopters; add Copilot/Gemini/Aider in 0.2.x" | B |
| "Ship comprehensive coverage at v0.2 launch; tier docs handle Copilot CLI + Aider" | C |
| "Ship the floor (primer) at v0.2; hooks driven by dogfood evidence in v0.3" | E |

Each stance is defensible. The frontier doesn't tell you which is "right" — it tells you the four serious choices the project is choosing among. Q5c is where the user picks.

## Effort estimates (refined from Q5a's "rough")

These are first-cut LOC estimates. Q6 implementation sessions will refine.

| Candidate | Hook scripts | CLI/install | Per-platform adapter | Other | **Total LOC ballpark** |
|---|---|---|---|---|---|
| A | 3 × ~80 = 240 | ~30 (CLI ext) | 0 (CC only) | SKILL widening ~50; AGENTS.md template ~50; docs ~80 | **~450** |
| B | 3 × ~80 = 240 (shared) | ~30 (CC CLI) + ~30 (Cursor install logic) + ~30 (Codex install logic) = ~90 | 3 × ~50 (manifests) = 150 | SKILL widening ~50; AGENTS.md template ~50; docs ~80 | **~660** |
| C | 3 × ~80 = 240 (shared, with platform glue) | ~30 + 3 × ~30 = ~120 (5 platforms but Gemini/Copilot share patterns) | 5 × ~50 = 250 | Tier 2 partial config ~30; Tier 3 Aider config ~20; SKILL widening ~50; AGENTS.md template ~50; docs ~120 | **~880** |
| D (base A) | A's 240 | A's 30 | A's 0 | A's 180 + frontmatter ~10 | **~460** (A + 10) |
| D (base B) | B's 240 | B's 90 | B's 150 | B's 180 + frontmatter ~10 | **~670** (B + 10) |
| E | 0 | 0 (no install changes; primer is a copy-paste template) | 0 | SKILL widening ~50; AGENTS.md template ~80 (richer); docs ~80 | **~210** |

Caveat: hook scripts at ~80 LOC each is generous; actual implementation may be 40–60 each (reusable shared functions). Per-platform adapter manifest LOC depends on platform conventions.

## Implications for downstream sessions

- **Q5c** (architecture decision + change set, **USER GATE**): user picks among A, B, C, E (D dominated). The decision-register entry text is in Q3c; only the candidate selection determines the change set's scope. After user picks, this session writes the per-file change list and surfaces any out-of-scope discussion items.
- **Q6** (implementation): chunks scale with selection. A → ~6 chunks; B → ~9 chunks; C → ~14 chunks; E → ~3 chunks.
- **Q7** (re-dogfood validation): probe sequence identical across selections; spot-check surface scales with selection.
- **Q8** (minor findings disposition): same regardless.
- **Q9** (build plan + risks + skill brief): same docs to update; only adapter mention list varies.

## Constraints check (per-candidate)

| Constraint | A | B | C | D | E |
|---|---|---|---|---|---|
| Decision 1 (markdown) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Decision 2 (agent is engine) — Sketch (ii) | ✓ | ✓ | ✓ (Tier 1 only; Tier 2 + 3 don't have a classification surface to violate) | ✓ | ✓ |
| Decision 4 (skill is IP) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Decision #21 (hooks for activation + structural pre-filter) | ✓ ships #21 | ✓ | ✓ | ✓ | ⚠ E doesn't ship #21; defers it |
| Decision 14 (refusal layer) untouched | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cross-platform thesis | weakest | strong | strongest at v0.2 | same as base | strongest |
| No infrastructure | ✓ (stateless event scripts) | ✓ | ✓ | ✓ | ✓ |

## Change-my-mind

This frontier identification would change if:

1. **Frontmatter mitigations measurably improve description-match in real testing.** D would move from dominated to frontier. Mitigation: low-cost test in v0.2 dogfood after hooks land — flip frontmatter on/off and measure auto-invocation rate.
2. **One of the platforms in C's Tier 1 turns out to have hook semantics that break un-punt's pattern.** C's coverage claim weakens; might collapse to B + lone Tier 2 platform. Mitigation: per-platform smoke test in Q6 implementation.
3. **The user values an additional dimension** I haven't included (e.g., npm-publishable single CLI, single-marketplace plugin distribution, etc.). The matrix can be extended; new dimensions might shift dominance.
4. **A 6th candidate** the user surfaces. Q5a's enumeration is the input here.

## Risks surfaced

- **Effort estimates are coarse.** Q6 implementation will produce more accurate numbers; if the gap exceeds 50%, revisit the matrix.
- **Adapter validation surface for C is large.** 5+ environments to spot-check during Q7 — logistical burden may be material.
- **Tier 2 (Copilot CLI) gives a degraded experience** that needs honest framing. C's launch story should not over-promise what Copilot CLI users get.
- **D's frontmatter mitigations are unverified.** Including them in v0.2 commits to maintaining a feature that may not measurably help.
- **E's primer-only stance is a real strategic option** even though it doesn't fix the post-load probes. If user prefers "smallest v0.2 + dogfood-driven v0.3," E is the right call. The matrix should not pre-judge this.
