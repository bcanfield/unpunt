# un-punt Launch Plan

> One-day, everywhere-at-once push to maximize GitHub stars at MVP launch. Generated from research; refine before executing.

Goal: maximize stars in a single coordinated push the day MVP ships. Audience: AI-coding power users (Claude Code / Codex / Cursor) **and** generalist devs with tech debt. No phased rollout — every channel fires within ~12 hours of T-0.

Launch on a **Tuesday or Wednesday**. All times Pacific.

---

## 0. Launch-day timing skeleton

| Time (PT) | Action |
|---|---|
| 12:01 AM | Product Hunt goes live (full 24h cycle starts here) |
| 5:00 AM | X thread + Bluesky + Mastodon + LinkedIn (European morning) |
| 6:30 AM | Show HN posted (5–7 AM PT / 8–10 AM ET is the front-page window) |
| 7:00 AM | Reddit posts go out, **rewritten per sub, staggered 6+ hours apart** |
| 9:00 AM | dev.to + Hashnode + personal blog "Why" post live, canonical → blog |
| 10:00 AM | Newsletter + podcast + influencer outreach DMs/emails sent |
| All day | Reply within 15 min to every comment for first 3 hours — biggest algorithmic lever |

Never launch Friday or Monday. Tue–Thu only.

---

## 1. Free posting venues

### 1.1 Hacker News (Show HN) — single highest-leverage venue

- **Title:** `Show HN: un-punt – a Claude Code skill for managing tech debt` (en-dash, no emoji, no clickbait)
- **Timing:** Tue/Wed/Thu 8–10 AM ET. Sun midnight–1 AM PT is a low-competition alt slot.
- **First comment by OP within 60 seconds:** what it does, *why* (no DB, no MCP, no daemon, just files — HN catnip), install one-liner, ask: "Would love feedback on the convention."
- **Penalties:** marketing framing, asking for upvotes, asking for stars in comments, voting rings (silent permanent shadowban).
- **Never** buy upvotes or use boost services. Permanent IP ban.

### 1.2 Reddit

Build karma in target subs **2 weeks pre-launch** (helpful comments, no links). Write a *different post per sub* — Reddit's spam filter detects identical text across subs. Stagger 6+ hours.

| Subreddit | Subs | Posture | Angle |
|---|---|---|---|
| r/ClaudeAI | ~750k | Tolerant | "Claude Code skill — no DB, no MCP, just files" |
| r/cursor | ~250k | OK if agent-agnostic | "Filesystem convention works with any agent" |
| r/ChatGPTCoding | ~250k | Tolerant | Workflow comparison |
| r/programming | ~3.7M | Hostile to repo links | Submit *blog URL only* |
| r/SideProject | ~380k | Encouraged | Direct ship post |
| r/opensource | ~250k | OK if OSS | Lead with license + CONTRIBUTING |
| r/coolgithubprojects | ~120k | Designed for this | Repo + 1-line desc |
| r/commandline | ~150k | Welcome | Asciinema demo |
| r/devtools | ~30k | Tolerant | Show-and-tell |
| r/aipromptprogramming | ~50k | Welcome | Direct |
| r/AI_Agents | ~150k | Welcome | "Agent infra" |
| r/vibecoding | growing | Encouraged | Native post |
| r/devops | ~480k | Tooling-friendly | IaC-adjacent |
| r/typescript | ~430k | OK if TS foregrounded | Build-setup blog |
| r/webdev / r/javascript / r/node | huge | Strict | Skip unless real angle |
| r/MachineLearning, r/learnprogramming, r/ExperiencedDevs, r/OpenAI, r/LocalLLaMA | — | **Skip** | Wrong audience or no self-promo |

### 1.3 Lobsters (lobste.rs)

Invitation-only. Path in: join `#lobsters` on Libera.Chat IRC, introduce yourself, ask politely. Or have someone submit your blog post and ask in comments. Tag: `show`. Higher comment quality than HN — README must be bulletproof.

### 1.4 Blogging platforms

