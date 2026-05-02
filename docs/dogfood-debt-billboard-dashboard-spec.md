# `debt-billboard` — final dashboard design spec

> Companion to [`docs/dogfood-debt-billboard-brief.md`](dogfood-debt-billboard-brief.md). The brief tells the dogfood agent *what to build*. This file tells them *what the dashboard looks like and why*.
>
> This spec adopts the Bento / Vercel-style aesthetic and the receipts-table primitive from the deep-research dashboard pass, and rejects every research element that requires data un-punt does not produce (Code Health 1–10, hotspot complexity × churn, intent-vs-implementation drift via embeddings, bus factor, CVE stacks, $-saved odometers, "Claude is fixing X right now" live streams, autonomous-remediation narrative). un-punt is **disposition-gated, not autonomous**; it is a **convention layer over markdown files, not a static analyzer**. The dashboard renders only what `.un-punt/` actually contains.

---

## 1. Narrative — the lead

The research recommends "Continuous Autonomous Remediation, anchored in time/dollars reclaimed." That is the wrong narrative for un-punt — un-punt is the opposite of autonomous, by design. The disposition prompt is load-bearing, not a UX wart.

**The right lead is: *"Stop letting your agent leave work unfinished. Here's what got captured, what got finished, and where it stopped."***

The hero answers three questions at a glance, in this order:

1. **Did the agent see the deferrals?** (Captured this week / type breakdown)
2. **Did any of them get finished?** (Closed via sweep / median capture-to-close time)
3. **Did the agent know when to stop?** (Refusal density / disposition-gated commits)

That's the un-punt value prop expressed in three numbers. *"$X paid down"* is a narrative un-punt cannot honestly tell — we don't compute remediation time. *"Y items finished, Z refused at the safety floor, W disposition-gated commits"* is a narrative un-punt can.

