#!/usr/bin/env bash
# PreToolUse hook: blocks git commit/push while checked out on a protected branch.
# Enforces the CLAUDE.md rule: never commit directly to dev, staging, or main.
set -u

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
[ -z "$branch" ] && exit 0

case "$branch" in
  dev|staging|main)
    jq -n --arg branch "$branch" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: ("Blocked: cannot commit or push directly to protected branch \"" + $branch + "\". Create a branch (fix/…, feat/…, chore/…) and open a PR targeting dev instead.")
      }
    }'
    ;;
  *) exit 0 ;;
esac
