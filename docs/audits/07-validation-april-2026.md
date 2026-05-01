# Pass 7 — Idea Validation (April 2026)

**Goal.** Test the un-punt *idea* — competitive position, demand framing, technical assumptions, threat model, eval design, citation accuracy, pricing — before committing to Phase 0. Distinct from Passes 1–6, which audited the README's polish on top of an unaudited idea.

**Method.** Eight parallel sub-agents, then a sequential synthesizer. Wave A (5 agents) gathered external evidence (competitors, Anthropic platform changes, demand signals, citation freshness, pricing). Wave B (3 agents) red-teamed the doc set internally (technical assumptions, eval design, threat model). The synthesizer reconciled disagreements and produced a change list.

**Outputs.** Findings in `/tmp/un-punt-validation/{A1..A5,B1..B3,SYNTHESIS}.md`. This audit log records what changed in the docs as a result.

---

## Verdict

**Conditional Go.** Phase 0 may proceed only after fixing five hard blockers (1–2 engineer-days, all doc edits — applied below). Phase 1 *ship* is separately blocked until the B3 P0 security gaps are closed in code.

---

## The five hard blockers — applied

| # | Blocker | Resolution |
|---|---|---|
| **HB-1** | `08-design-decisions.md` §14 made a factually wrong claim about hooks under `--dangerously-skip-permissions`. Contradicted by Anthropic GH issues #39523, #18846, #41615 and Adversa CVE class. | §14 rewritten. Hooks are mode-and-version-dependent; un-punt now refuses to operate when bypass mode is detected (skill-level refusal). Issues + CVE cited. New row added to `03-architecture.md` Threat model. |
| **HB-2** | A1' was mis-weighted (citations support higher than 25%) AND the 50-scenario eval cannot resolve 80% vs 75% recall with confidence. | A1' split into A1'-a (trace-bearing, 30%) and A1'-b (trace-less, 45%). Eval re-framed as stage gate with Wilson 95% CI ±0.10 directional signal explicitly stated in `07-risks-and-evals.md` and `10-eval-harness.md`. |
| **HB-3** | Three citations in `01-vision.md` were wrong/dead/misattributed (CACM coined-by-Vogels, InfoQ 42%/65%, NewStack 73%). | All three corrected or removed. CACM attribution fixed (Bouzoukas wrote the article; Vogels is in the Sonar press release). InfoQ parenthetical pulled. NewStack URL removed; "past the early-adopter chasm" claim now leans on the broader signal set. Six Hills $200–400/hr hedged to "$35–80 median, $200–400 specialist top end" per A4 finding. |
| **HB-4** | `package.json`-driven verifier was attacker-controllable (`"test": "exit 0"` or `"test": "curl ..."`). Two-receipt rule meaningless under this. | Verifier-script denylist added to `05-skill-brief.md` §4. `Bash(curl|wget|nc *)` added to default `permissions.deny` in `09-adapters.md`. Adversarial scenarios `adv-004` / `adv-005` added to the golden set in `07-risks-and-evals.md` and `11-checklist.md`. |
| **HB-5** | Symlink CVE-2026-25724 races the skill check; outward symlinks resolved before refusal could fire. | New row in `03-architecture.md` Threat model. Skill-side: drive `.un-punt/items/*` filesystem ops via Bash (`lstat` + `realpath` checked against repo root) instead of Edit/Write. New Phase 1 Day 5 checklist item in `11-checklist.md`. |

---

## Risk-weight reconciliation (applied to `07-risks-and-evals.md`)

| # | Was | Now | Rationale |
|---|---|---|---|
| A1'-a (trace-bearing) | 25% (combined) | **30%** | Citation set supports more failure than 25% even on the easier subset |
| A1'-b (trace-less) | — | **45%** | Anthropic introspection ~20% reliable; trace-less is exactly the regime |
| A2 | 40% | **45%** | FLAG-only fallback is modal default in the wild, not graceful degradation |
| A3 | 35% | **22%** | Code-simplifier shipped Jan 2026 — partial Anthropic equivalent ate ~half the trigger window. 22% is the residual probability of a *full* equivalent (debt-typed memory + cleanup loop + verified diffs) shipping in window. |
| A3' | 25% | **30%** | un-punt's launch raises claude-mem's incentive; A3 / A3' are positively correlated |
| A4 | 40% | **50%** | Cleanup-branch artifact not requested in the wild; PR-bot occupies the AI-code-quality mental model; code-simplifier occupies session-end cleanup |
| A5 | 55% | **60%** | 5 distinct unsolved sub-problems in the calibration loop; monotone-tightening UX asymptotes to FLAG-only |
| B8 | tier-2 "worth tracking" | **elevated, 30%** | 1,536-char description truncation + 5K/25K-token compaction budgets are concrete documented failure modes |

---

## Newly discovered risks (C1–C12)

Added as a table to `07-risks-and-evals.md` with falsifying tests for each. Highlights:

