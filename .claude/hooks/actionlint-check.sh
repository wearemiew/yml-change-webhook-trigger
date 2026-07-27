#!/usr/bin/env bash
# PostToolUse hook: lints changed GitHub Actions workflow/action files with actionlint.
# Reads the tool call JSON from stdin, does nothing for files outside .github/workflows or
# .github/actions/**/action.yml, otherwise runs actionlint and surfaces findings back to Claude.
set -u

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_response.filePath // .tool_input.file_path // empty' 2>/dev/null)"
[ -z "$file" ] && exit 0

# Must be a .yml/.yaml file that lives under a .github/ directory (workflow or
# composite/reusable action), not just a path that happens to contain ".github".
case "$file" in
  *.yml|*.yaml) ;;
  *) exit 0 ;;
esac

case "$file" in
  .github/workflows/*|*/.github/workflows/*) ;;
  .github/actions/*/action.yml|.github/actions/*/action.yaml) ;;
  */.github/actions/*/action.yml|*/.github/actions/*/action.yaml) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

CACHE_DIR="${HOME:-/tmp}/.cache/actionlint"
VERSION="1.7.7"
BIN=""

if command -v actionlint >/dev/null 2>&1; then
  BIN="actionlint"
elif [ -x "$CACHE_DIR/actionlint" ]; then
  BIN="$CACHE_DIR/actionlint"
elif [ -x "$CACHE_DIR/actionlint.exe" ]; then
  BIN="$CACHE_DIR/actionlint.exe"
else
  mkdir -p "$CACHE_DIR" 2>/dev/null

  uname_s="$(uname -s 2>/dev/null || echo unknown)"
  uname_m="$(uname -m 2>/dev/null || echo unknown)"

  case "$uname_s" in
    Darwin) plat="darwin" ;;
    MINGW*|MSYS*|CYGWIN*) plat="windows" ;;
    Linux) plat="linux" ;;
    *) plat="" ;;
  esac

  case "$uname_m" in
    x86_64|amd64) arch="amd64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) arch="" ;;
  esac

  if [ -n "$plat" ] && [ -n "$arch" ] && command -v curl >/dev/null 2>&1; then
    if [ "$plat" = "windows" ]; then
      url="https://github.com/rhysd/actionlint/releases/download/v${VERSION}/actionlint_${VERSION}_windows_${arch}.zip"
      zip="$CACHE_DIR/actionlint.zip"
      if curl -fsSL "$url" -o "$zip" 2>/dev/null && command -v unzip >/dev/null 2>&1; then
        (cd "$CACHE_DIR" && unzip -oq actionlint.zip actionlint.exe 2>/dev/null)
        rm -f "$zip"
      fi
      [ -x "$CACHE_DIR/actionlint.exe" ] && BIN="$CACHE_DIR/actionlint.exe"
    else
      url="https://github.com/rhysd/actionlint/releases/download/v${VERSION}/actionlint_${VERSION}_${plat}_${arch}.tar.gz"
      if curl -fsSL "$url" 2>/dev/null | tar xz -C "$CACHE_DIR" actionlint 2>/dev/null; then
        chmod +x "$CACHE_DIR/actionlint" 2>/dev/null
        BIN="$CACHE_DIR/actionlint"
      fi
    fi
  fi
fi

if [ -z "$BIN" ]; then
  msg="actionlint is not installed and could not be auto-downloaded, so $file was not linted. "
  msg="$msg Install it manually: macOS -> 'brew install actionlint'; Windows/Linux -> download a binary from https://github.com/rhysd/actionlint/releases and put it on PATH or at $CACHE_DIR/actionlint(.exe)."
  jq -n --arg m "$msg" '{systemMessage: $m}'
  exit 0
fi

script_dir="$(cd "$(dirname "$0")" && pwd)"
config_file="$script_dir/../actionlint.yaml"
lint_args=()
[ -f "$config_file" ] && lint_args+=(-config-file "$config_file")

output="$("$BIN" "${lint_args[@]}" "$file" 2>&1)"
if [ -n "$output" ]; then
  jq -n --arg file "$file" --arg out "$output" \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: ("actionlint found issues in \($file):\n" + $out)}}'
fi
exit 0
