---
name: qa
description: Run a structured, multi-pass QA review — on a single slice branch or standalone bugfix branch right after `build` hands it off, or on a feature's integration branch end-to-end before it merges into dev. Checks deviations from acceptance criteria, security, performance, correctness/maintainability, and integration, then loops fix → re-review until clean or capped. Use after build finishes a slice or bug fix, or before merging a feature's integration branch into dev.
allowed-tools: Bash(gh issue view:*), Bash(gh issue list:*), Bash(gh issue edit:*), Bash(gh pr view:*), Bash(gh pr comment:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git fetch:*)
---

Review a diff against the acceptance criteria it's meant to satisfy, across five passes: deviations, security, performance, correctness & maintainability, and integration. This skill never fixes code and never merges anything — findings go back to whoever owns the code (`build`, for a slice) or to the user; a clean result unblocks the next step (opening a PR, or merging the integration branch to `dev`) without performing it.

## 1. Determine scope

Three modes, auto-detected from what's being reviewed:

- **Slice-level**: a single issue (backend/frontend/devops label, linked to an epic) and its slice branch — this is what `build` just produced for a feature. Diff is that slice branch against the integration branch it branched from.
- **Bugfix-level**: a standalone bug issue (`bug` label, no epic reference — typically from the `bug` skill) and its `fix/<slug>` branch. Diff is that branch against `dev` directly.
- **Feature-level**: a whole feature's integration branch, reviewed end-to-end against `dev` before it merges — this is the "Feature validated end-to-end against the PRD acceptance criteria" line in the epic's Definition of Done that nothing else in this pipeline does.

If the user gives an issue number labeled `bug` with no epic reference, treat it as bugfix-level. If they give an issue labeled backend/frontend/devops linked to an epic, or a slice branch matching `feat/<feature-branch>/<task>`, treat it as slice-level. If they give an epic number, a feature slug, or the bare integration branch name (`feat/<feature-branch>`), treat it as feature-level. If they gave nothing more specific than "review my changes," check `git branch --show-current`, `gh issue list`, and any open PR for the current branch — that's usually enough to resolve scope without asking. Only ask if the repo state genuinely doesn't disambiguate it, and when you do, offer the specific candidates you found rather than a generic "which one?".

## 2. Gather acceptance criteria and the diff

- **Slice-level**: read the issue's "Acceptance criteria" section. Diff = `git diff <integration-branch>...<slice-branch>`.
- **Bugfix-level**: read the bug issue's "Acceptance criteria" (reproduction no longer occurs, regression test exists). Diff = `git diff dev...<fix-branch>`.
- **Feature-level**: read the epic issue to find the integration branch and every child issue; fetch each child issue's "Acceptance criteria" — the full set is what "end-to-end" means here. Diff = `git diff dev...<feature-branch>`.

Also read the `CLAUDE.md` of every top-level project directory the diff touches (same discovery approach as `build` step 2) — several of the passes below check the diff against conventions documented there, not against generic best practice.

## 3. Run the five review passes

Go through the diff once per pass below. Don't blend them into one generic read-through — each pass has a different failure mode it's looking for, and reading with one question in mind at a time catches things a single pass misses. For every finding, record: severity (**Critical** / **High** / **Medium** / **Low**), file:line, and a one-line explanation of the concrete failure it causes (not just "this looks off").

<pass name="Deviations">
Compare the diff against every acceptance criterion gathered in step 2. Flag anything not implemented, partially implemented, implemented differently than specified without a documented reason, or silently descoped. This is the pass generic code review skips — it's specific to this pipeline having real, structured acceptance criteria to check against.
</pass>

<pass name="Security">
Injection risks (SQL/command/template), missing authn/authz checks on new endpoints or actions, secrets or credentials committed in code or config, unsafe deserialization, unvalidated input crossing a trust boundary (client input, external API responses, file uploads), and any new dependency worth flagging for provenance.
</pass>

<pass name="Performance">
N+1 queries, unbounded loops or payloads over collections that can grow, missing pagination or indexes on new queries, blocking I/O on a hot/request path, and missing caching where the surrounding code already establishes that pattern.
</pass>

<pass name="Correctness & maintainability">
Logic bugs, unhandled edge cases and error paths, dead code introduced or left behind, naming/structure inconsistent with the conventions documented in the touched directory's `CLAUDE.md`, and test coverage that doesn't actually exercise the acceptance criteria it claims to (shallow assertions, tests that would pass even if the feature were broken).
</pass>

<pass name="Integration">
Slice-level: does this change conflict with or break other code paths, contracts, or tests already in the repo. Feature-level: do the slices' contracts actually line up with each other — does the frontend's API usage match what the backend slice actually returns, do devops prerequisites (env vars, provisioned infra) actually exist for what backend/frontend assume, are there gaps between slices that only show up when they're combined.
</pass>

## 4. Handle findings — fix/re-review loop

If all five passes come back clean (or only Low/informational findings), skip to step 5.

If Critical/High findings surfaced: report them grouped by pass, then ask whether to loop — hand the findings back to whoever owns the code (`build`, if this is a slice still in flight; otherwise the user) to fix, then re-run all five passes on the updated diff. Cap this at 3 automatic loops; if it's still not clean after that, stop and hand the full finding history to the user rather than looping indefinitely — a review that never converges is telling you something the loop itself can't fix.

## 5. Report and unblock the next step

- **Slice-level, clean**: tell the user this slice is ready for its PR into the integration branch. Don't open the PR — that's `build`'s handoff, not this skill's.
- **Bugfix-level, clean**: tell the user this fix is ready for its PR directly into `dev`. Don't open the PR.
- **Feature-level, clean**: offer to check off "Feature validated end-to-end against the PRD acceptance criteria" on the epic issue (`gh issue edit`) once the user confirms, and tell them the integration branch is ready to merge into `dev`. Merging it is out of scope here, same as it is for `feature` and `build`.
- **Any scope, not clean after the loop cap**: report the outstanding findings by severity and stop — don't tick anything or imply readiness.

Summarize: scope reviewed, findings per pass, number of fix/re-review loops run, and the final verdict.
