---
name: to-prd
description: Turn the current conversation context into a PRD and publish it to GitHub Discussions under the PRD category. Use when user wants to create a PRD from the current context.
allowed-tools: Bash(gh api graphql:*), Bash(gh repo view:*)
---

This skill takes the current conversation context and codebase understanding and produces a PRD. Do NOT interview the user — just synthesize what you already know.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain vocabulary throughout the PRD.

2. Write the PRD using the template below.

3. Post it to GitHub Discussions in the "PRD" category:
   - Run `gh repo view --json nameWithOwner` to get owner and repo name.
   - Query discussion categories and find "PRD" by name:
   ```bash
   gh api graphql -f query='query($owner:String!,$repo:String!){
     repository(owner:$owner,name:$repo){
       id
       discussionCategories(first:20){nodes{id name}}
     }
   }' -f owner="OWNER" -f repo="REPO"
   ```
   - Create the discussion using the repository id and the "PRD" category id from the query above:
   ```bash
   gh api graphql -f query='mutation($repoId:ID!,$catId:ID!,$title:String!,$body:String!){
     createDiscussion(input:{repositoryId:$repoId,categoryId:$catId,title:$title,body:$body}){
       discussion { url }
     }
   }' -f repoId="REPO_ID" -f catId="CATEGORY_ID" -f title="TITLE" -f body="BODY"
   ```

4. Report the discussion URL to the user, and call out that the `## Design & User Experience` section is a placeholder — actual design sign-off happens on a dedicated design-tracking issue that `feature` creates when this feature kicks off (after `grill-me`), not in this discussion. `grill-me` reads the PRD from this discussion; `to-issues` reads Figma frames from the design issue instead.

## PRD template

Fill in every section below using what you already know from the conversation and codebase — don't leave a section as boilerplate if you have enough context to write it for real.

```markdown
# [Feature Name]

## Problem

What's broken or missing today, and for whom. Ground this in the actual codebase/product, not a generic pain point.

## Goals

- Goal 1
- Goal 2

## Non-goals

What this explicitly does not cover, to keep scope bounded.

## User stories

- As a [user type], I want to [action], so that [outcome].
- (Repeat — cover every distinct action a user can take. `to-issues` will map these 1:1 to vertical-slice tickets later, so be thorough here rather than terse.)

## Design & User Experience

> ⏳ **Pending design sign-off**, tracked separately. Once this PRD is grilled, `feature` creates a dedicated design-tracking issue for Figma sign-off — `to-issues` reads frame links from that issue, not from this section.

## Functional requirements

Numbered, testable requirements derived from the user stories above.

1. Requirement 1
2. Requirement 2

## Success metrics

How you'll know this shipped successfully.

## Open questions

Anything genuinely unresolved — surface it here rather than silently guessing. `grill-me` is where the team resolves these.
```