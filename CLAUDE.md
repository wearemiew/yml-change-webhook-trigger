# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`yml-change-webhook-trigger` is a GitHub Action (published to the Marketplace by wearemiew) that:
1. Detects which `.yml`/`.yaml` files changed in a push or pull request.
2. Parses each changed file for a `x-update-webhooks` array of URLs.
3. POSTs a JSON payload (source, file, repo, ref, sha, timestamp) to each unique webhook URL, with retries and bounded concurrency.
4. Writes a Markdown report to `$GITHUB_STEP_SUMMARY` and exposes `changed_files` / `webhook_results` as action outputs.

It lets other repos declare "notify this URL when my config changes" directly inside their YAML files instead of wiring bespoke CI glue.

## Commands

```bash
npm test              # run the Jest suite (__tests__/**/*.test.js)
npm run test:watch    # watch mode
npm run lint          # eslint .
npm run format        # prettier --write on js/json/yml/yaml
npm run build         # ncc-bundle src/index.js -> dist/index.js (+ dist/package.json)
```

Run a single test file or case directly with Jest (bypassing the npm alias if you want extra flags):
```bash
NODE_ENV=test npx jest --config jest.config.cjs __tests__/parse-yaml.test.js
NODE_ENV=test npx jest --config jest.config.cjs -t "should extract webhook URLs"
```
`NODE_ENV=test` matters: `@actions/core` is mocked via `moduleNameMapper` (`__mocks__/@actions/core.js`) and the mock/jest setup assumes the test env.

## Architecture

Entry point declared in [action.yml](action.yml) is `dist/index.js` (Node 20 runtime), but **`dist/` is git-ignored and must never be hand-edited** — it's a ncc-bundled artifact only committed by CI during the release flow (see below). Local development happens entirely in `src/`; run `npm run build` if you need to smoke-test the actual bundled entry point.

Pipeline, wired together in [src/index.js](src/index.js):
1. **[src/detect-changes.js](src/detect-changes.js)** — shells out to `git diff --name-only` to list changed files, filtered to `.yml`/`.yaml`. Branches on `GITHUB_EVENT_NAME`: for `pull_request` it diffs against `origin/<base_ref or GITHUB_BASE_REF or main>...HEAD`; for `push` it prefers `GITHUB_EVENT_BEFORE..GITHUB_SHA`, falling back to `HEAD^` or (on a repo's first commit) the files added in `HEAD`.
2. **[src/parse-yaml.js](src/parse-yaml.js)** — reads each changed file, `js-yaml`-parses it, and pulls out `x-update-webhooks` entries that start with `http`. This is the file-format contract other repos rely on (see `examples/*.yml`).
3. **[src/execute-webhooks.js](src/execute-webhooks.js)** — de-dupes webhook URLs (first file wins for reporting), then POSTs them in batches of 5 concurrent requests via axios, with exponential-backoff retry (3 attempts: 1s/2s/4s). URLs are host+truncated-path masked (`maskUrl`) before ever being logged or put in outputs, since they can contain sensitive tokens.
4. Back in `index.js`, `generateSummaryReport` renders a Markdown table of results into `$GITHUB_STEP_SUMMARY` (skipped if that env var is unset, e.g. running outside Actions).

Errors at any stage are caught and reported via `core.setFailed`/`core.warning` rather than throwing — the action is expected to degrade gracefully (e.g., zero changed files or zero webhooks just exit early with outputs set).

## Release automation

Versioning and publishing are fully automated via chained workflows (see [docs/workflows.md](docs/workflows.md) for the full diagram):
- `.github/workflows/test.yml` — runs on push/PR touching `src/**`, YAML, or package files; also self-tests the action on `main`.
- `.github/workflows/auto-version.yml` — on merge to `main`, bumps `package.json` per Conventional Commits (`fix:`→patch, `feat:`→minor, `BREAKING CHANGE:`/`feat!:`→major).
- `.github/workflows/release-workflow.yml` — builds, force-commits `dist/` (normally git-ignored), creates the GitHub release, and updates floating `vN`/`vN.M` tags.
- `.github/workflows/publish.yml` — runs on release creation to finalize the Marketplace listing.

Because of this, commit messages must follow Conventional Commits for automatic version bumps to work, and `dist/` is intentionally absent from feature branches — don't add it to a PR by hand.

Note: `auto-version.yml` and `release-workflow.yml` are wired to the `main` branch, but day-to-day work happens on `dev` (the repo's actual default branch — see Git workflow below). Keep this in mind if release automation ever needs touching.

## Git workflow

- Never commit directly to `dev` or `main`.
- Always create a separate branch and open a PR targeting `dev`. Prefixes: `feat/…`, `fix/…`, `chore/…`, `ci/…`, `docs/…`, `refactor/…`, `test/…`, `perf/…`, `style/…`, `revert/…` — these mirror the Conventional Commits types below.
- Ask the user before committing code to any branch.
- Before committing, show the user the test results (`npm test`). If everything passes, proceed with the commit. If anything fails, do not commit — ask the user how they want to resolve the failure.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) — this isn't just style, `auto-version.yml` parses these to decide the version bump (see Release automation above):

```
<type>(<optional scope>): <short description>
```

Allowed types: `feat`, `fix`, `chore`, `ci`, `docs`, `refactor`, `test`, `perf`, `style`, `revert`

Examples:
- `feat: add retry backoff cap to webhook execution`
- `fix: handle empty x-update-webhooks array`
- `chore: bump js-yaml to 5.2.2`
- `ci: cache npm dependencies in test workflow`

There is no PR auto-labeling configured in this repo (no `.github/labeler.yml` or labeler workflow) — branch prefixes above are for commit-type/version-bump consistency, not automated labeling.
