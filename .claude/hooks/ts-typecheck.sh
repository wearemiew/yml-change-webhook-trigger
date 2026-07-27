#!/usr/bin/env bash
# PostToolUse hook: type-checks the touched project with `tsc --noEmit` after editing a .ts/.tsx file.
# Scoped to frontend-backoffice, frontend-portal, and backend-chatbot, the three TypeScript projects in this repo.
set -u

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)"
[ -z "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

project=""
case "$file" in
  frontend-backoffice/*|*/frontend-backoffice/*) project="frontend-backoffice" ;;
  frontend-portal/*|*/frontend-portal/*) project="frontend-portal" ;;
  backend-chatbot/*|*/backend-chatbot/*) project="backend-chatbot" ;;
  *) exit 0 ;;
esac

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$repo_root" ] && exit 0
project_dir="$repo_root/$project"
[ -d "$project_dir/node_modules" ] || exit 0

output="$(cd "$project_dir" && npx --no-install tsc --noEmit 2>&1)"
if [ -n "$output" ]; then
  jq -n --arg project "$project" --arg out "$output" \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: ("tsc --noEmit found issues in \($project):\n" + $out)}}'
fi
exit 0
