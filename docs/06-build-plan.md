# 06 — Build Plan

What gets built when. Each phase has explicit pass/fail criteria; if a phase fails, the next phase doesn't start.

**Total horizon: ~10–12 weeks for full v1.**

---

## Phase ordering

Build in order of *highest doubt removed per dollar*:

1. **Phase 0 — Skill draft + golden-set eval** — does the skill teach correctly?
2. **Phase 1 — MVP** — does the product resonate with real users?
3. **Phase 2 — Cross-platform & polish** — does it work across agent platforms?
4. **Phase 3 — Team features** — is there pull from teams / paying buyers?
5. **Phase 4 — Eng-leader surface** — is there pull from eng leads?

**Most products at this stage die between Phase 1 and Phase 2.** Plan accordingly.

---

## Phase 0 — Skill + golden-set eval (~1 week; cost detail in [`07-risks-and-evals.md`](07-risks-and-evals.md))

Before any plugin code: write the skill, build the golden set, measure. The golden set is seeded from real failure modes (error-analysis-first, per [Hamel Husain](https://hamel.dev/blog/posts/evals-faq/should-i-practice-eval-driven-development.html)) — not imagined ones — by running the draft skill against ~10 real Claude Code sessions and harvesting misses.

**Deliverables** (layout per [`09-adapters.md`](09-adapters.md)):
- `core/skill/SKILL.body.md` — first skill body draft (from [`05-skill-brief.md`](05-skill-brief.md))
- `core/golden-set/` — 50 scenarios (30 capture, 10 non-capture, 10 sweep planning)
- `evals/harness/` — Claude Agent SDK-based runner (see [`10-eval-harness.md`](10-eval-harness.md))
- `evals/reports/v1-<date>.md` — per-scenario results + aggregates

**Pass**: recall ≥ 80%, precision ≥ 90%, planning sanity ≥ 9/10, cost ≤ $0.50 / session. (See [`07-risks-and-evals.md`](07-risks-and-evals.md) §Scoring & thresholds for canonical gates and fail-hard cutoffs.)

**Fail**: recall < 70% or precision < 85% → **iterate the skill once**, retry. **Two consecutive failures** → fundamental rethink (hybrid model with a separate audit step, or kill).

The golden-set eval is the cheapest decision point in the project. Skip it and the rest is a guess.

### Phase 0e — A2 spike: diff quality (1 day, after A1' passes)

Per [`07-risks-and-evals.md`](07-risks-and-evals.md) A2. Tests "agent produces safe diffs ≥80% of the time" — not automatable cheaply, so it's a manual spike, not part of the golden set.

- 30 known fix-eligible items × 3 personal repos
- Run sweeps; collect each diff
- Manually score: `clean | acceptable | scope-creep | wrong | broke-untested`
- **Pass**: ≥75% clean+acceptable AND ≤5% wrong-or-broke
- **Fail**: tune verification rules / refusal thresholds in the skill body before Phase 1

Cost: ~$10 in tokens, ~½ day of scoring labor. Runs after A1' passes, before Phase 1 Day 1.

---

## Phase 1 — MVP (9–11 days)

Ship the smallest end-to-end thing.

**In scope**:
- **Skill** — polished from Phase 0
- **Markdown spec** — locked at v1
- **Claude Code plugin** — manifest + skill placement + `permissions.deny` in `settings.json` for refusal paths. Skill auto-exposes as `/un-punt`. **No hooks at MVP** — skill loads via description match. Add `SessionStart` / `Stop` hooks in Phase 2 *only* if eval shows description-match alone is unreliable.
- **Cold-start inventory flow** — first-run guided scan
- **Thin CLI** — three commands: `install`, `status`, `uninstall`
- **Installer** — `npx un-punt install claude-code` and/or `brew install un-punt`
- **README + landing page** — pitch, demo, install, eval results link
- **Public test launch** — Show HN, r/ClaudeCode, Bluesky, direct outreach to 5–10 people

**Out of scope**: Codex/Cursor adapters, pre-break flow, per-repo overrides, MCP server, GitHub App, scheduled runs, eng-leader dashboard.

**If hooks become necessary** (Phase 0d shows description-match misses too much): we ship as a Claude Code *plugin* instead of standalone skill. Side effect: the slash command becomes namespaced (`/un-punt:un-punt`). Treat that as a v0.2 break, document it in the README, and update [`02-experience.md`](02-experience.md) and [`11-checklist.md`](11-checklist.md) accordingly.

**Friendly tester pool**: 5–10 people from existing network (Discord, X/Bluesky DMs, prior collaborators). Reach out the week before launch so they're primed to install on Day 7. If we don't have 5 plausible names by Phase 0e, that's a signal to fix audience before launch.

**Build order** (revised April 2026 from the original 7-day estimate — see [`07-risks-and-evals.md`](07-risks-and-evals.md) §B1 hidden-risk analysis):

| Day | Work |
|---|---|
| 1 | Polish skill from Phase 0; lock markdown spec at v1 |
| 2 | Plugin manifest + skill placement + `settings.json` deny rules + bypass-mode detection |
| 3 | Cold-start inventory flow |
| 4 | Disposition prompt (4 options, including option-4 commit-sha back-fill via `git log`) |
| 5 | Verifier-script denylist + watch-mode detection + symlink-via-Bash containment for `.un-punt/items/*` |
| 6 | Thin CLI (`install` / `status` / `uninstall`); `settings.json` merge logic; npm publish + marketplace.json |
| 7 | B8 verification: N=5 fresh repos × M=3 session shapes (greenfield / mid-feature / post-merge) — confirm description-match auto-loads ≥12/15 |
| 8 | Polish — error messages, README, landing page, demo GIF |
| 9 | Recovery smoke test (deliberately bad item; confirm feedback → contract loop, including the 5 edge cases in [`05-skill-brief.md`](05-skill-brief.md) §9) |
| 10 | Friendly-tester install pass (3–5 testers, light supervision) |
| 11 | Launch |

If Phase 0 surfaces zero issues and the B8 verification on Day 7 passes first try, this collapses back toward 7–8 days. The 9–11 day estimate is *expected* not *worst-case*.

**Pass (within 7 days of launch)**:
- ≥ 100 GitHub stars
- ≥ 10 unsolicited "this fixed something" comments
- ≥ 30 unique installs
- **Second-use signal** — measured via one of two methods (pick one before launch, document in README):
  - **(a) Local opt-in counter.** A single line in `~/.config/un-punt/state.toml` records `sweep_count: N` per repo. The CLI's `un-punt status --share` flag prints the count for the user to paste into a feedback issue or share via DM. No network calls; explicit user action required to surface. Pass: ≥ 40% of the 30 installers who respond report `sweep_count ≥ 2` for any repo.
  - **(b) Qualitative DM follow-up.** DM the first 30 installers at +7 days, ask "did you run a second sweep?" Pass: ≥ 12/30 say yes (the same ≥40% in absolute terms, but accept the response-bias confound). Use this only if (a) ships late.
  - Either way, **define "second sweep"** as: a sweep with a different `sweep_id` than the cold-start inventory, on the same repo, in the 7-day window. Cold-start auto-suggested sweeps don't count toward the second.
- ≥ 1 organic mention from someone unaffiliated

The previous draft of this criterion was inconsistent with the "telemetry off through Phase 2" decision (see §Telemetry below and decision 5 in [`08-design-decisions.md`](08-design-decisions.md)). Resolved: a local-only opt-in counter is **not** telemetry by the strict definition (no network, no central collection) — it is local state the user can choose to share, identical in spirit to `git status` for the un-punt directory.

**Fail**: <30 stars; or stars without retention (<10% second-sweep); or "the captures were noise" complaints; or "just claude-mem" framing wins (see [`07-risks-and-evals.md`](07-risks-and-evals.md) §A3').

**On fail**:
- Stars without retention → skill needs better cleanup-prioritization. Rework, re-launch as v0.2.
- Noisy captures → golden set was overfit. Expand with real-world scenarios; rerun Phase 0.
- Conflated with claude-mem → framing problem. Rework messaging to lead on the resolution-loop output (cleanup branch + receipts + disposition), not capture. If claude-mem itself ships a cleanup feature mid-window, fall back to the A3' reposition: un-punt as the *resolution loop on top of* claude-mem's capture, using its `search` MCP as planning input.
- Truly low pull → kill cheaply. Don't sink Phase 2.

---

## Phase 2 — Cross-platform & polish (2–3 weeks)

**In scope**:
- **Codex adapter** — `AGENTS.md` instructions ([open format](https://agents.md/), read by Codex on session start) + plugin manifest
- **Cursor experimental** — limited support via [`.cursor/rules/*.mdc`](https://cursor.com/docs/context/rules) (Auto Attached / Agent Requested rule types)
- **Pre-break flow** — skill rules for "I'll be away N days; produce HANDOFF.md"
- **Per-repo `contract.md` overrides** — editable per-repo
- **Cross-session self-audit** — at sweep start, agent reviews recent work for missed captures
- **Optional MCP server** — only if filesystem-via-Bash is awkward in practice
- **CLI niceties** — `un-punt show <id>` (cat an item with formatting); add other helpers if real users ask

**Pass**:
- Codex parity within 10% recall delta
- Cursor users see useful captures despite platform limits
- Pre-break flow used by ≥ 10% of week-3 active users
- ≥ 40% of MVP users still active at week 4

**Fail**: cross-platform parity poor (Codex captures 50% less); pre-break usage <2%.

**On fail**: tune per-platform skill variants (1-week iteration); drop pre-break if it's gimmicky.

---

## Phase 3 — Team features (3–4 weeks)

**In scope**:
- **GitHub App** for review-time sweeps — PR comments flagging new debt
- **Scheduled runs** — GitHub Actions workflow generator for weekly headless sweeps
- **Slack digest** — webhook integration (optional)
- **Billing scaffolding** — Stripe; pricing experiments (per-user vs. per-PR vs. per-cleanup)
- **Item-file integrity check** — only if real users surface malformed files; use `markdownlint` first before building anything custom
- **Multi-dev item dedup** — lifecycle merges when two devs capture the same item

**Pass**:
- ≥ 10 paying teams in 30 days
- Weekly-sweep PR merge rate ≥ 40%
- Review-time comment "addressed by reviewer" rate ≥ 30%
- No security incidents from GitHub App permissions

**Fail**: <5 paying teams; weekly PRs sitting unmerged; comment fatigue (teams disabling).

**On fail**: pricing mismatch → per-PR experiments; cadence wrong → try other frequencies; comment fatigue → tighten review-time precision.

---

## Phase 4 — Eng-leader surface (3–4 weeks)

Only if Phase 3 has 25+ paying teams.

**In scope**:
- **Hosted dashboard** (metadata sync, read-only) — debt-velocity, hot zones, aging
- **Repo-level metrics + team-level rollup**
- **HIP-sprint brief generator** — manual trigger only; not auto-fire
- **Snooze / dismiss / accept tracking** on briefs

**Pass**:
- ≥ 30% of paying teams have ≥ 1 user log into the dashboard monthly
- ≥ 30% of briefs described as "useful" qualitatively
- Month-6 renewal ≥ 80% for dashboard users

**Fail**: dashboard usage <10%; briefs ignored; renewals flat.

**On fail**: replace dashboard with email digests; reduce brief sophistication ("your debt aging looks bad in zone X").

---

## Cross-cutting

**Skill versioning**: every bump is deliberate, eval-gated; old skills work on old item files (forward compat). Per-repo overrides aren't a v1 feature — users can fork the skill if they need to.

### Telemetry

**Default: off.** Through Phase 2, no telemetry of any kind. The product is local-first by construction (decision 5 in [`08-design-decisions.md`](08-design-decisions.md)) and we don't want a "telemetry, even anonymous" footnote on the privacy pitch.

**Phase 3 (opt-in only).** When team features ship, users can turn on aggregate metrics via an explicit consent step. What's collected:

- Counts: install events, sweeps started/completed, items captured by type, items resolved/dismissed
- Versions: skill version, CLI version, agent platform (Claude Code / Codex / Cursor), OS family
- Aggregates: median sweep duration, fix-vs-flag ratios, recovery (feedback file write) frequency

What's never collected: code, file paths, item titles, deferral text, conversation transcripts, repo names, user names or emails, IP addresses (we hash + drop on the server side), branch names, commit SHAs.

**Implementation**: a tiny `un-punt telemetry on` / `off` toggle stored in `~/.config/un-punt/telemetry.toml`. Off → no network calls of any kind from the CLI. On → POST to a single endpoint with the events above; the endpoint is documented in the README and the on-disk schema is checked into the repo so users can audit before opting in.

**Why opt-in not opt-out**: opt-out is hostile in OSS and a non-starter for the air-gapped/regulated buyers who are part of the wedge. The data we'd collect via opt-out is also the data we don't actually need to ship Phases 1–2.

**Telemetry vs. evals**: golden-set runs and dogfood data live in the repo (with consent), not on a service.

**Security**: no code/transcript content leaves the user's machine in Phase 1–2. Phase 3 GitHub App uses minimal permissions (`repo:read` for diff/scan, `pull_requests:write` for comments). Agent platform API keys live in keychain or env. All releases signed.

**Licensing**: MIT for everything in MVP. Revisit a commercial split (e.g., source-available for the GitHub App / Dashboard) when there's revenue to protect — not before.

**Pricing (proposed, calibrated against April 2026 comparables — see audit in `/tmp/un-punt-validation/A5-pricing.md`)**:

| Tier | Price | Scope |
|---|---|---|
| Free / OSS | $0 | Solo, **1-repo cap or 50 captured items / month**, all CLI features |
| Team | **$19 / seat / month** | GitHub App, scheduled sweeps, Slack digest, multi-dev item dedup |
| Growth | **$35 / seat / month** | Adds eng-leader dashboard, debt-velocity, brief generator |
| Enterprise | Custom | On-prem, SOC2, custom rules |

Anchors: Cursor Pro $20 (sit at $19, just below). CodeRabbit Pro $24, Pro+ $48 — un-punt's $19/$35 ladders cleanly underneath while leaving room for Enterprise. Stepsize $12 is feature-light; CodeAnt $10 is a lint scanner. The earlier "$10–20 range" framing was too low for a team product with a GitHub App, dashboard, and Slack digest.

The Free tier's 1-repo / 50-item cap exists to drive team conversion when a real team starts using the tool across multiple repos. Per-repo billing on the GitHub App (5-repo minimum) is a candidate for A/B testing in Phase 3.

**Naming**: working name `un-punt`. Trademark + `.com` check before Phase 1 launch.

---

## Total horizon

| Phase | Wall time | Eng-weeks (est.) |
|---|---|---|
| 0 | ~1 week (incl. A2 spike) | 1 |
| 1 | 9–11 days | ~2 |
| 2 | 2–3 weeks | 4 |
| 3 | 3–4 weeks | 6 |
| 4 | 3–4 weeks | 5 |
| **Total** | **11–13 weeks** | **~18** |

~4–4.5 engineer-months for v1. The first week (Phase 0) is the make-or-break gate.

---

## Don't skip Phase 0

The golden-set eval is the cheapest decision gate in the project — see [`07-risks-and-evals.md`](07-risks-and-evals.md) §Cost for the full breakdown. Skip it → Phase 1 ships an uncalibrated skill → launch is a guess. The skill IS the product; calibrating it before launch is non-optional.

Next: [`07-risks-and-evals.md`](07-risks-and-evals.md).

---

## References

- [Anthropic — The Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf) — skill structure, progressive disclosure, iterative testing (15–30 min for first working skill).
- [Anthropic — Best Practices for Claude Code](https://www.anthropic.com/engineering/claude-code-best-practices) — plugin and skill conventions.
- [anthropics/skills](https://github.com/anthropics/skills) — reference skills repo.
- [Hamel Husain — Should I practice eval-driven development?](https://hamel.dev/blog/posts/evals-faq/should-i-practice-eval-driven-development.html) — argues for error-analysis-first over pure EDD; informs golden-set sourcing.
- [Hamel Husain — Your AI Product Needs Evals](https://hamel.dev/blog/posts/evals/) — why evals are the highest-leverage gate.
- [Hamel Husain & Shreya Shankar — LLM Evals FAQ](https://hamel.dev/blog/posts/evals-faq/) — recall/precision framing, golden-set sizing.
- [OpenAI — Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md) — Codex's equivalent of Claude skills/rules.
- [agents.md — open format spec](https://agents.md/) — markdown-only, tool-agnostic.
- [Cursor — Rules](https://cursor.com/docs/context/rules) — `.cursor/rules/*.mdc` with Always / Auto Attached / Agent Requested / Manual modes.
