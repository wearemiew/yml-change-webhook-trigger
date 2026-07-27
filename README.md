<img class="logo" src="https://github.com/wearemiew/.github/raw/main/static/miew-banner.png" alt="Miew Banner"/>

# yml-change-webhook

A GitHub Action that detects changes in YML files and triggers webhooks in response to those changes.

## Overview

The `yml-change-webhook` GitHub Action automates the process of monitoring YML file changes within your repository and executing webhooks based on those changes. This action is perfect for scenarios where external systems need to be notified or updated whenever configuration files are modified.

## Features

- **Intelligent Change Detection**: Accurately identifies which YML files have been modified in both `push` and `pull_request` events
- **Webhook Automation**: Extracts webhook URLs from YML files and triggers them automatically
- **Detailed Reporting**: Generates a summary report of triggered webhooks and their execution status
- **Flexible Configuration**: Works with customizable options to fit your specific workflow requirements
- **Seamless Integration**: Easily incorporate into any GitHub workflow that relies on YML configuration
- **Reliability**: Handles webhook failures with retries and detailed error reporting
- **Parallel Processing**: Efficiently processes multiple webhooks for better performance

## Usage

Add this action to your GitHub workflow file:

```yaml
name: YML Change Notification
on:
  push:
    paths:
      - "**.yml"
      - "**.yaml"
  pull_request:
    paths:
      - "**.yml"
      - "**.yaml"

jobs:
  notify-changes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Detect YML Changes & Trigger Webhooks
        uses: wearemiew/yml-change-webhook-trigger@v1
        with:
          # Optional: Specify base reference for comparison (useful in PR scenarios)
          base_ref: ${{ github.event.pull_request.base.ref }}
```

> **Note**: You can use any of the following tag references:
> - `@v1` - Always points to the latest v1.x.x release
> - `@v1.0` - Always points to the latest v1.0.x release
> - `@v1.0.1` - Points to the specific v1.0.1 release

## Inputs

| Input      | Description                          | Required | Default |
| ---------- | ------------------------------------ | -------- | ------- |
| `base_ref` | Base reference for comparing changes | No       | ''      |

## Outputs

| Output            | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `changed_files`   | JSON array of YML files that changed                      |
| `webhook_results` | JSON array of webhook execution results with file mappings |

## YML File Structure

The action expects webhook URLs to be defined in your YML files using a specific structure:

```yaml
# Example config.yml
service: myService
config:
  timeout: 30
  retries: 3

# Webhook definitions
x-update-webhooks:
  - https://api.example.com/notify
  - https://webhook.site/your-unique-id
```

When this YML file changes, the action will automatically trigger all webhooks listed in the `x-update-webhooks` array.

## Webhook Execution Report

The action automatically generates a detailed report of webhook executions directly in the GitHub Actions workflow summary. This report includes:

- A summary of files that triggered webhooks
- A detailed list of all webhook executions with their status and duration

This report helps you quickly identify which files triggered which webhooks and whether those webhook calls were successful.

Example report:

```markdown
# Webhook Trigger Summary

For a detailed look at webhook triggers during this workflow run. Total changed files: 2

## Files Changed

| File | Webhook Count | Success Rate |
| ---- | ------------- | ------------ |
| config/api.yml | 1 | 100% |
| settings/notifications.yml | 2 | 50% |

## Webhook Executions

| File | Webhook | Status | Duration | Timestamp |
| ---- | ------- | ------ | -------- | --------- |
| config/api.yml | https://example.com/webhook1 | ✅ success | 340ms | 12:30:45 |
| settings/notifications.yml | https://example.com/webhook2 | ✅ success | 220ms | 12:30:46 |
| settings/notifications.yml | https://example.com/webhook3 | ❌ failed | - | 12:30:47 |

## Overall Statistics

- **Total Webhooks:** 3
- **Successful:** 2
- **Failed:** 1
- **Success Rate:** 67%
```

## Use Cases

- **Automated Configuration Updates**: Update services when their configuration changes
- **CI/CD Pipeline Integration**: Trigger downstream processes based on build config modifications
- **Documentation Synchronization**: Keep documentation in sync with YML changes
- **Infrastructure as Code**: Notify infrastructure management tools of changes to definitions

## Development

### Prerequisites

- Node.js 24+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/wearemiew/yml-change-webhook-trigger.git
cd yml-change-webhook-trigger

# Install dependencies
npm install
```

### Testing

```bash
npm test          # run the Jest suite
npm run test:watch
```

### Linting & Formatting

```bash
npm run lint      # eslint .
npm run format    # prettier --write on js/json/yml/yaml
```

### Local Development

The `dist` directory containing the compiled code is not checked into the repository during development. When developing locally:

1. Make your changes to the source files
2. Run `npm run build` to create the `dist` directory locally
3. Test your changes with `npm test`

The `dist` directory is only built and included in the repository when a release is created.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution workflow, and [docs/workflows.md](docs/workflows.md) for how the CI/CD pipeline fits together.

### Release Process

This project uses automated GitHub Actions workflows for releases:

1. When PRs with conventional commit messages are merged to the `main` branch:
   - The `auto-version.yml` workflow uses conventional-changelog-action to analyze commits and determine version bumps:
     - Features (`feat:`) trigger minor version bumps
     - Fixes (`fix:`) trigger patch version bumps
     - Breaking changes (`BREAKING CHANGE:` or `feat!:`) trigger major version bumps
   - The `release-workflow.yml` automatically creates a release with the new version

2. When a release is created, the `publish.yml` workflow:
   - Runs tests and builds the action
   - Commits the `dist` directory to the repository (even though it's in .gitignore)
   - Updates the major version tag (e.g., `v1`) and the major.minor version tag (e.g., `v1.0`)

You can also manually trigger a release using the GitHub Actions interface by running the `Release Workflow` with your choice of version bump (patch, minor, or major).

## CI/CD Improvements

This project includes several optimizations in its GitHub Actions workflows:

- **Matrix Testing**: Tests across multiple Node.js versions for compatibility
- **Dependency Management**: Automated dependency updates with Dependabot
- **Caching**: Improved build times with artifact and dependency caching
- **Security Scanning**: Weekly security audits of dependencies
- **Conventional Commits**: Automated versioning based on commit messages

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License (see the `license` field in `package.json`).
