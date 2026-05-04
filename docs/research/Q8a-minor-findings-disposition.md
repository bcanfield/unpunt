# Q8a — Minor findings disposition

> Synthesis session per [`docs/v0.2-research-plan.md`](../v0.2-research-plan.md). Date: 2026-05-02. **Claude proposes; user confirms** (USER GATE).

## Question

For each of the 5 minor findings surfaced during the v0.1 dogfood, is the right call **fix-in-v0.2** / **defer (to v0.2.x or v0.3)** / **accept as known limitation**?

## The 5 minor findings (from `dogfood-log.md`)

1. **Contract type vocabulary mismatch** (Probe 5 finding 1)
2. **Top-3-areas double-count** (Probe 3)
3. **Uniform 0.4 confidence + no documented promotion UX** (Probe 3)
4. **Refused-section enumeration covers 7 of 12 rules** (Probe 5 finding 2)
5. **Line-drift in items frontmatter after refactor** (Day 3 / Q3a)

## Per-finding judgment (proposed)

| # | Finding | Severity | Cost to fix in v0.2 | Proposed verdict | Rationale |
|---|---|---|---|---|---|
| 1 | **Contract type vocabulary mismatch** — `hack-workaround`/`other` in skill enum but missing from `contract.md` thresholds; orphan types (`missing-edge-case`, `deprecated-api`, `dead-code`, `doc-additions`) in contract but not in skill | Real spec inconsistency; agent silently infers `hack-workaround → 0.85` (undocumented) | ~20 LOC in `core/skill/reference/contract-template.md` | **FIX in v0.2** | Already locked in Q5c Chunk 5. Cheap. Removes an undocumented agent inference. |
| 2 | **Top-3-areas double-count** — cold-start reports `backend/app/(8) + frontend/src/(8) + frontend/src/lib/(4) = 20` but total items = 18; nested paths counted twice | Cosmetic; user can read individual items for truth | ~10 LOC in cold-start snippet | **DEFER to v0.2.x or v0.3** | No compliance impact. Inventory output undersells distribution; user-visible but not load-bearing. Group with other cold-start polish. |
| 3 | **Uniform 0.4 confidence + no promotion UX** — all cold-start captures share `confidence: 0.4` (spec-correct); user has to manually raise to fix-eligible but no documented procedure | UX gap; real users will hit this | ~30 LOC adding "Confidence promotion" subsection to `SKILL.body.md` cold-start section | **FIX in v0.2 (small addition to Chunk 4)** | Real-user-relevant documentation gap. Fits naturally with Chunk 4 (SKILL widening). 30 lines is cheap. |
| 4 | **Refused-section enumeration covers 7 of 12 rules** — `plan.md` walks rules 2/3/5/6/7/8/12 explicitly; rules 1/4/9/10/11 not visibly checked | Doc quality / auditability; reader can't verify all rules ran | ~20 LOC in SKILL.body.md sweep planning section | **DEFER to v0.2.x or v0.3** | Cosmetic. Plan.md output quality improvement; no functional impact. Not load-bearing for v0.2 ship. |
| 5 | **Line-drift in items frontmatter after refactor** — items reference `file:line` at capture; refactors invalidate (`api.ts:49` no longer exists post-refactor) | Medium. Stale references over time. | Substantial. Additive `last_verified_at:` field needs PostToolUse hook to recheck on file edits — scope-creep into Chunk 1 | **DEFER to v0.3** | Structural fix depends on v0.2 hook architecture being proven first. Document as **known limitation** in v0.2 launch materials. v0.3 can add `last_verified_at:` + recheck logic once hooks observe edits reliably. |

## Summary

| Verdict | Count | Findings |
|---|---|---|
| **FIX in v0.2** | 2 | #1 (contract template), #3 (confidence promotion docs) |
| **DEFER to v0.2.x or v0.3** | 2 | #2 (top-3-areas), #4 (refused-section enumeration) |
| **DEFER to v0.3 + document as known limitation** | 1 | #5 (line-drift) |
| **ACCEPT as known limitation** | 0 | — |

Net change to Q5c's chunk plan: **Chunk 4 grows by ~30 LOC** (confidence promotion subsection); other chunks unchanged.

## Constraints check

| Constraint | Compliance |
|---|---|
| Decision 1 (markdown) | ✓ all fixes are markdown edits |
| Decision 2 (agent is engine) | ✓ no fix moves classification work |
| Decision 4 (skill is IP) | ✓ #1 + #3 are SKILL/contract edits — strengthens IP |
| Cross-platform | ✓ all fixes are in `core/`, propagate to all adapters via build |
| No infrastructure | ✓ |
| Q5c scope (Claude Code only) | ✓ no fixes require new platform support |

## Change-my-mind

The disposition would change if:

1. **User wants different fix/defer split.** This is the user-gate question. My recommendation prioritizes "fix what matters for real users + cheap" and defers cosmetic + scope-creep items.
2. **Line-drift turns out to bite hard during punt-board re-dogfood** before v0.2 ships. Mitigation: monitor item file:line accuracy during Q7; if stale references cause confusion, escalate to v0.2.1 patch.
3. **Refused-section enumeration is needed for credibility/audit.** If the launch story emphasizes "every rule is visibly checked" to skeptical reviewers, finding #4 might warrant fix-in-v0.2. Currently low priority because no audience explicitly asked for it.

## Implications for downstream sessions

- **Chunk 4 (SKILL widening)** absorbs finding #3's confidence-promotion subsection. Estimated LOC bumps from ~50 to ~80.
- **Chunk 5 (contract template fix)** is exactly finding #1's fix. Already in scope.
- **Q7 re-dogfood validation** should include a smoke check that items captured at runtime have correct file:line (line-drift watch).
- **v0.3 / v0.2.x backlog** gains: top-3-areas dedupe, refused-section full enumeration, line-drift recheck mechanism.

## Risks surfaced

- **#3's "confidence promotion" UX is documentation only** — agent must remember the procedure and apply it when user asks. Same compliance dependency as everything else under Sketch (ii). If users routinely ignore the docs, v0.3 might want a `/un-punt promote <id>` slash command.
- **#5's defer is honest but creates a v0.3 surface** — `last_verified_at:` field plus recheck hook is non-trivial. Worth flagging as v0.3 effort.
- **Deferred items can pile up** if every dogfood spawns minor findings that always get deferred. Watch for the deferred backlog growing faster than it shrinks; if so, allocate a v0.3 chunk specifically for "minor finding cleanup."

## Decision needed from user

Confirm or override the per-finding verdicts:

| # | Finding | Proposed |
|---|---|---|
| 1 | Contract type vocab mismatch | **FIX in v0.2** (Chunk 5) |
| 2 | Top-3-areas double-count | **DEFER** |
| 3 | Uniform 0.4 confidence + no promotion UX | **FIX in v0.2** (small addition to Chunk 4, ~30 LOC) |
| 4 | Refused-section enumeration covers 7 of 12 | **DEFER** |
| 5 | Line-drift in items after refactor | **DEFER + document as known limitation** |

Once confirmed, Q8a closes and Q6 chunk plan finalizes with Chunk 4's small expansion.