- **C3** — `package.json`-script verifier weaponised as exfil/RCE channel
- **C4** — Indirect prompt injection via item-body markdown
- **C5** — Symlink CVE-2026-25724 (Read/Write follows symlinks before skill check)
- **C7** — `permissions.deny` >50-subcommand bypass (Adversa CVE class)
- **C8** — `--dangerously-skip-permissions` disables hooks
- **C10** — Code-simplifier confused-for un-punt at first 30 seconds
- **C12** — Phase 1 telemetry-off was inconsistent with the "≥40% second-sweep" criterion (resolved via local-only opt-in counter)

---

## Strategic positioning changes

Applied across `01-vision.md`, `README.md` (repo root), and `02-experience.md`:

1. **Lead with deferral typing + receipts**, not "session-end cleanup" — that surface is now occupied by Anthropic's `code-simplifier` (Jan 2026, OSS).
2. **Name `code-simplifier` and CodeRabbit explicitly** in the "What it isn't" sections so users do not have to do the disambiguation work themselves.
3. **Position relative to CodeScene CodeHealth MCP** as orthogonal: CodeScene tells you which code is unhealthy; un-punt closes deliberate deferrals with verified diffs.
4. **De-emphasize "1 week of engineering"** — Phase 1 re-estimated to 9–11 days. Total horizon now 11–13 weeks.
5. **Reframe Layer-1** from "the load-bearing guarantee" to "best-effort"; the actual load-bearing trust mechanisms are categorical refusals, the verifier denylist, the disposition prompt, and in-tree visibility.
6. **Stake cross-platform credibly** — A3 / A3' mitigation depends on Codex / Cursor adapters being real before Anthropic or claude-mem ship cleanup.
7. **Accelerate Flow 3 in roadmap framing** (PR-review surface) — dominant mental model for AI code quality. MVP stays in-tree; Phase 3 framing should lead with PR review.

---

## Pricing changes

Applied to `06-build-plan.md` Pricing section:

| Tier | Price | Scope |
|---|---|---|
| Free / OSS | $0 | Solo, 1-repo cap or 50 captured items / month, all CLI features |
| Team | **$19 / seat / month** | GitHub App, scheduled, Slack digest, multi-dev dedup |
| Growth | **$35 / seat / month** *(new tier)* | Adds dashboard, debt-velocity, brief generator |
| Enterprise | Custom | On-prem, SOC2, custom rules |

Anchors: Cursor Pro $20 (sit at $19); CodeRabbit Pro $24 / Pro+ $48 (un-punt's $19/$35 ladders cleanly underneath). Free tier's 1-repo / 50-item cap drives team conversion.

---

## Eval changes

Applied to `07-risks-and-evals.md`, `10-eval-harness.md`, `11-checklist.md`:

- Corpus: 50 → **73 scenarios** (30 capture + 25 non-capture + **8 adversarial** + 10 planning).
- Stage-gate framing replaces "pass gate" — Wilson 95% CI half-width stated explicitly.
- New metrics: calibration ECE (≤ 0.10), per-language recall floor (≥ 0.70), adversarial refusal (8/8).
- A2 spike pass criterion: observed ≤ 5% wrong-or-broke AND **Wilson upper bound ≤ 10%**; otherwise expand to 180 diffs.
- B8 verification: Phase 1 Day 7 = **N=5 fresh repos × M=3 session shapes** (≥ 12 / 15 unprompted captures). At least one trial includes a forced-compaction event.
- Calibration loop stopping rule: after iteration 3 with same skill rule implicated in ≥ 3 still-failing scenarios — switch to plugin + hooks, scope reduction, or skill split. Decision deadline end of Phase 0 day 5.
- Tripwire: 15-scenario subset re-runs 3× per iteration with majority vote.

---

## What remains untestable from the doc set

The validation fleet could not test these — they remain Phase-0 / post-launch work:

1. **A1' itself** — actual self-capture recall on real coding sessions (only the eval can falsify).
2. **A5 trust rebuild** — only post-launch with friendly testers.
3. **B8 in real Claude Code** — only testable on Day 7 dogfood; the SDK eval seeds the skill rather than testing description-match.
4. **Whether users distinguish un-punt from `code-simplifier` in 30 seconds** — needs the Phase 0 mock-output community test.
5. **Whether the cleanup-branch artifact is the desired shape** — A4 is now 50% likely-wrong; falsifying test pending.
6. **Real-world prompt-injection success rate** against the v1 skill — adversarial corpus exists in design only.
7. **Whether $19 converts at the rate the comparable matrix implies** — only post-launch.

---

## Next step

1. Apply HB-1 through HB-5 (✅ done in this pass).
2. Update risk weights (✅ done).
3. Expand the eval design to ~73 scenarios incl. adversarial (✅ design done; scenarios authored in Phase 0c).
4. Re-estimate Phase 1 to 9–11 days (✅ done).
5. **Phase 0 may now begin.**

If Phase 0 fails twice, the cheap-kill pivot is to the **PR-bot review surface** (Flow 3 from the original roadmap) — preserves the skill IP (deferral typing, receipts, refusals) while accepting that the cleanup-branch artifact wasn't the wedge.