Write the post on your own blog. Mirror to **dev.to**, **Hashnode**, **Medium / Better Programming** with `canonical` set to your blog. Tags `#claudecode #opensource #devtools #ai`. First 6 hours on dev.to drive the feed.

### 1.5 Product Hunt

- **Time:** 12:01 AM PT. Tue/Wed for max upvotes; Sat for low-competition #1.
- **Hunter:** self-hunting fine in 2025+. If wanted: Kevin William David, Kat Manalac, Chris Messina, Bram Kanstein.
- **Pre-launch teaser** ("Coming Soon") — minimum 2 weeks before, auto-notifies followers at launch.
- **Tagline ≤60 chars:** "AI-assisted tech debt, as plain files."
- **Assets:** install GIF, 240×240 logo, 4–6 gallery shots, 30s video.

### 1.6 GitHub-native

- **Trending threshold:** ~80–150 stars in 24h triggers TypeScript trending. HN front page + Reddit + PH + one Theo/Simon tweet clears it.
- **Awesome-list PRs (open all on launch day):**
  - `hesreallyhim/awesome-claude-code` (canonical)
  - `jqueryscript/awesome-claude-code`, `travisvn/awesome-claude-skills`
  - `ComposioHQ/awesome-claude-skills`, `ComposioHQ/awesome-claude-plugins`
  - `webfuse-com/awesome-claude`, `rohitg00/awesome-claude-code-toolkit`
  - `quemsah/awesome-claude-plugins`, `sindresorhus/awesome` (high bar)
  - `agarrharr/awesome-cli-apps`, awesome-developer-tools, awesome-ai-tools
- **Repo Topics:** `claude-code`, `codex`, `tech-debt`, `cli`, `ai-coding`, `claude`, `anthropic`, `developer-tools`, `plugin`
- **Claude Code official plugin marketplace** — non-negotiable when listed

### 1.7 Curated link / news sites (free, pitch all)

Console.dev, Changelog News (community Slack), Pointer, Hacker Noon, FreeCodeCamp News, CSS-Tricks, TLDR tip-line (`tldr.tech/tips`), daily.dev (auto-pulls if OG image set).

### 1.8 Aggregators (low effort, ~2 hrs)

