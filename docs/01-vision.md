# 01 — Vision

## In one paragraph

`un-punt` turns the user's existing AI coding agent into a janitor for its own output. Agents constantly defer things ("I'll handle this later", "leaving the type loose", "skipping this test") — silent debt that piles up. Un-punt teaches the agent (via a markdown skill) to record each deferral as a markdown file in `.un-punt/`, and at natural wrap-up moments to propose a small cleanup pass closing 5–10 items at once. The cleanup runs visibly in the developer's current working tree; the developer chooses where commits land.

**Product is conventions plus a thin install shell — not a runtime.** The user's agent is the engine; we ship the skill (markdown rules) and a small CLI to install it.

## The pain (validated)

Multiple HN front-pages in 2025–2026 ("AI Exponentializes Your Tech Debt," "Verification debt: the hidden cost of AI-generated code"). Organic naming has emerged: *vibe debt*, *comprehension debt*, *verification debt*, *cognitive debt*. A services market has formed — "Vibe Code Cleanup Specialist" listings on LinkedIn, agencies (SoftTeco, Railsware, ISHIR, Clockwise, Ulam) selling "vibe coding cleanup" engagements, and a dedicated marketplace at VibeCodeFixers.com (300+ specialists; rates from ~$35–80/hr median up to $200–400/hr at the specialist top end). Forrester projects 75% of tech leaders facing moderate-to-high technical debt severity by 2026, driven largely by AI-induced complexity. Sonar's 2026 survey found 96% of developers don't fully trust AI-generated code, yet only 48% always verify it.

Five concrete pain points un-punt addresses:

| Pain | What's happening |
|---|---|
| **Invisible debt** | Agents create deferrals nobody tracks. Buried in TODOs, transcripts, scattered memory. |
| **Cross-session amnesia** | The next session forgets what the last session deferred. Re-explained or silently lost. |
| **Reviewer blind spot** | PR reviewers see the diff but not the in-session "I'll skip this" decisions. |
| **Trust decay** | As silent debt accumulates, devs trust agents less. AI productivity gains erode. |
| **"I'll fix it later" never happens** | Backlog of intentions, no execution. The road of TODOs leads to a graveyard. |

## Who it's for

By acuteness of pain:

1. **Solo devs / 2–5 person teams** using Claude Code, Codex, or Cursor heavily. Most acute — no Jira to absorb debt, no platform team to clean up.
2. **AI-native startups (10–50 eng).** Debt visibility becoming a board-level concern.
3. **Mid-market eng orgs (50–500) adopting AI coding.** Engineering managers asking "where is the AI tax going?"
4. ❌ **Not enterprise (yet).** Jira, platform teams, slow procurement. Not the wedge.

## Why now

- AI coding past the early-adopter chasm; Claude Code, Cursor, Codex at scale
- Hook/extension surfaces exist that didn't 18 months ago
- "AI coding tax" tracked as a metric at AI-forward orgs
- LLMs cheap enough that capture/verification at session-time isn't cost-prohibitive

## What it isn't

To prevent confusion:

- ❌ Not a memory tool. claude-mem and Anthropic's Remember are *recall loops* (capture session activity so future sessions can search it). un-punt is a *resolution loop* (capture deferrals so a sweep can close them with verified commits). Real overlap on capture; the differentiator is the output — see "differentiated wedge" below.
- ❌ Not a static analyzer (SonarQube, CodeScene, CodeAnt already do that)
- ❌ Not a project tracker (Jira, Linear, GitHub Issues already do that)
- ❌ Not a feature builder (it only finishes what was started)
- ❌ Not an autonomous fixer that opens PRs without review (always proposed, always reviewed)
- ❌ Not a service in the cloud (local-first; optional team dashboard much later)

## The differentiated wedge

Several adjacent tools exist (claude-mem, Anthropic's Remember, Anthropic's `code-simplifier` plugin, Stepsize, CodeScene / CodeScene CodeHealth MCP, Codegen, CodeRabbit). None of them combine **session-time agent-driven capture** + **structured debt typing with confidence** + **per-item cleanup with verified diffs and provenance receipts** + **in-tree disposition-prompt-gated execution**.

Anthropic's open-source `code-simplifier` plugin (Jan 2026) shares un-punt's wrap-up trigger moment but is **stateless and style-focused** — it strips complexity from one file in one pass; it does not track TODOs, `as any`, skipped tests, or any other deferral across sessions. CodeScene CodeHealth MCP (Q1 2026) guides agents toward better Code Health scores via inline refactors but has neither session-time capture (F1) nor a disposition-prompt gate (F4). CodeRabbit and Greptile occupy the PR-review surface — different mental model, different artifact. un-punt's lane is the *cross-session record* of what the agent deliberately punted on, with verified receipts and a human-gated commit.

