---
name: to-issues
description: Break an already-grilled, design-signed-off PRD into independently-grabbable GitHub issues using tracer-bullet vertical slices, added to the epic that `feature` already created. Use when user wants to convert a PRD into issues, create implementation tickets, or break down work into issues, after the feature's design-tracking issue has closed.
allowed-tools: Bash(gh api graphql:*), Bash(gh repo view:*), Bash(gh issue create:*), Bash(gh issue list:*), Bash(gh issue view:*), Bash(gh issue edit:*)
---

Break the PRD into independently-grabbable GitHub issues using vertical slices (tracer bullets), and add them to the epic that `feature` already set up for this feature.

## Process

### 1. Gather the PRD, epic, and design issue

If the user passes a GitHub Discussions URL or discussion number, fetch the PRD body from it:

```bash
gh api graphql -f query='query($owner:String!,$repo:String!,$number:Int!){
  repository(owner:$owner,name:$repo){
    discussion(number:$number){ title body }
  }
}' -f owner="OWNER" -f repo="REPO" -F number=NUMBER
```

Otherwise, work from whatever PRD content is already in the conversation context.

This skill runs after `feature` has already created the epic and design issue for this feature — find them rather than creating a fresh epic. If the user gives an epic number, use it directly (`gh issue view NN`); otherwise search for the `epic` issue whose title matches the feature name (`gh issue list --label epic --state all`). Read the epic body to find the integration branch name and the design issue number.

### Check design sign-off

Fetch the design issue (`gh issue view NN --json state,body`). If it's still open, stop and tell the user dev tickets can't be cut until the design issue is closed with real Figma frame links — this is the whole point of moving design onto its own issue instead of a PRD placeholder. If the user explicitly wants to proceed anyway (e.g. backend-only work that doesn't touch UI), confirm that with them before continuing.

Once closed, read the Figma frame links from the design issue's body — that's the source of truth for anchoring, not the PRD.

### 2. Explore the codebase

If you haven't already, explore the repo to understand the current state of the code. Issue titles and descriptions should use the project's domain vocabulary and respect any existing architectural patterns.

### 3. Draft vertical slices

Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL layers end-to-end — NOT a horizontal slice of one layer.

<vertical-slice-rules>
- Group by **user action** — one issue per distinct thing a user can do. Map directly to user story groups in the PRD.
- Each slice delivers a complete path through every layer (schema, API, UI, tests) for that action
- A completed slice is demoable or verifiable on its own
- Label each slice as **frontend**, **backend**, or **devops**
- The "one issue per user action" rule applies to **frontend and backend equally**. Never bundle multiple user actions into one backend issue — each action gets its own backend issue and its own frontend issue.
- When a user action requires both layers, produce two issues: one backend + one frontend. The frontend issue is blocked by its backend counterpart.
- Use layer-specific vocabulary in titles: backend issues use words like "endpoint", "API", "schema", "policy"; frontend issues use "page", "form", "component", "view"; devops issues use "provision", "pipeline", "env var", "deploy".
- Schema / content type setup and ownership policy are infrastructure that other issues depend on — treat them as their own backend issue(s) that everything else blocks on, not something to bundle into the first CRUD endpoint.
- **Isolate DevOps work into its own tickets.** Infrastructure provisioning, migrations, and environment-variable setup are never a line item inside a backend or frontend issue — they get their own devops issue(s) that the relevant backend/frontend slices are blocked by. This is what lets a systems engineer pick up devops work in parallel instead of waiting on backend/frontend to surface it mid-implementation.
- **Group edits by entity, not by field.** If the PRD lists multiple editable fields on the same entity (e.g. edit title, edit description, edit status), collapse them into a single issue: "Edit [Entity]". Do NOT create one issue per field.
- **Never merge create operations.** Each "Create [Entity]" is its own issue — creation involves schema, validation, and defaults that are distinct per entity.
- **Never merge different user actions** even if they touch the same code. "Complete to-do" and "Delete to-do" are separate issues because they are separate things a user does.
</vertical-slice-rules>

### Figma anchoring

Copy the relevant frame link from the closed design issue directly into each frontend issue's body under a `## Design` heading — the engineer shouldn't have to hunt through a separate issue for it.

### 4. Confirm with the user

Present the proposed breakdown as a numbered list. For each slice show:
- **Title**
- **Layer**: frontend / backend / devops
- **Blocked by**: other slices that must complete first
- **User stories covered**
- **Acceptance criteria**: the actual draft criteria, not just a placeholder — this is what the user is really approving, since it's what `build` and `qa` will hold the implementation to.

Ask the user if the granularity is right, dependencies are correct, and the acceptance criteria actually capture what "done" means for each slice. Iterate until approved.

### 5. Publish the issues

For each approved slice, create a GitHub issue using the template below. Publish in dependency order (blockers first — devops issues typically go first) so you can reference real issue numbers in the "Blocked by" field. Note the integration branch (found in step 1) in each issue's body so `build` can discover it later.

```bash
gh issue create --title "TITLE" --body "BODY" --label "frontend|backend|devops"
```

### 6. Add the new issues to the epic

`feature` already created the epic with empty Backend/Frontend/DevOps groups — edit its body to fill them in with the issues just published, grouped by layer, same as the Design group already there:

```bash
gh issue edit EPIC_NUMBER --body "UPDATED_BODY"
```

<issue-template>

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation. Avoid specific file paths or code snippets — they go stale fast.

## Design

(Frontend issues only.) The Figma frame link(s) copied from the feature's design issue for this slice. Omit this heading entirely for backend/devops issues.

## Acceptance criteria

Each criterion must be testable and specific enough that someone could check it off without reading the code: name the input/action, the system's response, and what "done" looks like. "Handles errors gracefully" is not acceptable — say which error and what the observable handling is. Cover, at minimum:

- The happy path for this slice's user action.
- At least one edge case or failure mode (empty state, invalid input, large/boundary input, permission denied — whatever's actually relevant to this slice).
- Any non-functional constraint the PRD or grill-me report called out for this slice (performance threshold, security check, specific empty/loading/error state) — don't drop these silently just because they're not the primary behavior.

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- #issue-number (if any), or "None — can start immediately"

## Final Engineering Estimate

_(engineer fills this in right before cutting the branch with `build` — leave blank at publish time)_

---
Part of #EPIC · integration branch: `feat/<feature-branch>`

</issue-template>