BetaList, Indie Hackers (#show-ih), Launching Next, Startup Stash, SaaSHub, AlternativeTo, TinyLaunch, MicroLaunch, Uneed, BetaPage, Crozdesk, ToolFinder.xyz, Toolify.ai, There's An AI For That, StackShare, Hashnode listing.

---

## 2. AI-coding-specific channels (highest priority)

### 2.1 Discords

- **Anthropic Discord (official)** — `#claude-code`, `#projects-and-builds`. Anthropic staff read; one staff retweet is a 10× amplifier.
- **Cursor Discord** — `#showcase`. Lead with agent-agnostic angle.
- **Aider Discord** — `#show-and-tell`. Closest temperament match for un-punt's anti-infra stance.
- **Continue.dev Discord** — small, OSS-friendly.
- **Latent Space Discord** — invite via newsletter signup. swyx + Alessio reachable via thoughtful DM.
- **MLOps Community, GenAI Stack, AI Engineer Foundation Discords**

### 2.2 Newsletters / blogs to pitch (free)

- **Simon Willison** (simon@simonwillison.net) — covers Claude tooling. Pitch the *technical* one-pager (design decisions, not marketing). Brevity counts.
- **Latent Space newsletter** — pitch swyx via X DM or Discord. Frame as guest essay on "why we deliberately did *not* build infrastructure."
- **Every.to / Dan Shipper** — contact form
- **Ben's Bites** (~100k subs) — tip form
- **The Rundown AI** (~700k), **TLDR AI**, **AI Tidbits, The Neuron, Mindstream, Smol AI News, AlphaSignal**

### 2.3 X accounts to put on radar (DM, do not mass-tag)

@theo (t3.gg), @simonw, @swyx, @charliebholtz, @steipete, @TheZvi, @AlexAlbert__ (Anthropic DevRel), @kentcdodds, @adamwathan, @shadcn, @dhh.

Send 4–6 *individualized* DMs on launch day with a 30s video and one paragraph of why this is interesting *to them specifically*. Mass-tagging in tweets backfires.

### 2.4 HuggingFace

If you have an eval dataset/artifact, push as a Space or Dataset and cross-link from README. Modest traffic, real credibility.

---

## 3. Social platforms

### 3.1 X / Twitter — thread structure (8–12 tweets)

1. Hook + 30s loom/GIF (single sentence)
2. Problem
3. Deliberate non-solutions (no DB/MCP/daemon — contrarian hook)
4. Mechanism + diagram
5. Demo (Asciinema GIF)
6. Install one-liner
7. Why this beats alternatives
8. What's next + repo link
9. Single polite "if this resonates, ⭐" ask

Hashtags `#ClaudeCode #buildinpublic` in last tweet only. Reply within 15 min for first 3 hours. Pin thread for 1 week.

**Building-in-public amplifiers:** @arvidkahl, @marc_louvion, @levelsio, @cassidoo, @Steve8708 — engage authentically in weeks before launch.

### 3.2 LinkedIn

Native post (no link in body — links suppress reach). GitHub URL in first comment. 1500–2000 chars, generous line breaks. Counter-conventional first line: "We deliberately did NOT build a database for our tech debt tool." Post to feed first, then share into "AI in Software Development" (~300k), "Software Engineering Leaders" (~150k), Open Source groups.

### 3.3 Bluesky

Join developer starter packs (770+ exist). Higher organic reach than X for low-follower accounts. Tag @simonwillison.net, @swyx.io.

### 3.4 Mastodon

**fosstodon.org** (FOSS, request invite) or **hachyderm.io** (techy, no invite). Hashtags `#ClaudeAI #OpenSource #DevTools #CLI #FOSS`.

### 3.5 Threads / YouTube Shorts / TikTok

Threads: 20 min max, cross-post compressed thread. Shorts/TikTok: skip on day 1. What matters is one good 30–60s screen recording for tweets/README. Put on YouTube as a regular video, link everywhere.

---

## 4. Newsletters & podcasts

### 4.1 Free coverage (pitch all)

TLDR (Web Dev / AI / Founders), Pointer, Console.dev, Software Lead Weekly (~31k), JavaScript Weekly, Node Weekly (Cooperpress), Bytes.dev (~150k), CSS-Tricks, Refactoring (Luca Rossi), Dev Tools Digest, ByteByteGo. **Pragmatic Engineer** doesn't take sponsorships — earn coverage via brilliant blog post or podcast slot.

### 4.2 Paid newsletter sponsorship — 2025/26 rates

| Newsletter | Subs | Cost | Notes |
|---|---|---|---|
| TLDR (main) | ~1.25M | **$15k** primary / $10k secondary / $5k tertiary | Dilutes for AI-dev tools |
| TLDR AI | ~250k | $5k–$8k | Better targeting |
| TLDR Web Dev | ~150k | $3k–$5k | Good fit |
| Bytes.dev | ~150–200k | $3k–$6k (est.) | JS-focused |
| Pointer | ~30k | $1.5k–$3k (est.) | Eng-leadership |
| Console.dev | ~40k | $1.5k–$3.5k (est.) | Highly targeted |
| Software Lead Weekly | ~31k | $1k–$2.5k (est.) | Eng leaders |
| Refactoring (Luca Rossi) | ~70k | **$2k primary / $800 secondary / $5k guest post** | High intent |
| JS Weekly / Node Weekly | ~280k / ~120k | $3k–$7k each (est.) | Cooperpress |
| Ben's Bites | ~100k | **$2k primary / $1.2k tools / $200 unclassified** | AI focus |
| The Rundown AI | ~700k | high four–low five figures | Mass-market dilutes |
| Hacker Newsletter | ~45k | ~$1.5k | Curated weekly HN |

**Rule of thumb:** dev-newsletter CPMs $40–60 vs. general-tech $10–25. For $10–20k, two well-targeted dev placements (Bytes + Refactoring + Console.dev secondary) outperform one TLDR primary.

### 4.3 Podcasts

- **Latent Space** (top-10 US tech) — pitch swyx via X DM. Best fit for un-punt; eval-harness angle is on-theme.
- **The Changelog** — news@changelog.com. Mid-four-figure per ep typical.
- **Syntax.fm, JS Party** — show contact forms.
- **Pragmatic Engineer Podcast** — limited slots, editorial fit matters.
- **AI Daily Brief, AI Engineer Podcast, Practical AI**

Top-tier dev podcast ad reads: $1.5k–$5k per episode.

---

## 5. Paid promotion

### 5.1 Channel ROI

| Channel | Cost | Notes |
|---|---|---|
| EthicalAds (dev) | $1k min, ~$5 CPM. 10% off at $3k, 15% off at $25k | Privacy-first, dev-targeted. Excellent fit |
| Carbon Ads | ~$0.50–$1.10 publisher CPM, ~$1.5–3k min | Premium dev-design audience |
| Reddit Ads | $1–$2 CPC for r/webdev/devops; top-50 sub CPMs $3.50–$15. ~$5/day min | 4–12× cheaper than LinkedIn. Target r/programming, r/ClaudeAI, r/cursor, r/SideProject, r/devtools |
| X/Twitter Ads | $5–$15 CPM, $0.50–$3 CPC | Boost the launch thread; skip generic follower ads |
| Google Search | $2–$8 CPC for "tech debt tool"; cheaper long-tail | Bid on "claude code skill", "claude code plugin", competitor names. $200/day cap |
| LinkedIn Ads | $8–$12 CPC dev targeting | Expensive; only for eng-mgmt ICPs |

### 5.2 Influencer / creator sponsorships (YouTube dev niche $15–$25 CPM)

| Creator | Audience | Per video sponsor read |
|---|---|---|
| Fireship | 3.9M YT | $20k–$40k (est.) |
| ThePrimeagen | ~500k YT + ~290k Twitch | $5k–$15k YT; $3k–$8k Twitch |
| **Theo (t3.gg)** | ~500k YT, 3M+ views/mo | **$4k–$10k**; t3.gg/sponsor-me |
| Web Dev Simplified | ~1.5M | $8k–$20k |
| Kent C. Dodds | ~150k YT + course/email | $3k–$8k |

**Theo and ThePrimeagen are the highest-fit for un-punt** — their audience *is* AI-coding power-users with tech debt. One Theo video would likely outperform a TLDR primary on stars-per-dollar.

### 5.3 Money traps — never spend on

- Reddit upvote / boost services → silent permanent shadowban
- HN upvote-buying → permanent IP ban
- Star4Star groups → GitHub detects, retroactively removes stars
- Product Hunt promoted launches → modest ROI vs. organic + hunter
- HN ads → HN does not sell ads. Anyone offering them is a scam
- GitHub Sponsors / OpenCollective for amplification → these are inbound revenue; set up pre-launch for legitimacy, not for star-driving

---

## 6. Star conversion (eyeballs → stars)

Launch traffic converts 2% (mediocre README) to 8% (top-tier). README is your single biggest lever.

### 6.1 README structure

1. One-line tagline
2. **30s demo at the very top** — Asciinema (CLI-native) or 2–4 MB GIF (vhs / charm / terminalizer)
3. Badges — 4 max: build, version, license, stars
4. **One-line install** — nothing earns stars like a 5-second install that works
5. **Why** — 100 words on philosophy (no DB, no MCP server, no LLM classifier)
6. Quick start — 3 commands max
7. Compare table vs. Linear/Jira/GitHub Issues + custom CLAUDE.md notes
8. How it works — `.un-punt/` directory shown
9. Star history chart (only embed *after* ~50 stars)
10. Used by / testimonials — pre-load 5 friend-developer quotes
11. Contributing + License

"Star us if…" CTA fine in your own README and tweets. **Not** fine in HN or Reddit comments.

### 6.2 Other levers

- Social preview image (1280×640) — Settings → General. ~30% click-through lift.
- Repo About — description, website, all topics, tagged release v0.1.0
- Pinned issue: "Welcome — start here" with curated good-first-issues
- Landing page (un-punt.dev): only if it doesn't delay launch. README is the landing page in 2026
- Discord server — start *before* launch, link from README. Even empty signals legitimacy

### 6.3 GitHub trending

~80–150 stars in 24h triggers TypeScript trending. Once trending, 12–24h secondary surge from the trending page itself. Don't celebrate — push more content T+1 day to capitalize.

---

## 7. Pre-launch checklist

### T-2 weeks
- README polish per §6.1
- LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, issue/PR templates
- CI green + badge
- `package.json` keywords (npm SEO)
- Reserve handles: X, Bluesky, GitHub org, npm, Discord; un-punt.dev domain
- BetaList submission (4–6 week lead)
- Product Hunt "Coming Soon" page live
- Build X follower base: 3–5 build-in-public threads
- Build karma in target subreddits
- Join all Discords; observe norms

### T-1 week
- Demo video / GIF cut (vhs ideal for CLI)
- "Why" blog post drafted — filesystem-as-convention essay
- dev.to / Hashnode cross-post drafts (canonical → blog)
- Press one-pager (PDF + Notion)
- Newsletter editor email list — 30 personalized one-paragraph emails
- Influencer DM list (~30 X handles)
- 5–10 trusted devs primed to ⭐ + comment **organically** (don't coordinate text — that's a voting ring; just give them the timing window)
- Private rehearsal: post a "test" Show HN draft to a private gist; have 2 friends critique title + first comment

### T-1 day
- All accounts logged in across machines
- Social preview images uploaded
- First-comment text drafted for HN, Reddit (per sub), PH, dev.to
- Outreach emails queued, scheduled 10 AM PT launch day
- Discord posts drafted per server
- Sleep early

---

## 8. Anti-patterns

- Identical text across subreddits within hours → spam filter, shadowban. Stagger 6+ hours, rewrite each.
- Asking for stars in HN comments → downvoted, erodes account standing
- Buying upvotes → silent permanent bans
- Coordinated voting rings → all detected
- Mass-tagging Anthropic / Cursor staff → muted
- Friday/weekend launch → wasted shot
- README without demo above the fold → 50%+ conversion loss
- Burning the one Show HN window with a half-baked title
- No follow-up post for T+1 day → wave wasted

---

## 9. Budget allocations

### $15k

| Line | Spend |
|---|---|
| Theo (t3.gg) sponsored video | $6,000 |
| Refactoring newsletter primary | $2,000 |
| Console.dev or TLDR Web Dev secondary | $2,000 |
| EthicalAds 2-week campaign | $2,000 |
| Reddit promoted post (r/programming + r/devtools) | $1,500 |
| Google Ads on competitor / category keywords | $1,000 |
| Reserve | $500 |

- **$5k:** drop Theo; do Refactoring + Console.dev + EthicalAds + Reddit Ads.
- **$50k:** add Fireship, JS Weekly primary, podcast ad-read sweep (Latent Space + Changelog + Syntax).

---

## 10. Post-launch (T+1 to T+14)

- **T+1:** "What I learned launching un-punt: 24 hours, X stars, Y issues" — drives second HN/Reddit cycle
- **T+3:** Reach out to interesting starrers for testimonials
- **T+7:** First real release with addressed feedback. Tag everyone who filed an issue
- **T+14:** Pitch lessons-learned post to Pragmatic Engineer / Software Lead Weekly / Refactoring as guest post

---

## Net recommendation

Lock a Tue/Wed launch. Spend disproportionate time on AI-coding Discords + Theo/Simon/swyx outreach (warmest audience by far). Run the generalist push (HN/PH/Reddit) the same morning. If spending money: **Theo > Refactoring > EthicalAds > Reddit Ads**, in that order.
