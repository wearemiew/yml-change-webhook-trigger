---
name: bug
description: Turn a bug report into a GitHub issue — reproduction steps, expected vs actual behavior, root cause if known, and acceptance criteria (no longer reproduces, plus a regression test). Adds it as a child issue of an in-flight feature's epic if the affected code is in that feature's scope; otherwise creates a standalone `bug`-labeled issue for `build` to pick up directly off `dev`. Use when the user reports something broken, a bug, a regression, or an error — not for new feature requests (use `to-prd` for those).
allowed-tools: Bash(gh issue view:*), Bash(gh issue list:*), Bash(gh issue create:*), Bash(gh issue edit:*), Bash(gh repo view:*)
---

Turn a bug report into a single actionable issue. This is deliberately lighter than the feature pipeline (`to-prd` → `grill-me` → `feature` → `to-issues`) — a bug doesn't need a PRD, a ballpark estimate, or design sign-off. It needs a clear repro, a likely cause, and a place to attach the fix.

## 1. Gather the report

Pull reproduction steps, expected vs actual behavior, and any error/stack trace from the conversation.

## 2. Explore for the likely cause

Read the parts of the codebase the symptom points to — do this before deciding what's still missing, since exploring often answers questions you'd otherwise have to ask (e.g. an error message matches one specific code path, or a recent commit/PR touched exactly this area). Identify the probable root cause and which top-level project directory it lives in. Do not fix anything here — this skill only files the issue, `build` implements the fix.

If, after exploring, critical details are still missing (how to reproduce it, what was expected), ask rather than inventing plausible-sounding repro steps — a bug issue with a guessed repro wastes whoever picks it up. If exploring turned up a likely cause or a specific reproduction path, lead with that as your best guess for the user to confirm rather than asking from scratch.

## 3. Check for an in-flight feature

Search open issues labeled `epic` (`gh issue list --label epic --state open`). If the affected code falls within one of those features' scope (its slices touch the same area), this bug belongs there as a child issue — it should branch from that feature's integration branch like any other slice, not from `dev`. Otherwise, it's a standalone bug.

## 4. Create the issue

```bash
gh issue create --title "Bug: TITLE" --body "BODY" --label "bug"
```

<issue-template>

## What's broken

One or two sentences on the symptom, from the user's perspective.

## Steps to reproduce

1. Step 1
2. Step 2

## Expected vs actual

- Expected: ...
- Actual: ...

## Root cause

What you found during exploration, if you found it. State "Unknown — needs investigation during `build`" rather than guessing if you didn't find it.

## Acceptance criteria

- [ ] The reproduction steps above no longer trigger the bug
- [ ] A regression test covers this case using the affected directory's documented test framework (see its `CLAUDE.md`)

## Severity

Low / Medium / High / Critical — how much user impact, not how hard the fix looks.

---
_(if part of an in-flight feature)_ Part of #EPIC · integration branch: `feat/<feature-branch>`

</issue-template>

If this bug is a child of an epic, also edit the epic's body to list it under the appropriate layer group, same as `to-issues` does for a new slice.

## 5. Report

Output the issue URL and whether it's standalone or a child of an existing epic. Tell the user the next step is running `build` against it — `build` will branch it off `dev` (`fix/<slug>`) if standalone, or off the feature's integration branch if it's a child issue.
