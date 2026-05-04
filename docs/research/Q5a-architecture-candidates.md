# Q5a — v0.2 architecture candidates (enumeration only)

> Synthesis session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. Owner: claude.
>
> **User-gate hygiene rule (methodology refinement #3) explicitly applied here**: this session enumerates options without collapsing to a verdict. Q5b will compare; **Q5c is the user-confirmation gate where the choice gets made.** This file should not be read as "the architecture is X." It should be read as "the architecture is one of {A, B, C, D, E}; here's what each actually entails."

## Question

Given Q1–Q4 outcomes, what v0.2 architectures are on the table? List all serious candidates with one-paragraph descriptions covering: hook coverage, adapter coverage, SKILL body changes, additional defenses, what's deferred to v0.3.

## Locked-in across all candidates (the floor)

These are decisions that are constraints, not options. Every candidate ships these:

| Locked-in element | Source |
|---|---|
| **SKILL body widening** — ~5 long-tail trigger rows + "examples are not exhaustive" framing line | Q4b verdict |
| **6-type enum stays closed** | Q4b verdict + SKILL.body.md anti-instruction line 456 |
| **Sketch (ii) hook design** — structural pre-filter only, no content classification | Q4a + Q3b verdicts |
| **Decision #21 supersession text** in `docs/08-design-decisions.md` | Q3c deliverable (full draft) |
| **Phase 1 build plan update** — "No hooks at MVP" → "SessionStart + PostToolUse + UserPromptSubmit hooks at MVP per #21" | Q9 work depending on Q5c approval |
| **Risks doc B8 annotation** — MATERIALIZED + mitigation (hooks per #21) | Q9 |
| **Skill brief update** — clarify hooks are activation/nudging layer, skill remains IP | Q9 |
| **Contract template fix** — add `hack-workaround` + `other` thresholds | Q8 minor finding |
| **AGENTS.md primer** as universal floor (cross-platform graceful degradation) | Q2c verdict |
| **Cold-start path unchanged** — worked perfectly in v0.1 dogfood (100% recall, 0 FP) | dogfood-log Probe 3 |
| **`updatedToolOutput` not used** — confirmed undocumented per re-validation 2026-05-02 | research plan tracker |
| **`type: "prompt"` hooks deferred to v0.3** — Sketch (iv) violates Decision 2 per Q3b | Q3b verdict |

The candidates below differ on **adapter coverage**, **hook scope**, and **belt-and-suspenders defenses**.

---

## Candidate A — Minimum-viable v0.2 (Claude Code only)

**Adapter coverage**: Claude Code only.

**Hooks**: 3 hooks (SessionStart + PostToolUse on `Edit|Write|MultiEdit` + UserPromptSubmit). Sketch (ii) design.

**Additional defenses**: AGENTS.md primer in punt-board for cross-platform redundancy (and Aider compatibility), but no Cursor/Codex hook adapters.

**Distribution**: extend existing skill-direct CLI to merge `hooks` block into `~/.claude/settings.json`. ~30 LOC change to `packages/cli/src/install.ts` + matching `uninstall.ts` + new `added_hooks` manifest field.

**Deferred to v0.2.x or v0.3**: Cursor adapter, Codex adapter, Copilot/Gemini/Aider adapters, `when_to_use` and `paths` frontmatter mitigations, Sketch (iv) prompt hooks.

**Effort estimate**: smallest of all candidates. ~3 hook scripts + CLI extension + SKILL widening + 4 docs updates + AGENTS.md primer.

**Validation**: re-dogfood in punt-board (Claude Code) addresses Probes 1, 4, 6, 7, 8 directly. Cross-platform validation (Cursor, Codex) deferred — claimed but not yet proven for v0.2.

---

## Candidate B — SKILL.md adopters v0.2 (Claude Code + Cursor + Codex)

**Adapter coverage**: the three platforms that adopted the SKILL.md open standard (per Q2a Codex 0.124.0, Q2b Cursor 2.4). The skill body ports unchanged to all three.

**Hooks**: same 3 hooks per platform; same Sketch (ii) design. Each adapter has its own hook registration file (`~/.claude/settings.json` block for Claude Code; `.cursor/hooks.json` for Cursor; `hooks/hooks.json` in `.codex-plugin/` for Codex).

**Additional defenses**: AGENTS.md primer for Aider/Copilot-CLI fallback.

**Distribution**: three platform-specific install paths. Extends current CLI for Claude Code; Cursor and Codex use their native plugin/skill installation mechanisms.

**Deferred to v0.3**: Copilot/Gemini/Aider full adapters, `when_to_use`/`paths` mitigations, Sketch (iv).

**Effort estimate**: medium. 3 hook scripts × 3 platforms (with shared logic where possible — Q2 evidence says JSON-stdin/stdout contracts are compatible) + 3 install paths + SKILL widening + AGENTS.md primer + 4 docs updates.

**Validation**: re-dogfood in punt-board (Claude Code) primary; spot-check in a Cursor and Codex environment for adapter parity. Larger validation surface.

---

## Candidate C — Full tiered v0.2 (Tier 1 + Tier 2 + Tier 3 per Q2c)

**Adapter coverage**: all 6 surveyed platforms.
- **Tier 1** (full hooks): Claude Code, Cursor, Codex, Gemini CLI, Copilot VS Code
- **Tier 2** (partial hooks): Copilot CLI — SessionStart + PreToolUse only (deny-only); skip capture nudge because `userPromptSubmitted` is read-only on CLI
- **Tier 3** (primer-only): Aider via `read: AGENTS.md` in `.aider.conf.yml`

**Hooks**: 3 hooks per Tier 1 platform; 1 hook (SessionStart) for Tier 2 + Sketch (ii) refusal-only PreToolUse; 0 hooks for Tier 3.

**Additional defenses**: AGENTS.md primer is the universal floor (always present).

**Distribution**: per-platform install paths or instructions; complexity scales with adapter count.

**Deferred to v0.3**: `when_to_use`/`paths` mitigations, Sketch (iv).

**Effort estimate**: largest. 5 Tier 1 platform adapters + 1 Tier 2 partial + Aider config snippet + SKILL widening + AGENTS.md primer + 4 docs updates + per-platform tier documentation in launch materials.

**Validation**: re-dogfood in punt-board (Claude Code) primary; spot-checks in Cursor + Codex + Gemini CLI + Copilot VS Code; manual verification on Copilot CLI + Aider tier docs. Substantially larger validation surface.

---

## Candidate D — Defense-in-depth v0.2 (A or B + frontmatter mitigations layered on)

**Adapter coverage**: pick A or B as the base, then add the Decision 13 April 2026 amendment fields:
- `when_to_use` field added to skill frontmatter
- `paths` glob added (e.g., `src/**/*.ts`, `src/**/*.py`, `backend/**/*.py`, `frontend/**/*.{ts,tsx}`)

**Hooks**: same as A or B (the base).

**Additional defenses**: belt-and-suspenders. Frontmatter mitigations might marginally improve description-match auto-loading (Probe 1/2/7 surface) even if they didn't help in v0.1. SessionStart hook is the real fix; frontmatter is a free experiment.

**Effort estimate**: A's or B's effort + ~30 minutes for frontmatter additions.

**Validation**: same as base. Re-dogfood would test whether `when_to_use` + `paths` improves description-match when paired with hooks (probably noise; hooks dominate the signal).

**Risk**: adds a maintenance surface (frontmatter content has its own drift potential) for a marginal benefit.

---

## Candidate E — AGENTS.md primer only v0.2 (no hooks, all platforms)

**Adapter coverage**: all 6 platforms (AGENTS.md is the universal floor).

**Hooks**: none.

**Additional defenses**: SKILL body widening (per Q4b) is still applied; `when_to_use`/`paths` fields could be added (no hook coverage to compete with).

**Distribution**: no CLI extension needed; un-punt becomes a skill body + AGENTS.md primer template that users drop into their repo.

**Deferred**: everything hook-related. v0.2 ships the floor; v0.3 adds hooks if dogfood shows the floor isn't enough.

**Effort estimate**: smallest. SKILL widening + AGENTS.md primer template + 4 docs updates. No CLI changes, no hook scripts.

**Validation**: re-dogfood in punt-board addresses Probes 1, 2, 7 (auto-load) only. **Probes 4, 6, 8 (post-load enforcement gaps) NOT addressed by E** — these are the load-bearing failures that hooks are meant to fix.

**Why this candidate exists in the enumeration**: completeness. It's the explicit baseline against which hook-based candidates are measured. May be selected if user prefers a more conservative v0.2 ship + dogfood-driven v0.3 hook layer.

---

## Frontier vs dominated candidates (preliminary observation, not a verdict)

For Q5b's matrix to evaluate fairly:

- Candidate **E** is the explicit baseline. Whether it's "dominated" depends on user preference for incremental shipping vs comprehensive v0.2.
- Candidate **A** addresses all v0.1 failure probes (1, 4, 6, 7, 8) on the primary dogfood platform. Smallest hook-based candidate.
- Candidate **B** trades effort (~2× A) for cross-platform IP validation in v0.2 — reduces risk that "we shipped Claude-Code-only and now Cursor/Codex don't work."
- Candidate **C** trades effort (~3× A) for full coverage at v0.2 launch. Bigger validation surface; potentially over-investment if v0.2 is a learning release.
- Candidate **D** layers belt-and-suspenders onto A or B at small additional cost; may or may not improve real outcomes.

**Q5b will compare these on solves-probes / cross-platform-coverage / cost / risk / regression-risk dimensions.** Q5c is where the choice happens.

---

## Implications for downstream sessions

- **Q5b** (comparison matrix): one row per candidate (A through E). Columns: solves Probe 1? solves Probe 4? solves Probe 6/8? solves Probe 7? cross-platform-V0.2 coverage? cost (LOC + adapter count)? regression risk on cold-start? frontmatter-mitigation surface? deferred-to-v0.3 list.
- **Q5c** (architecture decision + change set, USER GATE): user picks among the candidates Q5b shows on the frontier. The decision-register entry text (Decision #21) is already drafted in Q3c — only the candidate selection determines which adapter rows appear.
- **Q6** (implementation): chunks depend on Q5c selection. A → smallest chunk list (~6 chunks). C → largest (~15 chunks).
- **Q7** (re-dogfood validation): probe sequence is the same regardless of candidate; only adapter spot-checks differ.
- **Q8** (minor findings disposition): contract template fix is pre-decided as a fix-in-v0.2 across all candidates. Other minor findings (top-3-areas double-count, line-drift, etc.) get per-finding judgment in Q8a.
- **Q9** (build plan + risks + skill brief updates): same set of doc edits regardless of candidate; only adapter mention list varies.

## Constraints check

| Constraint | Compliance across candidates |
|---|---|
| Decision 1 (markdown) | ✓ all candidates preserve |
| Decision 2 (agent is engine) | ✓ all candidates use Sketch (ii) per Q4a/Q3b lock |
| Decision 4 (skill is the IP) | ✓ all candidates; skill body unchanged in role |
| Decision #21 (new — hooks for activation + structural pre-filter) | ✓ A, B, C, D include hooks; E doesn't (so E either preempts #21 or accepts that #21 doesn't ship until v0.3) |
| Cross-platform thesis | A: weakest (Claude Code only). B: strong (3 SKILL.md platforms). C: strongest (all 6). D: same as base. E: strong (AGENTS.md universal). |
| No infrastructure | ✓ all candidates; hooks are stateless event scripts |
| Markdown all the way down | ✓ all candidates |

## Change-my-mind

This enumeration would be invalidated if:

1. **A serious 6th candidate exists that none of A–E captures.** Possible but I don't see it. User feedback can surface this.
2. **One of the locked-in elements turns out not to be locked.** E.g., if Q5c discussion reveals the contract-template fix is actually controversial, or AGENTS.md as universal floor is not desired. Each locked element is cited to the session that established it; reopening requires going back to that session.
3. **A candidate I framed as dominated is actually frontier** for a reason I missed (e.g., user values "small v0.2 + dogfood-driven v0.3" more than "comprehensive v0.2"). E is intentionally enumerated because of this possibility.

## Risks surfaced

- **Effort estimates are rough.** Q5b should refine (e.g., hook script LOC, per-adapter install LOC).
- **Validation surface scales with candidate.** C has 5+ environments to spot-check; logistical risk.
- **Frontmatter mitigations in D may waste effort** if hooks dominate the signal. Worth treating as a v0.3 experiment instead of a v0.2 ship line — flag for Q5b/c discussion.
- **The user might want a 6th candidate** I haven't enumerated. Listed as change-my-mind condition #1.