**Vocabulary lockdown** (per the SKILL anti-instructions): never use the word *debt* in dashboard copy. Use *deferred*, *cleanups*, *follow-ups*, *loose ends*. The product name `debt-billboard` is acceptable for the domain (it's the search-term word) but the in-app copy must use un-punt's vocabulary. Consider renaming the product — `punt-board`, `punt-billboard`, `followups.dev` — before launch.

---

## 2. Data contract

debt-billboard is a *renderer*, not a computer. It reads from a single GitHub repo's `.un-punt/` directory and never invents data. Concretely it parses:

| Source | Shape | What we get |
|---|---|---|
| `.un-punt/items/up-*.md` | YAML frontmatter + body + `## Lifecycle` table | id, type (1 of 6), status, file, line, symbol, confidence, created_at, updated_at, full lifecycle history |
| `.un-punt/sweeps/*/plan.md` | Frontmatter + Fix/Flag/Refused buckets | sweep_id, scope, started_at, fix/flag/refused item lists with rule citations |
| `.un-punt/sweeps/*/report.md` | Per-item execution outcome | what actually got fixed vs degraded vs failed verification |
| `.un-punt/contract.md` | YAML thresholds + refusal additions | per-type and per-path threshold history (read via git log) |
| `.un-punt/feedback.md` | `## Pending judgment` + `## Resolved` sections | calibration entries, what triggered them, what threshold change resolved them |
| `git log` on the repo | Commit messages | sweep commits with two-receipt format (`Why this:` / `Why now safe:`) |

Anything not derivable from those six sources does not appear on the dashboard. No estimates, no synthetic Code Health scores, no fake hotspot circle-packs — nothing un-punt cannot back with markdown evidence.

---

## 3. Aesthetic spec

### Palette

```
--bg:           #141413          /* Anthropic dark, default */
--surface-1:    #1B1B1A
--surface-2:    #222220
--text-primary: #FAF9F5
--text-muted:   #B0AEA5
--text-subtle:  #6B6A65
--accent:       #D97757          /* Claude terracotta — closed-via-fix, hero */
--accent-soft:  #D9775733        /* terracotta @ 20% — active-area glow */
--success:      #788C5D          /* warm green — finished items */
--warn:         #D9A557          /* warm amber — flagged items */
--danger:       #C25450          /* warm red — refused items, NOT alarming */
--blue-ref:     #6A9BCC          /* links only */
--grid:         #FAF9F505        /* dot grid @ 5% */
```

Light variant inverts `--bg` / `--surface-*` to `#FAF9F5` / `#F4F3EE` / `#E8E6DC`, accents identical.

**Semantic color rule**: `--accent` (terracotta) is reserved for **closed-via-fix** items and the agent's voice. `--success` for **flagged** (visible, intentional, not an error). `--danger` for **refused** but rendered as informational, not alarming — refused is a *feature*. Never use red as "this is bad"; un-punt's refusals are correct behavior.

### Typography

- **Numbers, paths, lifecycle rows, commit hashes**: `Geist Mono` (or `JetBrains Mono` fallback). Tabular figures (`font-feature-settings: "tnum"`).
- **Headings, hero number**: `Tiempos Headline` (or `Newsreader` / `Fraunces` accessible substitute).
- **Body**: `Geist Sans` (or `Söhne Buch`). **`Inter` is forbidden** per Anthropic's frontend cookbook.
- **Scale**: 12 / 14 / 16 / 20 / 28 / 48 / 72 (the 72 only for the hero numeric).

### Motion

State-bearing only. Permitted:

- Hero counter ticks (eased, ~600ms) when a fresh `.un-punt/` sync detects new closed items.
- Activity-tail rows fade in (200ms ease-out) on sync.
- Active-area glow (1.2s ease-in-out, terracotta `--accent-soft` at 0.4 alpha) on a directory tile when a sweep landed within the last 24h.

Forbidden: parallax, scroll-triggered theatrics, "AI sparkles", neumorphism, glassmorphism, purple-on-black gradient meshes, animated illustrated empty states, generic spinners (use skeletons).

### Density

Bloomberg / Linear-grade. Every tile must answer one question fully without click-through; click for depth, hover for methodology.

---

## 4. Layout — single-scroll, 12-column dark Bento

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER (sticky, 56px)                                                   │
│  [un-punt mark] [owner/repo]   [time range ▾]  [last sync · 2m ago]  [⚙] │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ZONE 1 — HERO (above the fold, ~440px tall)                             │
│  ┌──────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │  HERO TRIPLET     (8 cols)       │  │  LATEST SWEEP   (4 cols)      │ │
│  │                                  │  │                               │ │
│  │   captured  closed  net           │  │  2026-05-14-auth              │ │
│  │     14        23     -9 ✓        │  │  scope: src/auth              │ │
│  │   this week (7 days)              │  │                               │ │
│  │   ──────────────────────         │  │   3 fixed                     │ │
│  │   [sparkline 90d, captures ▼     │  │   2 flagged                   │ │
│  │    closes ▲]                     │  │   4 refused (rule 3, rule 5)  │ │
│  │                                  │  │   ─────────                   │ │
│  │                                  │  │   3 commits, all disposition- │ │
│  │                                  │  │   gated  ✓                    │ │
│  │                                  │  │   [view plan.md / report.md]  │ │
│  └──────────────────────────────────┘  └───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ZONE 2 — STATUS STRIP (5 tiles, leader-readable)                        │
│  ┌────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────┐ │
│  │ open   │ │ by type    │ │ refusal  │ │ median    │ │ calibration    │ │
│  │  87    │ │ donut: 6   │ │ density  │ │ capture→  │ │ tightenings    │ │
│  │ closed │ │ types      │ │   24%    │ │ close     │ │   3            │ │
│  │  31    │ │ TY 12      │ │ rules 3, │ │   4d 2h   │ │ since install  │ │
│  │ flagged│ │ DI 18      │ │ 5, 7     │ │           │ │                │ │
│  │  18    │ │ ST 7 …     │ │          │ │           │ │                │ │
│  └────────┘ └────────────┘ └──────────┘ └───────────┘ └────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ZONE 3 — AREA MAP (8 cols) + LATEST ACTIVITY (4 cols)                   │
│  ┌──────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │  ITEM-DENSITY TREEMAP            │  │  LATEST ACTIVITY              │ │
│  │  (directories sized by item      │  │  (most recent 20 lifecycle    │ │
│  │   count, colored by              │  │   rows across all items)      │ │
│  │   closed/open ratio)             │  │                               │ │
│  │                                  │  │  2026-05-14T14:32  capture    │ │
│  │  src/auth      ████  18 (33% ✓) │  │    up-7f3a · oauth.ts:142     │ │
│  │  src/billing   ██    9 (11% ✓)  │  │  2026-05-14T14:28  closed-via │ │
│  │  src/api/users █     4 (75% ✓)  │  │    up-aaaa · users.ts:42      │ │
│  │  pages/        ██    7 (43% ✓)  │  │  2026-05-14T14:11  refused    │ │
│  │  …                              │  │    up-ffff · oauth.ts (rule 3)│ │
│  │  hover → file list, click →     │  │  …                            │ │
│  │  drill into items                │  │  [view full lifecycle log]    │ │
│  └──────────────────────────────────┘  └───────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ZONE 4 — TRENDS (3 tiles, 4 cols each)                                  │
│  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐    │
│  │ Captures vs closes │ │ 30-day heat        │ │ Refusal density    │    │
│  │ — daily bars,      │ │ calendar           │ │ — % of items       │    │
│  │ sweep events as    │ │ (capture / sweep / │ │ refused, by week,  │    │
│  │ terracotta pins    │ │ refusal dots)      │ │ stacked by rule    │    │
│  └────────────────────┘ └────────────────────┘ └────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ZONE 5 — REFUSAL LOG (full width)                                       │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ EVERY REFUSED ITEM, BY RULE                                      │    │
│  │ rule 3 (auth)        4 items   src/auth/*                        │    │
│  │   up-ffff1111  oauth.ts:142  type-loosened                       │    │
│  │   up-ffff2222  jwt.py:18     deferred-implementation             │    │
│  │   …                                                              │    │
│  │ rule 5 (payments)    2 items   src/billing/*                     │    │
│  │ rule 7 (lockfiles)   1 item    pnpm-lock.yaml                    │    │
│  │ rule 2 (migrations)  1 item    backend/migrations/0042.sql       │    │
│  │ — these will never be auto-fixed; un-punt's safety floor.        │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ZONE 6 — CALIBRATION HISTORY (full width)                               │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ feedback.md → contract.md timeline                                │    │
│  │                                                                   │    │
│  │ 2026-05-08  feedback: "auth fix was too aggressive"               │    │
│  │             → contract: type-loosened/src/auth/**: 0.85 → 0.92    │    │
│  │ 2026-05-12  feedback: "duplicate test in two suites"              │    │
│  │             → contract: skipped-test caps.fix: 5 → 3              │    │
│  │ 2026-05-14  feedback: "the billing fix surprised me"              │    │
│  │             → contract: refuse: ["src/billing/charge.ts"] (added) │    │
│  │                                                                   │    │
│  │ — un-punt is monotone-tightening only. Nothing relaxes by itself. │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  ZONE 7 — RECEIPTS (full width, the trust-builder)                       │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ EVERY SWEEP COMMIT, TWO-RECEIPT FORMAT                            │    │
│  │                                                                   │    │
│  │ ▾ b3f1c2  Add pagination to /users endpoint                      │    │
│  │   Why this: up-aaaa1234. Endpoint was paginated in chat plan but │    │
│  │     left as `LIMIT 50` for the demo. Restore the cursor field.   │    │
│  │   Why now safe: vitest 142/142 ✓ · tsc clean · eslint clean      │    │
│  │     +12/-3 in src/api/users.ts                                   │    │
│  │                                                                   │    │
│  │ ▾ a82e5d  Tighten OAuthToken type at boundary                    │    │
│  │   Why this: up-bbbb5678. as any cast at oauth.ts:142 was         │    │
│  │     punted until refresh flow landed; refresh flow shipped       │    │
│  │     2026-05-12.                                                  │    │
│  │   Why now safe: vitest 142/142 ✓ · tsc clean · +5/-1             │    │
│  │                                                                   │    │
│  │ … filter [last 7d ▾]   sort by [confidence ▾]                    │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  FOOTER                                                                  │
│  source: github.com/<owner>/<repo> · last sync 2m ago ·                  │
│  un-punt v0.1 · install: /plugin install un-punt@un-punt                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Zone-by-zone rationale

### Zone 1 — Hero

Two tiles, paired: a **triplet counter** (captured / closed / net) and the **latest sweep card**. The triplet is monospace, large, terracotta-on-cream. The sweep card shows fix / flag / refused split with rule citations. Together they answer: "is the agent capturing? is anything getting finished? does the safety floor work?" — the three load-bearing questions.

Note what's *not* here: no `$ saved` counter (we can't honestly compute it), no live agent feed (un-punt isn't continuous), no Code Health score (we don't compute one), no "Claude's next targets" backlog (debt-billboard is read-only).

### Zone 2 — Status strip

Five tiles, no more (Datadog's anti-clutter rule, Tubik's 2026 guidance). Each: one number, one delta, one micro-detail.

The fifth tile — **calibration tightenings** — is the one no other tool ships and the one that tells the "skill learns from your team" story. Make it prominent.

### Zone 3 — Area map + latest activity

The research wanted a CodeScene complexity-×-churn circle-pack. We can't honestly draw that — we have no complexity data and no churn data outside what we infer from item lifecycle. So we ship the **lower-fidelity-but-honest** version: a treemap of directories sized by item count, colored by close ratio. It answers the same question (*where is the work concentrated?*) using only data we have.

The **latest-activity** tail is the closest legitimate analog to the research's "live agent feed." It's not live — it's the most recent 20 lifecycle rows from the items, refreshed on sync. Same shape (terminal-styled monospace, scrolling chronological), honest about cadence.

### Zone 4 — Trends

Three small tiles: captures-vs-closes daily bars (with sweep pins), 30-day heat calendar (GitHub-style), refusal density over time stacked by rule. The heat calendar is the most legible chart on the page; put it dead center.

### Zone 5 — Refusal log

This is **load-bearing for the un-punt narrative** — it is the "Refuse > Flag > Fix" trust contract made visible. Group every refused item by rule, show the rule label, the file pattern, and the item ID. The copy at the bottom — *"these will never be auto-fixed; un-punt's safety floor"* — frames refusal as a feature, not a limitation.

The research had no equivalent. This is unique to un-punt and it should be unmissable.

### Zone 6 — Calibration history

Also load-bearing, also unique to un-punt. Show the `feedback.md` resolved entries chronologically alongside the `contract.md` threshold diff each entry produced. The closing line — *"un-punt is monotone-tightening only"* — telegraphs the design constraint that differentiates from claude-mem and code-simplifier (neither of which has a calibration loop at all).

### Zone 7 — Receipts

The single most important zone in the whole page. Every sweep commit, with the two-receipt commit message excerpted. This is where a skeptical reader stops and goes "oh — they actually do this."

The format is non-negotiable: it must match `core/skill/reference/disposition-prompt.md` verbatim. Each row is collapsed by default (showing only the title); click expands to the `Why this:` / `Why now safe:` block.

The research's "Receipts" zone is the same idea applied to autonomous-remediation PRs. We're applying it to disposition-gated sweep commits, which is more honest about how un-punt actually works.

---

## 6. Interaction details

### Progressive disclosure, not audience toggle

Research recommended a header `audience ▾` dropdown. Reject — debt-billboard is a *public shared link*; the audience is mixed and self-selects. Instead:

- Every tile has a one-glance summary visible without click.
- Hover reveals methodology (e.g., on the triplet: *"captures = lifecycle rows with trigger=`capture` in last 7 days; closes = transitions to `closed-via-fix`"*).
- Click opens a modal or routes to a detail page (item drill-in, sweep drill-in, refusal-rule explainer).

### Hover-to-see-the-query

Each numeric tile shows, on hover, the exact glob / regex / lifecycle predicate that produced the number. This is the senior-engineer move from the research, applied honestly: we're not running SQL — we're parsing markdown. Show the parse rule.

### Keyboard

- `g h` → hero
- `g a` → area map
- `g r` → receipts
- `g c` → calibration
- `?` → shortcut sheet

Linear / Raycast pattern. Free win for the audience.

### `prefers-reduced-motion`

Disables all motion. Data must remain fully legible. No exceptions.

---

## 7. Empty states

Two real ones to design for:

1. **Repo has `.un-punt/` but zero items yet** (post-cold-start, no captures landed). Show a single line: *"No follow-ups captured yet on `<repo>`. The first capture will appear here automatically on next sync."* No illustrated robots. No "supercharge your codebase" copy.
2. **Repo has items but no sweeps yet** (typical week 1 state). Render zones 1–4 normally, gray out zones 5–7 with: *"No sweeps run yet — the first sweep's commits and refusals will appear here when one lands."*

Never show a generic "no data" placeholder. Always say specifically what would fill the empty space.

---

## 8. Anti-patterns (lifted from the research, applied to debt-billboard)

- ❌ Glassmorphism on tiles
- ❌ Pastel AI gradient backgrounds
- ❌ `Inter` font / rounded-blue primary buttons
- ❌ Animated AI sparkles or robot icons
- ❌ "Score out of 100" health gauge as the hero
- ❌ Per-developer leaderboards (un-punt has no contributor model anyway)
- ❌ Raw issue counts as KPIs (use status breakdown instead)
- ❌ "AI confidence" displayed as a primary number on individual fix tiles (un-punt's `confidence` is internal-to-the-skill; surface it on item drill-in only)
- ❌ Marketing-language tooltips ("supercharge your codebase!")
- ❌ The word *debt* anywhere in dashboard copy — use *deferred / cleanups / follow-ups / loose ends*

---

## 9. Out-of-scope for the dogfood (do NOT build)

The dogfood project is a single-repo public viewer. The following are tempting but explicitly out of scope:

- ❌ Multi-repo aggregation across an org
- ❌ Authenticated / paid private-repo support beyond what's needed to exercise refusal rule 3 + rule 5
- ❌ Webhook-driven live updates (poll on demand instead — `.un-punt/` is git-tracked, sync on-demand is honest)
- ❌ Any computed metric not derivable from the six data sources in §2
- ❌ A scoring algorithm that grades the user's repo (un-punt does not grade; it captures and finishes)
- ❌ Per-user / per-author attribution
- ❌ Embedding-based drift detection
- ❌ A "compare to industry P50" benchmark overlay (we have no industry data)

If the dogfood agent is tempted to build any of these, capture it as an `up-*` item under `type: deferred-implementation` and let un-punt handle it on a sweep. Do not extend the dashboard scope to escape the dogfood constraint — the constraint is the test.

---

## 10. Build stack (reuses the brief)

- **Charting**: `recharts` for line / bar / heat-calendar; `d3-hierarchy` for the treemap. No `visx` (drift toward research-y density).
- **Data layer**: `parse-frontmatter` for items + sweeps; small Python service that reads the GitHub repo via the GitHub REST API and exposes a `/repos/<owner>/<repo>/state.json` endpoint to the frontend.
- **Caching**: ETag-based on the GitHub repo's `.un-punt/` directory tree SHA. Refresh on a `?refresh=1` query param.
- **No database**. Render directly from the parsed JSON; cache in Redis or filesystem if needed.

Stay honest to un-punt's "no infrastructure" stance. The dashboard is a renderer, not a runtime.
