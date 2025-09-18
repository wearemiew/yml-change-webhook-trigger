# Implementation Plan for yml-change-webhook GitHub Action

## Project Overview

The `yml-change-webhook` GitHub Action detects changes in YML files within a Git repository and triggers webhooks in response to those changes. This action aims to streamline workflows where external systems need to be notified or updated whenever YML configuration files are modified.

## Project Structure

```
yml-change-webhook/
├── .github/
│   └── workflows/
│       ├── test.yml               # CI workflow to test the action
│       └── release.yml            # Workflow for releasing versions
├── src/
│   ├── index.js                   # Main entry point
│   ├── detect-changes.js          # Logic for detecting YML file changes
│   ├── parse-yaml.js              # Functions to parse YML and extract webhooks
│   ├── execute-webhooks.js        # Webhook execution logic
│   └── utils.js                   # Utility functions (optional)
├── __tests__/                     # Test directory
│   ├── detect-changes.test.js
│   ├── parse-yaml.test.js
│   └── execute-webhooks.test.js
├── examples/                      # Example files
│   ├── service-config.yml         # Example service configuration
│   ├── docs-config.yml            # Example documentation config
│   └── workflow-example.yml       # Example GitHub workflow
├── dist/                          # Compiled output (created by build process)
│   └── index.js                   # Built with @vercel/ncc
├── action.yml                     # Action metadata file
├── package.json                   # Node.js package information
├── package-lock.json              # Dependency lock file
├── jest.config.cjs                 # Jest configuration
├── .eslintrc.js                   # ESLint configuration
├── .gitignore                     # Git ignore configuration
├── CONTRIBUTING.md                # Guidelines for contributors
├── LICENSE                        # MIT License
└── README.md                      # Documentation
```

## Implementation Tasks & Timeline

### Phase 1: Project Setup (1-2 days)

- [x] ~~Initialize repository structure~~
- [x] ~~Create README.md with documentation~~
- [x] ~~Set up package.json with dependencies~~
- [x] ~~Configure ESLint and Jest~~
- [x] ~~Create GitHub workflow files~~
- [x] ~~Create action.yml metadata file~~

### Phase 2: Core Implementation (3-4 days)

1. **Git Change Detection System**

   - [x] ~~Implement code to detect YML changes in push events~~
   - [x] ~~Implement code to detect YML changes in pull request events~~
   - [ ] Add support for custom file path filtering
   - [ ] Enhance diff detection with more robust error handling
   - [ ] Add file exclusion patterns (e.g., ignore files in certain directories)

2. **YML Parsing System**

   - [x] ~~Implement basic YML parsing~~
   - [x] ~~Implement webhook URL extraction~~
   - [ ] Add support for different webhook location patterns
   - [ ] Add validation for webhook URLs
   - [ ] Implement JSON schema validation for YML files (optional)

3. **Webhook Execution System**
   - [x] ~~Implement basic webhook POST requests~~
   - [ ] Add customizable request headers
   - [ ] Add request payload customization
   - [ ] Implement retry mechanism for failed requests
   - [ ] Add rate limiting for webhook execution
   - [ ] Add webhook batching option

### Phase 3: Testing & Validation (2-3 days)

- [x] ~~Set up Jest testing structure~~
- [x] ~~Create example files for testing~~
- [ ] Write unit tests for all components
- [ ] Write integration tests
- [ ] Create test fixtures
- [ ] Set up code coverage tracking
- [ ] Implement end-to-end testing

### Phase 4: Documentation & Refinement (2-3 days)

- [x] ~~Create comprehensive README.md~~
- [x] ~~Document input/output parameters~~
- [x] ~~Create CONTRIBUTING.md guidelines~~
- [ ] Add JSDoc comments throughout codebase
- [ ] Create code examples for common use cases
- [ ] Improve error messages and logging
- [ ] Create troubleshooting guide
- [ ] Document security considerations

### Phase 5: Release & Marketplace Publication (1-2 days)

- [ ] Prepare GitHub Marketplace listing
- [ ] Create visual assets (icon, banner, screenshots)
- [ ] Write marketplace description
- [ ] Finalize version 1.0.0
- [ ] Create release notes
- [ ] Tag release
- [ ] Publish to GitHub Marketplace

## Technical Implementation Details

### YML Change Detection Logic

The change detection system will rely on Git's diff functionality to identify which YML files have been modified:

```javascript
function detectChanges(baseRef) {
  try {
    let command;

    if (process.env.GITHUB_EVENT_NAME === "pull_request") {
      const base = baseRef || process.env.GITHUB_BASE_REF || "main";
      command = `git diff --name-only origin/${base}...HEAD`;
    } else {
      // For push events, compare with the previous commit
      command = "git diff --name-only HEAD^";
    }

    const output = execSync(command).toString().trim();

    if (!output) {
      return [];
    }

    return output
      .split("\n")
      .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
  } catch (error) {
    core.warning(`Error detecting changes: ${error.message}`);
    return [];
  }
}
```

### Enhanced YML Parsing with Multiple Patterns

The parsing system will be extended to support different patterns for webhook definitions:

