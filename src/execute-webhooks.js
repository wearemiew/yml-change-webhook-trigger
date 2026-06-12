const axios = require("axios");
const core = require("@actions/core");

/**
 * Execute a webhook with retry mechanism
 *
 * @param {string} url - Webhook URL
 * @param {object} data - Payload data
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<object>} Axios response
 */
const executeWithRetry = async (url, data, retries = 3) => {
  try {
    return await axios.post(url, data, {
      timeout: 10000, // 10 second timeout
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "YML-Change-Webhook-Action",
      },
    });
  } catch (error) {
    if (retries > 0) {
      const waitTime = 1000 * Math.pow(2, 3 - retries); // Exponential backoff: 1s, 2s, 4s
      core.info(
        `Retrying webhook (${retries} attempts left, waiting ${waitTime}ms)...`
      );
      await new Promise((r) => setTimeout(r, waitTime)); // Wait before retry with exponential backoff
      return executeWithRetry(url, data, retries - 1);
    }
    throw error;
  }
};

/**
 * Execute webhooks with POST requests
 *
 * @param {Array<{url: string, file: string}>} webhooks - Array of webhook objects with URLs and source files
 * @returns {Promise<Array>} Array of execution results
 */
async function executeWebhooks(webhooks) {
  const results = [];
  // Create unique webhooks while preserving file origin
  const uniqueWebhooks = [];
  const seenUrls = new Set();

  for (const webhook of webhooks) {
    if (!seenUrls.has(webhook.url)) {
      seenUrls.add(webhook.url);
      uniqueWebhooks.push(webhook);
    }
  }

  core.debug(`Preparing to execute ${uniqueWebhooks.length} unique webhook(s)`);

  // Execute webhooks in parallel with a limit of 5 concurrent requests
  const batchSize = 5;
  for (let i = 0; i < uniqueWebhooks.length; i += batchSize) {
    const batch = uniqueWebhooks.slice(i, i + batchSize);
    const batchPromises = batch.map(async (webhook) => {
      const url = webhook.url;
      const file = webhook.file;
      const startTime = Date.now();

      try {
        core.info(`Executing webhook: ${maskUrl(url)}`);
        const payload = {
          source: "yml-change-webhook",
          file: file,
          repository: process.env.GITHUB_REPOSITORY,
          ref: process.env.GITHUB_REF,
          sha: process.env.GITHUB_SHA,
          timestamp: new Date().toISOString(),
        };

        const response = await executeWithRetry(url, payload);
        const duration = `${Date.now() - startTime}ms`;

        // Validate response
        const isValid = response.status >= 200 && response.status < 300;

        results.push({
          url: maskUrl(url),
          file: file,
          success: isValid,
          status: response.status,
          duration: duration,
          timestamp: new Date().toISOString(),
        });

        core.info(
          `Webhook executed successfully: ${maskUrl(url)} (Status: ${response.status}, Duration: ${duration})`
        );
      } catch (error) {
        const duration = `${Date.now() - startTime}ms`;
        const errorMessage = error.response
          ? `Status: ${error.response.status}, Message: ${error.response.statusText}`
          : error.message;

        results.push({
          url: maskUrl(url),
          file: file,
          success: false,
          error: errorMessage,
          duration: duration,
          timestamp: new Date().toISOString(),
        });

        core.warning(
          `Webhook execution failed after retries: ${maskUrl(url)} - ${errorMessage}`
        );
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
}

/**
 * Masks part of the URL for security when logging.
 *
 * @param {string} url - The webhook URL
 * @returns {string} Masked URL
 */
function maskUrl(url) {
  try {
    const urlObj = new URL(url);
    const host = urlObj.host;
    const path =
      urlObj.pathname.length > 10
        ? urlObj.pathname.substring(0, 4) +
          "..." +
          urlObj.pathname.substring(urlObj.pathname.length - 4)
        : urlObj.pathname;

    return `${urlObj.protocol}//${host}${path}`;
  } catch {
    // If URL parsing fails, return a generic masked version
    return url.substring(0, 10) + "..." + url.substring(url.length - 5);
  }
}

module.exports = executeWebhooks;
