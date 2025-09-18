const { execSync } = require("child_process");
const core = require("@actions/core");

/**
 * Detects YML files that have been changed in the current push or pull request
 *
 * @param {string} baseRef - Base reference for comparison (optional)
 * @returns {string[]} Array of changed YML file paths
 */

function detectChanges(baseRef) {
  try {
    let command;
    // If the event is a pull request, use the base reference
    if (process.env.GITHUB_EVENT_NAME === `pull_request`) {
      const base = baseRef || process.env.GITHUB_BASE_REF;
      core.info(`Using base reference: ${base || "default"}`);
      command = `git diff --name-only origin/${base || "main"}...HEAD`;
    } else {
      // For push events, compare with the previous commit
      // Check if HEAD^ exists (more than one commit)
      try {
        execSync('git rev-parse --verify HEAD^', { stdio: 'ignore' });
        command = `git diff --name-only HEAD^`;
      } catch {
        // If HEAD^ doesn't exist (only one commit), show all files in current commit
        command = `git diff --name-only --diff-filter=A HEAD`;
      }
    }

    core.debug(`Executing command: ${command}`);

    const output = execSync(command).toString().trim();

    if (!output) {
      return [];
    }

    // Filter to only include YML/YAML files
    const changedFiles = output
      .split("\n")
      .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));

    core.debug(`Changed YML files: ${JSON.stringify(changedFiles)}`);

    return changedFiles;
  } catch (error) {
    core.warning(`Error detecting changes: ${error.message}`);
    return [];
  }
}

module.exports = detectChanges;