```javascript
function extractWebhooks(filePath, patterns = ["x-update-webhooks"]) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = yaml.load(content);

    if (!parsed) {
      return [];
    }

    // Try multiple patterns for webhook extraction
    let webhooks = [];

    for (const pattern of patterns) {
      if (parsed[pattern] && Array.isArray(parsed[pattern])) {
        const urls = parsed[pattern].filter(
          (url) => typeof url === "string" && url.startsWith("http")
        );
        webhooks = [...webhooks, ...urls];
      }
    }

    return webhooks;
  } catch (error) {
    core.warning(`Error parsing ${filePath}: ${error.message}`);
    return [];
  }
}
```

### Advanced Webhook Execution with Retry Logic

The webhook execution system will include retry logic and customizable payloads:

```javascript
async function executeWebhooks(webhooks, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    customHeaders = {},
    customPayload = null,
  } = options;

  const results = [];
  const uniqueWebhooks = [...new Set(webhooks)];

  for (const url of uniqueWebhooks) {
    let success = false;
    let attempt = 0;
    let lastError = null;

    // Prepare request data
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "yml-change-webhook-action",
      ...customHeaders,
    };

    const payload = customPayload || {
      source: "yml-change-webhook",
      timestamp: new Date().toISOString(),
    };

    // Retry loop
    while (!success && attempt < maxRetries) {
      attempt++;

      try {
        core.info(
          `Executing webhook (attempt ${attempt}/${maxRetries}): ${maskUrl(url)}`
        );

        const response = await axios.post(url, payload, { headers });

        success = true;
        results.push({
          url: maskUrl(url),
          success: true,
          status: response.status,
          attempt,
        });

        core.info(
          `Webhook executed successfully: ${maskUrl(url)} (Status: ${response.status})`
        );
      } catch (error) {
        lastError = error;

        const errorMessage = error.response
          ? `Status: ${error.response.status}, Message: ${error.response.statusText}`
          : error.message;

        core.warning(
          `Webhook execution failed (attempt ${attempt}/${maxRetries}): ${maskUrl(url)} - ${errorMessage}`
        );

        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (!success) {
      const errorMessage = lastError.response
        ? `Status: ${lastError.response.status}, Message: ${lastError.response.statusText}`
        : lastError.message;

      results.push({
        url: maskUrl(url),
        success: false,
        error: errorMessage,
        attempts: attempt,
      });
    }
  }

  return results;
}
```

## Action Configuration Options (Future Enhancements)

The action will be extended to support additional configuration options:

| Input              | Description                                             | Default             |
| ------------------ | ------------------------------------------------------- | ------------------- |
| `base_ref`         | Base reference for comparing changes                    | ''                  |
| `file_pattern`     | Glob pattern for YML files to check                     | '\*_/_.{yml,yaml}'  |
| `exclude_pattern`  | Glob pattern for files to exclude                       | ''                  |
| `webhook_patterns` | Comma-separated list of YML fields to look for webhooks | 'x-update-webhooks' |
| `custom_headers`   | JSON string of headers to include in webhook requests   | '{}'                |
| `custom_payload`   | Custom payload template for webhook requests            | ''                  |
| `max_retries`      | Maximum number of retries for failed webhooks           | '3'                 |
| `retry_delay`      | Delay between retries in milliseconds                   | '1000'              |
| `batch_webhooks`   | Whether to batch webhook calls                          | 'false'             |
| `verbose_logging`  | Enable detailed logging                                 | 'false'             |

## Security Considerations

The implementation will include several security measures:

1. **URL Validation**: Ensure webhook URLs are properly validated
2. **Output Masking**: Mask sensitive parts of URLs in logs
3. **Error Handling**: Prevent exposing sensitive information in error messages
4. **Input Sanitization**: Properly sanitize inputs to prevent command injection
5. **Dependencies**: Regular auditing of dependencies for vulnerabilities

## Quality Assurance Metrics

To ensure high-quality implementation, we'll target:

- **Code Coverage**: Aim for >90% test coverage
- **Documentation**: Complete inline documentation for all functions
- **Error Handling**: Comprehensive error handling throughout
- **Security**: No high or critical vulnerabilities in dependencies
- **Performance**: Execute webhooks within reasonable time limits

## Future Enhancements (Post-Release)

1. **Webhook Authentication**: Support for various authentication methods
2. **Conditional Execution**: Trigger webhooks based on specific conditions
3. **Advanced Filtering**: More advanced filtering options for YML changes
4. **Webhook Templates**: Templating system for webhook payloads
5. **Notification Options**: Additional notification options (Slack, Discord, etc.)
6. **Dashboard Integration**: Integration with GitHub dashboard
7. **Analytics**: Basic analytics for webhook execution

## Maintenance Plan

Once released, the following maintenance activities will be scheduled:

- **Weekly**: Review and address open issues
- **Monthly**: Dependency updates and security audits
- **Quarterly**: Feature enhancements and documentation updates
- **Annually**: Major version releases with new features

This implementation plan provides a comprehensive roadmap for developing and maintaining the `yml-change-webhook` GitHub Action, ensuring it meets all specified requirements and provides a valuable tool for the GitHub community.