The closest neighbor is **claude-mem**: it captures session activity (decisions, fixes, discoveries) into SQLite + Chroma and exposes `search` / `timeline` / `get_observations` as MCP tools. There is real overlap on the capture side — a claude-mem user can already retrieve "everything I deferred last week" via search. **The differentiator is the output.** claude-mem ends at recall; un-punt ends at a verified cleanup branch awaiting disposition. The architectural decisions that follow from "we write code" — categorical refusals, two-receipt provenance, the disposition prompt, the lifecycle state machine — are what claude-mem doesn't have and would have to add. That delta is not far to rebuild; see [`07-risks-and-evals.md`](07-risks-and-evals.md) §A3'.

The defensible position: **the skill is the IP**. Anyone can write a skill; few will invest in building and calibrating one against a golden-set eval and iterating it across agent platforms.

## Success picture (6 months)

A small but loud user base saying *"I don't think about deferred work anymore; my agent does."* 25 paying teams. Debt-velocity neutralizing on a dashboard. Skill at v6 with a 200-scenario golden set. OSS at the core, paid at the team-aggregation surface.

## Time to value

- **Day 0**: install + cold-start inventory; first useful artifact in 10 minutes
- **Week 1**: passive capture from real sessions; items get richer context
- **Week 2–4**: regular cleanup cadence routine
- **Month 2+**: aggregate visibility (eng-leader feature)

Solo dev sees value on day 0. Sustained value starts in days, not weeks.

## The decision

Build the MVP: **~1 week of engineering** behind a **~1-week Phase 0** (skill draft + dogfood-seeded golden set + eval + A2 diff-quality spike). Pass → ship. Fail → iterate or kill cheaply.

Total horizon to full v1: ~10–12 weeks / 4 engineer-months.

Read [`02-experience.md`](02-experience.md) next.

## References

- [Forrester Predictions 2025: 75% of tech leaders to face moderate-to-high tech debt by 2026](https://www.forrester.com/press-newsroom/forrester-predictions-2025-tech-security/) — primary source for the 75% / 2026 stat, framed around AI-induced complexity.
- [Sonar: 96% don't fully trust AI code, only 48% verify it](https://www.sonarsource.com/company/press-releases/sonar-data-reveals-critical-verification-gap-in-ai-coding/) — the verification-gap data point.
- [Verification Debt — Communications of the ACM](https://cacm.acm.org/blogcacm/verification-debt-when-generative-ai-speeds-change-faster-than-proof/) — Kostakis Bouzoukas (Jan 2026) codifies the "generated faster than verified" framing. (The term itself was popularised by Werner Vogels — see the Sonar press release in the row above.)
- [Comprehension Debt — Addy Osmani / O'Reilly Radar](https://www.oreilly.com/radar/comprehension-debt-the-hidden-cost-of-ai-generated-code/) — the comprehension/cognitive-debt vocabulary referenced above.
- [AI Exponentializes Your Tech Debt — Vincent Schmalbach (HN front page)](https://news.ycombinator.com/item?id=46012183) — the HN discussion cited.
- [InfoQ: AI-Generated Code Creates New Wave of Technical Debt (Nov 2025)](https://www.infoq.com/news/2025/11/ai-code-technical-debt/) — industry coverage of AI commit volume and the verification bottleneck. (The earlier "42% / 65% by 2027" parenthetical was pulled — those figures could not be located in the linked article on re-check; sources welcome.)
- [The Vibe Coding Cleanup Industry Is Already Here — Six Hills AI](https://www.sixhills.ai/blog/the-vibe-coding-cleanup-industry-is-already-here/) — services-market evidence (LinkedIn roles, $200–400/hr cleanup specialists, VibeCodeFixers marketplace).
- [Anthropic — Extend Claude with Skills](https://code.claude.com/docs/en/skills) — primary doc for the SKILL.md format un-punt ships against.
- [Awesome Agent Skills (1000+ skills, cross-tool)](https://github.com/VoltAgent/awesome-agent-skills) — evidence skills are a portable format across Claude Code, Codex, Cursor, Gemini CLI in 2026.
- (Removed: an earlier draft cited a New Stack URL for a "73% adoption in 2026" stat that no longer resolves to the claimed content. The "past the early-adopter chasm" claim now leans on the broader signal set — Forrester, Sonar, and the services-market evidence above — rather than a single survey number.)
