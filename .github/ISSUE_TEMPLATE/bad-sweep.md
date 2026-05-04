---
name: Bad sweep
about: Report a sweep that produced wrong, unsafe, or surprising changes
title: "[bad-sweep] "
labels: ["bad-sweep"]
---

## What happened

<!-- One sentence summary. e.g. "un-punt deleted a function that wasn't actually dead." -->

## Sweep ID + sweep dir

<!-- Run `un-punt status` in the repo, or look at `.un-punt/sweeps/`. Paste the dir name like `2026-05-12T10-23` -->

## What you expected

<!-- What you thought un-punt should have done with this item, or what category you expected it to land in (refused / flagged / fixed). -->

## What actually happened

<!-- The diff, the commit message, the report.md entry, or the wrong action. Paste relevant excerpts; redact anything sensitive. -->

## Repo / language / tooling

- Language(s): <!-- TS, Python, Go, Rust, Java, mixed -->
- Test/verifier: <!-- vitest / jest / pytest / go test / rust test / none -->
- Claude Code version: <!-- run `claude --version` -->
- un-punt version: <!-- run `un-punt --version` -->
- Install path: <!-- `npx un-punt install` / `/plugin install un-punt@un-punt` / manual -->

## Was anything else unusual?

<!-- e.g. running with `--dangerously-skip-permissions`, using a non-default Claude model, working tree had uncommitted changes, etc. -->

## What did you do to recover?

<!-- e.g. ran `git reset --hard`, picked option 3 (separate branch), revised the contract.md, added a `feedback.md` line. -->

---

> Thanks for the report. Bad sweeps are the highest-priority signal we have — they directly drive contract.md / refusal-list updates. We aim to triage within 24h.
