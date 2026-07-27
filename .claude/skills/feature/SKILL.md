---
name: feature
description: Kick off a new feature right after its PRD is grilled — create its shared integration branch off dev, a tracking (epic) issue, and a design-tracking issue that gates dev ticket creation. Use when starting a new feature or setting up a feature branch, before any backend/frontend/devops tickets exist.
allowed-tools: Bash(gh issue view:*), Bash(gh issue list:*), Bash(gh issue create:*), Bash(gh issue edit:*), Bash(gh repo view:*), Bash(git checkout:*), Bash(git branch:*), Bash(git fetch:*), Bash(git pull:*), Bash(git push:*)
---

Set up a new feature so design, backend, frontend, and devops can all collaborate on it. A feature gets **one shared integration branch** cut from `dev`; every slice branch (`feat/<feature-branch>/<task>`) is cut from — and merged back into — that integration branch. Only the integration branch merges into `dev`.

This skill runs once per feature, right after `grill-me`'s ballpark is approved — **before** `to-issues` and before any dev tickets exist. It produces three things: the integration branch, a tracking (epic) issue, and a design-tracking issue. Backend/frontend/devops tickets don't exist yet at this point; `to-issues` adds them to the epic later, once design signs off. Keeping design on its own issue (instead of a placeholder paragraph in the PRD) makes it assignable, closeable, and visible on the same board as everything else.

## 1. Identify the feature

Before asking anything, check what the repo already tells you: if no PRD reference was given, look at recent discussions in the "PRD" category for a plausible match, and check existing `epic` issues / `feat/*` branches so a proposed slug doesn't collide with one already in flight.

Get the feature name (short kebab-case slug, e.g. `checkout`) and the PRD it's based on — a Discussions URL/number if the user gives one, otherwise whatever PRD content is already in the conversation context. If exploring surfaced a likely PRD or slug, lead with that as your suggested answer rather than asking blind. Confirm both with the user before proceeding.

## 2. Create the integration branch

Cut it from an up-to-date `dev`. Name it `feat/<feature-branch>`.

```bash
git fetch origin && git checkout dev && git pull && git checkout -b feat/<feature-branch>
```

Do not push without asking (per root `CLAUDE.md`). Once the user approves, publish it so slices can branch from the remote:

```bash
git push -u origin feat/<feature-branch>
```

## 3. Create the design-tracking issue

Create this before the epic, so the epic can reference its real issue number. This is what replaces the old "designer edits a placeholder paragraph in the PRD" approach — design work gets a real, assignable, closeable issue like everything else, and it's what `to-issues` waits on before generating dev tickets.

```bash
gh issue create --title "Design: <Feature Name>" --body "BODY" --label "design"
```

<design-issue-template>

## What's needed

Client-approved Figma frame link(s) covering the user stories in the PRD (link the PRD discussion here). List the specific screens/states expected, derived from the PRD's user stories.

## Figma frames

_(designer: paste frame links here, one per screen/state, then close this issue)_

## Blocks

`to-issues` will not generate backend/frontend/devops tickets for this feature until this issue is closed with real Figma links attached.

</design-issue-template>

## 4. Create the tracking (epic) issue

Create one issue that is the home base for the feature. Its body records the integration branch name (so `build` and `to-issues` can find it) and checklists the slices grouped by layer — Design starts populated with the real issue number from step 3; Backend/Frontend/DevOps start empty since `to-issues` fills those in once design signs off.

```bash
gh issue create --title "Feature: <Feature Name>" --body "BODY" --label "epic"
```

<epic-template>

## Summary

One paragraph: what this feature delivers, from the user's perspective. Link the PRD discussion if there is one.

## Integration branch

`feat/<feature-branch>` — all slice branches for this feature are cut from and merged into this branch. It merges to `dev` only when the whole feature is complete and has passed integration QA.

## Slices

Design:
- [ ] #NN — Design: <Feature Name>

Backend:
- _(added by `to-issues` once the design issue above is closed)_

Frontend:
- _(added by `to-issues` once the design issue above is closed)_

DevOps:
- _(added by `to-issues` once the design issue above is closed)_

## Definition of done

- [ ] All slices merged into `feat/<feature-branch>`
- [ ] Feature validated end-to-end against the PRD acceptance criteria (run the `qa` skill in feature-level mode against this branch)
- [ ] Integration branch merged into `dev`

</epic-template>

## 5. Link the design issue back to the epic

```bash
gh issue edit NN --body "$(updated body with: 'Part of #EPIC · integration branch: feat/<feature-branch>')"
```

## 6. Report

Output to the user: the integration branch name, the epic issue URL, and the design issue URL. Tell them the next step is getting the design issue closed with real Figma frames, after which `to-issues` can be run to generate backend/frontend/devops tickets against this same epic.
