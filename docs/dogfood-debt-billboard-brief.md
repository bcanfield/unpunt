# Brief: `debt-billboard` — a controlled-dogfood project for un-punt

> **Audience.** A coding agent (Claude Code / Codex / Cursor) or a contractor with GitHub access and no prior context on this project. Read this whole file before starting. Where it points you at GitHub, *go fetch*.

---

## Your mission

Build a small public webapp called **`debt-billboard`** over ~10–14 working days, with the [`un-punt`](https://github.com/bcanfield/unpunt) plugin installed and active in your Claude Code (or Codex) session the entire time. The webapp's job: ingest a public `.un-punt/` directory from a GitHub repo and render a shareable read-only dashboard of that repo's deferred-work state (captures per day, sweep close rate, refusal counts, top deferred areas).

You are *not* primarily building a product. You are running a **dogfood experiment** whose output is:

1. A working public webapp (real, deployed, useful).
2. A public `.un-punt/` directory in the webapp's own repo, generated organically by un-punt during the build.
3. A `dogfood-log.md` recording un-punt's misses and false positives (per the template at [`docs/dogfood-log-template.md`](https://github.com/bcanfield/unpunt/blob/main/docs/dogfood-log-template.md)).
4. Four named showcase artifacts (see [§ Showcases](#showcases)) that prove un-punt's value to a stranger in 30 seconds.

The webapp is the body. The `.un-punt/` directory and the showcases are the soul.

---

## Background: what un-punt is

Two-paragraph version. For the full picture, fetch:

- [`README.md`](https://github.com/bcanfield/unpunt/blob/main/README.md) — pitch + 30-second demo gif
- [`docs/01-vision.md`](https://github.com/bcanfield/unpunt/blob/main/docs/01-vision.md) — what + why + who
- [`docs/05-skill-brief.md`](https://github.com/bcanfield/unpunt/blob/main/docs/05-skill-brief.md) — what the skill teaches the agent
- [`core/skill/SKILL.body.md`](https://github.com/bcanfield/unpunt/blob/main/core/skill/SKILL.body.md) — the skill source itself (the IP)
- [`core/skill/reference/refusal-lists.md`](https://github.com/bcanfield/unpunt/blob/main/core/skill/reference/refusal-lists.md) — the 12 categorical + 5 hostile-input refusals

un-punt is a Claude Code plugin (Codex/Cursor adapters next) that turns the user's existing AI agent into a janitor for its own output. The agent silently captures every deferral it makes (TODOs, `as any`, `.skip`, "I'll handle X later") into `.un-punt/items/<id>.md` files as work happens. At natural wrap-up moments — end-of-feature, area-switch, end-of-day — it offers a small **sweep**: pick 5 high-confidence items, fix them visibly in the working tree, run the project's verifier (tests/typecheck/lint), and ask the user where the resulting commits should land. Categorical refusals (auth, payments, migrations, crypto, lockfiles, generated code, etc.) override confidence — un-punt flags those, never fixes them.

The product is conventions plus a thin install shell. There is no database, no daemon, no service. The user's agent is the engine; un-punt ships the skill (markdown rules) plus a small CLI that drops it in place. The skill body and reference files are the entire IP. Calibration happens via `.un-punt/feedback.md`: the user complains, un-punt raises the threshold for the implicated item type / path on the next session.

---

## The project: `debt-billboard`

### What it does

A public webapp at `debt-billboard.app` (or `*.vercel.app`, `*.fly.dev` — your call). Anyone pastes a GitHub URL of a repo with a public `.un-punt/` directory; the app fetches the items + sweeps + feedback, renders a dashboard:

- Captures per day (sparkline, last 30 days)
- Items by type (donut: deferred-implementation / type-loosened / skipped-test / hack-workaround / duplicated-code / other)
- Sweep close rate (closed-via-fix vs flagged vs refused)
- Top 3 deferred areas (path prefixes)
- Recent sweep timeline (commit messages with two-receipt format)
- "Calibration history" — `feedback.md` resolved entries

The app is read-only and free for public repos; a `$5/mo` paid tier exists for private repos (Stripe + GitHub OAuth — these unlock refusal categories you need to exercise; see [§ Refusal-surface coverage](#refusal-surface-coverage-must-hit-9-of-12)).

### Why this specific product

It is the un-punt landing-page. The product *is* the showcase. Visitors see live billboards from real users on their first click. The recursion is the marketing story.

It also hits 9 of un-punt's 12 categorical refusals naturally, both major deferral surfaces (TS frontend + Python backend), and produces visible wrap-up moments at every shipped feature. You don't have to *stage* any of un-punt's behaviors — just ship the product and let them happen.

### Tech stack (specific — non-negotiable choices marked ★)

| Layer | Choice | Why |
|---|---|---|
| Frontend ★ | TypeScript + React 19 + Next.js App Router + Tailwind | Hits `type-loosened` deferrals; large surface for `as any` / `@ts-ignore` opportunities |
| UI components | shadcn/ui | Familiar to the audience; clean screenshots for the showcase |
| Backend ★ | Python 3.12 + FastAPI + Pydantic | Second language for golden-set stratification; hits `skipped-test` surface |
| DB ★ | Postgres + sqlc-generated TS types or Prisma | Migrations folder ⇒ refusal rule 2 |
| Auth ★ | GitHub OAuth (Authlib on backend) | Auth folder ⇒ refusal rule 3 |
| Payments ★ | Stripe (test mode is fine) | `billing/` folder ⇒ refusal rule 5 |
| Crypto ★ | JWTs signed with HS256 / Ed25519 keys | `crypto`/`signing` symbols ⇒ refusal rule 4 |
| AI | Claude API (Anthropic SDK) for "summarize this repo's debt in one paragraph" feature | Adds a real LLM call surface; tests prompt-caching properly |
| Tests ★ | `vitest` (frontend) + `pytest` (backend) + `playwright` (e2e) | Verifiers must exist on both sides — un-punt's two-receipt rule depends on it |
| CI ★ | `.github/workflows/` running typecheck + tests on every push | `.github/workflows/` ⇒ refusal rule 6 |
| Lockfiles ★ | `pnpm-lock.yaml` + `uv.lock` | Refusal rule 7 |
| Generated code | OpenAPI → TS client (orval or openapi-typescript) | `__generated__/` ⇒ refusal rule 8 |
| Deploy | Vercel (frontend) + Fly.io / Railway (backend + Postgres) | Public + free tier |

If you must deviate, document why in `dogfood-log.md` "Other notes" — but the ★ items are load-bearing for refusal-surface coverage.

---

## Refusal-surface coverage (must hit 9 of 12)

un-punt has 12 categorical refusal rules. The build must surface at least 9 of them so each gets at least one observation in the wild. The stack above forces these naturally:

| Rule | Triggered by |
|---:|---|
| 1 — public APIs | `packages/api-client/index.ts` (re-exports the OpenAPI client) |
| 2 — DB migrations | `backend/migrations/*.sql` |
| 3 — auth | `backend/app/auth/oauth.py`, `frontend/lib/auth.ts` |
| 4 — crypto | `backend/app/auth/jwt.py`, key rotation utility |
| 5 — payments | `backend/app/billing/stripe.py`, `frontend/app/billing/` |
| 6 — CI/CD | `.github/workflows/ci.yml` |
| 7 — lockfiles | `pnpm-lock.yaml`, `uv.lock` |
| 8 — generated code | `frontend/lib/__generated__/api.ts` |
| 11 — 24h human-touched files | Will happen organically as you commit by hand |
| 12 — gitignored paths | `.env.local`, `dogfood-log.md` |

Rules 9 (test deletion), 10 (cross-module refactors) are easy to skip; if you want max coverage, schedule one explicit "remove the orphan billing test" task and one "extract shared types from frontend + backend into `packages/shared/`" task in week 2.

---

## Deferral-type coverage (must hit all 6)

Each of un-punt's 6 item types should appear ≥3 times in your final `.un-punt/items/` corpus:

| Type | How to surface naturally |
|---|---|
| `deferred-implementation` | Stub the "summarize this debt" Claude API call before the prompt is finalized |
| `type-loosened` | When wiring the OpenAPI client into React Query, you'll cast at boundaries |
| `skipped-test` | Skip the Stripe webhook test on day 1; come back day 8 |
| `hack-workaround` | The OAuth callback redirect on localhost vs prod requires one |
| `duplicated-code` | Date-formatting helper in 3 places before you DRY it |
| `other` | When the agent invents one — capture it; log it as a calibration signal |

---

## Methodology — how to maximize dogfood value

### Setup (day 0, before any code)

1. **Clone un-punt locally**: `git clone https://github.com/bcanfield/unpunt.git ~/code/unpunt`
2. **Build the skill artifact**: `cd ~/code/unpunt && pnpm install && ./core/build.sh`
3. **Create an empty `debt-billboard` repo on GitHub**, clone it locally, `cd` into it.
4. **Install un-punt into your local Claude Code**:
   `~/code/unpunt/packages/cli/run.sh install claude-code`
5. **Restart Claude Code** so the skill loads via description-match auto-loading. Verify with `~/code/unpunt/packages/cli/run.sh status`.
6. **Seed cold-start corpus**: scaffold the Next.js + FastAPI skeleton (just `create-next-app` + `uv init` defaults) and *intentionally drop ~30 organic-looking TODOs/`as any`/skip'd tests across the scaffold* before your first un-punt-aware session. This guarantees cold-start runs against real material.

### During the build (days 1–14)

Seven non-obvious moves that 10x dogfood value:

1. **Don't over-discipline yourself.** The point is to *let* the agent leave deferrals, not to write clean code by hand. Ship features fast and let un-punt catch what falls through. Misses are gold; clean code is wasted dogfood.
2. **One refusal-category-touching task per day in week 1.** Don't stage them — pick from your real backlog. "Wire OAuth callback" naturally hits rule 3. "Add Stripe webhook" hits rule 5. Distributing them across days produces clean per-session refusal observations.
3. **Two languages, one cross-language deferral.** At least once, say in chat: *"we'll add the Python equivalent of this Zod validator later"*. Then check whether un-punt captured it. Cross-language chat-only deferrals are the hardest case for the skill — golden-set stratification needs them.
4. **Run sessions on different days, not back-to-back.** Cross-session amnesia is a load-bearing un-punt risk (B8). Resume a 3-day-old `.un-punt/feedback.md` at least twice. Document whether un-punt re-loads its own state correctly.
5. **Mid-project, intentionally accept a bad sweep.** Around day 7, when un-punt proposes a sweep, accept one fix you privately think is borderline. After the commit lands, write a `feedback.md` entry: *"the auth/oauth.ts type tightening was too aggressive — reverted manually"*. Run another sweep the next session and confirm `contract.md` got a `type-loosened/src/auth/**: 0.92` line. This validates the calibration loop end-to-end.
6. **Force one cold-start re-run.** Mid-project, `git rm -rf .un-punt/items/` (commit it as "reset capture state"), then start a fresh session and invoke `/un-punt`. Verify cold-start inventory works against a populated repo with no `.un-punt/items/`.
7. **Log only misses + false positives.** Per the [`dogfood-log-template`](https://github.com/bcanfield/unpunt/blob/main/docs/dogfood-log-template.md), un-punt's `.un-punt/items/` self-documents every successful capture. Don't duplicate that work. Your log is the *delta* — what un-punt didn't see, and what it shouldn't have.

### Rough 14-day cadence

This is a sketch — adjust to your real velocity. The point is the *distribution* of refusal triggers and wrap-up moments, not the exact daily list.

| Day | Theme | Refusal rules likely triggered | Expected un-punt artifacts |
|---:|---|---|---|
| 0 | Scaffold + seed cold-start TODOs | — | `.un-punt/items/` populated by cold-start |
| 1 | Postgres schema + first migration | 2 | First refusal observation |
| 2 | GitHub OAuth callback flow | 3, 4 (JWT signing) | Multi-rule refusal |
| 3 | Items list endpoint + first React page | — | Wrap-up suggestion #1 |
| 4 | OpenAPI generation + TS client | 8 | Generated-code refusal |
| 5 | Items detail view + sparkline | — | Wrap-up #2; first sweep |
| 6 | Stripe checkout flow | 5 | Payments refusal |
| 7 | **Intentionally accept a borderline sweep** | — | `feedback.md` entry written |
| 8 | Calibration loop validation | — | `contract.md` should auto-update |
| 9 | Sweep timeline view + commit-receipt parser | — | Wrap-up #3 |
| 10 | Public-vs-private repo gating | 3 | Auth refusal again |
| 11 | Reset `.un-punt/items/`, run cold-start | — | Cold-start inventory replay |
| 12 | Claude API "debt summary" feature | — | Real LLM call surface |
| 13 | CI workflow + Vercel/Fly deploy | 6 | CI refusal |
| 14 | Showcase artifact assembly | — | All four showcases produced |

---

## Showcases — what to ship at end of dogfood

Four named artifacts. Each makes one specific case to one specific reader.

### 1. The public `.un-punt/` directory

Push the live, untouched `.un-punt/items/` + `.un-punt/sweeps/` + `.un-punt/feedback.md` + `.un-punt/contract.md` to the public `debt-billboard` repo. **Do not curate.** The point is "this isn't theatre — here are 90+ real items, real lifecycle tables, real refusal traces, real calibration history."

Link it from the un-punt README as: *"What un-punt looks like after 14 days on a real project — browse [`debt-billboard/.un-punt/`](https://github.com/<you>/debt-billboard/tree/main/.un-punt)."*

### 2. A live `debt-billboard.app/<you>/debt-billboard` dashboard

The hero image. Self-referential, visceral, screenshottable. The first card a visitor sees on the un-punt landing page should be debt-billboard rendering its own debt-billboard.

### 3. Filtered commit log of sweep commits

Run `git log --grep="^Why this:" --pretty=fuller` against the dogfood repo and produce a static `SWEEP_COMMITS.md` showing every two-receipt commit un-punt produced. This proves the two-receipt commit format works in the wild and gives PR reviewers something concrete to compare against.

Reference the format spec at [`core/skill/reference/disposition-prompt.md`](https://github.com/bcanfield/unpunt/blob/main/core/skill/reference/disposition-prompt.md) so reviewers can see the contract being honored verbatim.

### 4. Calibration timeline

A `CALIBRATION.md` showing the diff between week-1 `contract.md` and week-2 `contract.md`, with each `feedback.md` entry that drove each change. Demonstrates: *"the skill learns from your team's preferences."* This is the line that differentiates un-punt from claude-mem and from Anthropic's `code-simplifier` plugin in the buyer's mind.

Plus an implicit fifth deliverable: a clean `dogfood-log.md` at the repo root, gitignored locally but submitted as a PR to [`bcanfield/unpunt`](https://github.com/bcanfield/unpunt) at end-of-dogfood. The un-punt team will use it to expand `core/golden-set/` from ~73 to ~120 scenarios. This is the corpus contribution that funds the next skill iteration.

---

## Anti-patterns — things that destroy dogfood value

- ❌ **Writing tidy code by hand.** Defeats the point. Move fast; let un-punt catch the deferrals.
- ❌ **Aiming for the coverage targets *during* the build.** Bias defeats the test. Distribute refusal-touching tasks naturally; if you don't hit all 6 deferral types, that's a finding, not a failure.
- ❌ **Curating `.un-punt/items/` before publishing.** The mess is the showcase.
- ❌ **Including PII or secrets in deferred-item bodies.** Describe the symbol, don't quote the body, when content is sensitive. (Lock files, `.env.local`, etc. are auto-refused — but be careful in your own TODO comments.)
- ❌ **Writing entries in `dogfood-log.md` for un-punt's correct captures.** They self-document. Log only misses + false positives.
- ❌ **Using `--dangerously-skip-permissions`.** un-punt detects bypass mode and refuses to operate. Don't fight it.
- ❌ **Skipping CI / verifier setup.** Without `pnpm test` and `pytest` returning meaningful exit codes, every sweep degrades to FLAG-only mode and you learn nothing about the fix path. Verifiers are non-negotiable.
- ❌ **Using `EnterWorktree` or any hidden-worktree tool for sweep execution.** un-punt's contract is *visible work in the user's current tree*. If your harness hides the work from view, the trust contract breaks. The agent must touch the same tree you have open in your editor.
- ❌ **Running `pnpm install -g` of the un-punt CLI.** Use the local `packages/cli/run.sh` shim so iterative skill rebuilds during dogfood don't get clobbered by a stale global install.

---

## How to log misses (do this *during*, not after)

Per [`dogfood-log-template.md`](https://github.com/bcanfield/unpunt/blob/main/docs/dogfood-log-template.md). One paragraph version:

Keep a single file `dogfood-log.md` at the repo root, gitignored. Two flat lists per day:

```markdown
## Day 1 — debt-billboard (TS+Python)

### Misses
- backend/app/auth/oauth.py:42 — said in chat "we'll handle the refresh-token rotation later" but no item written. Probably because un-punt didn't see the chat as a deferral signal — the phrasing was passive.
- frontend/app/items/[id]/page.tsx — added `// FIXME: clock skew` between two Edit calls; un-punt missed it. Suspect: capture timing window.

### False positives
- backend/tests/fixtures/sample_items.py:14 — captured a `TODO` inside a Python docstring that's test fixture content
- frontend/lib/legacy.ts — captured an `as any` that has a comment explicitly justifying it ("type-narrowed at the boundary, this is correct")

### Wrap-up behavior
- Suggested at end of OAuth feature (✓ correct moment, concise phrasing, easy to dismiss)

### Other notes
- Cold-start finished in 4 minutes, captured 27 of the 30 seeded TODOs
```

Don't aim for completeness. Bullets are fine.

---

## When you finish

1. Push `debt-billboard` public on GitHub.
2. Deploy it. Confirm `debt-billboard.app/<you>/debt-billboard` renders.
3. Open a PR to [`bcanfield/unpunt`](https://github.com/bcanfield/unpunt) titled *"Dogfood: debt-billboard, 14 days"* with:
   - Link to the live deployment
   - Link to the public `.un-punt/` directory
   - The full `dogfood-log.md` (PII-scrubbed)
   - `SWEEP_COMMITS.md` and `CALIBRATION.md`
4. Don't open any other PRs to bcanfield/unpunt — the corpus expansion + skill iteration happens on their side.

That's the whole job. The thing you build matters less than the receipts you produce while building it.
