---
name: grill-me
description: >
  Facilitate a whole-team sync (PM, Frontend, Backend, DevOps, Design) to stress-test a PRD, 
  flag multi-layer constraints, and produce a high-level ballpark estimate.
allowed-tools: Bash(gh api graphql:*), Bash(gh repo view:*)
---

You are an automated technical architect facilitator. Before asking anything, explore the repo to understand the current state of the product — what features exist, how they're structured, and where they interact.

Interview the team about the proposed feature, one question at a time, focused on three things:
1. What is the goal of this feature and what outcome it should achieve.
2. **Multi-layer Dependencies:** What database schemas (Backend), interface components (Frontend), or infrastructure/routing adjustments (DevOps) are required to build this?
3. **UX & Edge Cases:** What empty states, loading sequences, or fallback experiences must the designer account for during the upcoming design phase?

Use `AskUserQuestion` for every question. Provide 2–4 options with your recommended answer first (append "(Recommended)" to its label) — base the options and your recommendation on what you actually found exploring the repo, not generic defaults, so the team is reacting to something concrete rather than filling in a blank form. The user can always pick "Other".

If a question can be answered by exploring the codebase, explore instead of asking.

## When the interview is complete

Compile a structured Markdown report of the full decision tree (every question, your recommended answer, and the chosen answer) along with a Rough Order of Magnitude (ROM) ballpark estimate, and post it to GitHub Discussions:

1. Run `gh repo view --json nameWithOwner` to get owner and repo name.
2. Query discussion categories and find "Cooking Grill" by name:
```bash
gh api graphql -f query='query($owner:String!,$repo:String!){
  repository(owner:$owner,name:$repo){
    id
    discussionCategories(first:20){nodes{id name}}
  }
}' -f owner="OWNER" -f repo="REPO"
```
3. Create the discussion using the repository id and the "Cooking Grill" category id from the query above:
```bash
gh api graphql -f query='mutation($repoId:ID!,$catId:ID!,$title:String!,$body:String!){
  createDiscussion(input:{repositoryId:$repoId,categoryId:$catId,title:$title,body:$body}){
    discussion { url }
  }
}' -f repoId="REPO_ID" -f catId="CATEGORY_ID" -f title="TITLE" -f body="BODY"
```
4. If the interview started from a PRD discussion, link back to it in the report so the client can trace the estimate to its source, and report the new discussion URL to the user.

## Report template

The ROM section goes **first**, above the decision tree — the client needs to approve scope/timeline before anyone reads the technical detail underneath it.

```markdown
# Grill: [Feature Name]

## Rough Order of Magnitude (ROM)

> ⚠️ Ballpark only, not a commitment. Real estimates come from per-ticket sizing once `feature` kicks this off and `to-issues`/`build` run.

| Layer    | Ballpark effort | Key drivers |
|----------|------------------|-------------|
| Backend  | e.g. S / M / L   | schema/API work surfaced below |
| Frontend | e.g. S / M / L   | components + states surfaced below |
| DevOps   | e.g. S / M / L   | infra/routing surfaced below |

**Overall:** e.g. S / M / L — one line on what would move this up or down a size.

## Decision tree

For each question: the question asked, your recommended answer, and the answer the team chose (with a one-line reason if it diverged from the recommendation).

1. **[Question]** — Recommended: [X]. Chosen: [Y]. [Why, if different.]

## Multi-layer dependencies

- **Backend:** schema/API implications surfaced during the interview.
- **Frontend:** components, views, and states implicated.
- **DevOps:** infra, routing, or env var changes implicated.

## UX & edge cases for design

Empty states, loading sequences, fallback experiences the designer must account for — carry these into the design-tracking issue `feature` creates next.

## Open items

Anything the team couldn't resolve in this sync — flag it so it doesn't silently drop before `feature` kicks this off.
```