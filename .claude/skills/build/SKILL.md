---
name: build
description: Implement a GitHub issue end-to-end — draft a plan, get user approval/refinement, implement it, then add tests. Works for both a feature slice (produced by `to-issues`) and a standalone bug fix (produced by the `bug` skill). Use when user wants to build, implement, or pick up a GitHub issue, ticket, or bug.
allowed-tools: Bash(gh issue view:*), Bash(gh issue list:*), Bash(gh repo view:*), Bash(git checkout:*), Bash(git branch:*), Bash(git fetch:*), Bash(git pull:*)
---

Implement a single GitHub issue — a feature slice from `to-issues`, or a standalone bug from the `bug` skill — through four stages: **plan → approve/refine → implement → test**. Never skip straight to implementation.

A feature slice always branches from that feature's **integration branch** (created by the `feature` kickoff skill), never from `dev` directly — backend, frontend, and devops slices for the same feature all branch off, and merge back into, that shared integration branch, and only the integration branch merges into `dev`. A standalone bug fix branches directly from `dev` instead, since there's no feature it belongs to. See step 1b for how to tell which case you're in.

## 1. Gather the issue

If the user passed an issue number or URL:

```bash
gh issue view NUMBER --json title,body,labels,url
```

If not, run `gh issue list` yourself first and present the most relevant open candidates (matching what's currently under discussion, if anything) rather than asking a blind "which issue?". Read the issue's "What to build", "Acceptance criteria", and "Blocked by" sections. If it's blocked by an open issue, tell the user and confirm whether to proceed anyway.

## 1b. Identify the base branch

Which branch to base this on depends on whether the issue belongs to a feature or is a standalone bug:

- **Feature slice** (backend/frontend/devops label, linked to an epic): the tracking/epic issue that this issue links to (or is referenced by) records the integration branch name — check the issue body and its parent. If it isn't recorded there, run `git branch -a --list 'feat/*'` and check open `epic` issues for a plausible match before asking the user to name the feature branch outright. Do not assume `dev`. If the integration branch doesn't exist yet, stop and tell the user to run the `feature` kickoff skill first.
- **Standalone bug** (`bug` label, no epic reference — typically produced by the `bug` skill): base directly off `dev`. That's what makes it standalone rather than a feature slice; there's no integration branch to wait on.

Confirm the base branch exists on the remote before branching from it:

```bash
git fetch origin && git branch -a --list '*<base>*'
```

## 2. Explore

Read the parts of the codebase the issue touches. Identify existing patterns, conventions, and the files that will change. Do not write any code yet.

Identify which top-level project directory (or directories) the issue's files live under and **read that directory's own `CLAUDE.md`** if it has one — this repo is polyglot, there is no single "run the tests" command that works everywhere, so each project documents its own real test/lint/type-check commands and gotchas there. If a touched directory has no `CLAUDE.md` (new package, or it hasn't been documented yet), check its `package.json`/`.csproj`/CI config yourself, treat what you find as equally authoritative, and tell the user that directory is missing a `CLAUDE.md` so they can decide whether to add one.

If an issue spans multiple project directories, read each touched directory's `CLAUDE.md` — don't assume one project's conventions apply to another.

## 3. Plan (requires approval)

Enter plan mode. A plan that just restates the acceptance criteria isn't a plan — it has to show the actual shape of the change before a single line of code is written. Use this structure:

<plan-template>

# Plan: <Issue Title>

## Approach

One paragraph: the overall approach, and why — especially if there was a real alternative you considered and rejected (e.g. extending an existing entity vs. adding a new one).

## Acceptance criteria → implementation mapping

One entry per acceptance criterion from the issue:
- **Criterion**: <text from the issue>
  - **Change**: which specific files/functions/components/entities implement this
  - **Test**: which test (naming it, not just "add a test") verifies it, using the framework documented in the touched directory's `CLAUDE.md`

## File-by-file changes

- `path/to/file.ext` — what changes here and why
- `path/to/new_file.ext` (new) — what it does and why it's a new file rather than an addition to an existing one

## Data model / API / contract changes

Any schema, migration, DTO, or API contract changes, named explicitly (field names, types, endpoint shapes) — not "update the model," the actual shape of the update. If there are none, say so explicitly rather than omitting the section.

## Sequencing

The order you'll implement in, especially where one step blocks another (e.g. schema before endpoint before UI).

## Assumptions & open questions

Anything you're inferring rather than something the issue/PRD actually states — flag it here instead of guessing silently and finding out you guessed wrong mid-implementation.

## Out of scope

Anything adjacent this plan deliberately does not do, so the reviewer isn't surprised by an omission later.

</plan-template>

Ground the "File-by-file" and "Data model" sections in what you found during step 2's exploration — name the actual entities/files/types that exist today, not generic descriptions, so the reviewer can tell this plan is based on the real codebase rather than a plausible-sounding guess.

Present the plan for approval. If the user requests changes, revise and re-present — repeat until they approve. Do not proceed to implementation on an unapproved or partially-approved plan.

## 4. Branch

Once the plan is approved, cut a branch from the base identified in step 1b — the naming convention depends on which case you're in:

- **Feature slice**: from the integration branch, never from `dev` directly. Pattern is `feat/<feature-branch>/<task>` — the task slug should describe the slice well enough on its own (e.g. `endpoint-export-csv`, `organizations-page`) that an explicit layer code isn't needed. Example: feature branch `referralcodes` + a backend CSV export endpoint → `feat/referralcodes/endpoint-export-csv`; its frontend counterpart (a button triggering that export) → `feat/referralcodes/button-csv-export`.
- **Standalone bug**: from `dev` directly, named `fix/<slug>` — matching the `fix/` branch prefix this repo's PR auto-labeler already expects for the `bug` label.

```bash
git fetch origin && git checkout <base-branch> && git pull && git checkout -b <new-branch-name>
```

## 5. Implement

Follow the approved plan step by step. Match existing code conventions found during exploration.

As you write code, run the type-check and lint commands documented in the touched directory's `CLAUDE.md` (or the ones you found yourself, if it had none) after each meaningful change rather than waiting until the end. When they surface a type mismatch, compilation error, or lint failure, read the trace and self-correct immediately — don't stop to ask about something the tools already told you how to fix. The only reason to pause and check with the user is if reality diverges from the plan in a way that changes **scope** (a requirement turns out to need a different approach, an acceptance criterion can't be met as planned, an assumption from the plan was wrong) — mechanical errors are yours to fix autonomously, scope changes are the user's call.

## 6. Test

For each acceptance criterion, add or update a test that exercises it using the test framework and conventions documented in that directory's `CLAUDE.md`. Don't introduce a different framework or invent a layer of testing (e.g. unit tests) that isn't part of that project's documented convention (e.g. E2E-only).

Run the full test command documented for that directory (not a partial/single-test run) and treat failures the same way as compiler/lint errors in step 5: read the failure, fix the code (or the test, if the test was wrong), and re-run — iterate autonomously until the suite passes rather than surfacing the first failure to the user. If that directory's `CLAUDE.md` notes that CI doesn't gate on tests, treat this step as the real enforcement and don't skip or shortcut it because "the diff looks right."

If the touched directory's `CLAUDE.md` (or your own check) says it has no test framework, don't silently skip this step or silently add a framework — tell the user in your final report that the acceptance criteria could only be verified manually, and ask whether to scaffold minimal testing now or file it as separate follow-up.

Once done, go through the acceptance criteria checklist explicitly and confirm each one is verifiably met (by test, or by manual check if the criterion isn't testable in code).

## 7. Handoff

This skill's job ends with working, tested code left uncommitted in the working tree — it does not commit, push, or open a PR under any circumstances, approval or not. Committing, pushing, and opening the PR are for the user (or a separate step) to do. Before that PR opens, suggest running the `qa` skill against this slice — it catches security/performance/maintainability issues and deviations from the acceptance criteria that this skill's own step 6 doesn't check for.

Report to the user:
- The acceptance-criteria checklist with how each one was verified.
- The files changed (a `git status`/`git diff --stat` summary is enough, don't dump the full diff unless asked).
- A suggested commit message in Conventional Commits format referencing the issue (e.g. `Closes #NUMBER` in the body), for them to use if they want it.
- A reminder of where the PR should target when they open it: the integration branch (`--base <feature-branch>`) for a feature slice, or `dev` directly for a standalone bug fix — either way with labels matching the changed paths and branch prefix per `.github/labeler.yml`, and if this is a frontend slice blocked by its backend counterpart, noting that dependency in the PR body.
