// test-version-detection.js
// A Node.js script to test version detection logic locally

// const { execSync } = require('child_process');
// const fs = require('fs');

console.log("Testing version detection logic");
console.log("------------------------------");

// Create a fake PR title to test
const prTitle = "feat(webhooks): enhance execution with retry logic and parallel";
console.log(`Testing with PR title: ${prTitle}`);

// Create a fake PR body
const prBody = `This is a test PR body
Some details about the change

Here's a line with BREAKING CHANGE to test detection`;

console.log(`PR body contains breaking change: ${prBody}`);

// Simulate git commits
const commits = [
  "feat(webhooks): enhance execution with retry logic and parallel",
  "feat(ci): implement comprehensive GitHub Actions improvements",
  "fix(ci): resolve syntax error in auto-version workflow",
  "chore(build): exclude dist folder from regular commits",
  "feat!: breaking change example",
  "fix: minor issue with BREAKING CHANGE in body"
];

console.log("Simulating git log output...");
commits.forEach(commit => console.log(`- ${commit}`));

// Initialize variables for version bump detection
let hasBreakingChange = false;
let hasFeature = false;
let hasFix = false;

// Check PR title for breaking changes
if (prTitle.match(/^feat.*!:/) || prTitle.includes('BREAKING CHANGE')) {
  console.log('PR title indicates breaking change');
  hasBreakingChange = true;
}

// Check PR body for breaking changes
if (prBody.includes('BREAKING CHANGE')) {
  console.log('PR body indicates breaking change');
  hasBreakingChange = true;
}

// Check commit messages
commits.forEach(commit => {
  // Check for breaking changes
  if (commit.match(/^[a-z]+.*!:/) || commit.includes('BREAKING CHANGE')) {
    console.log(`Breaking change found in commit: ${commit}`);
    hasBreakingChange = true;
  }
  // Check for features
  else if (commit.startsWith('feat')) {
    console.log(`Feature commit found: ${commit}`);
    hasFeature = true;
  }
  // Check for fixes
  else if (commit.startsWith('fix') || commit.startsWith('perf')) {
    console.log(`Fix/perf commit found: ${commit}`);
    hasFix = true;
  }
});

// Determine bump type
let bumpType = 'none';
if (hasBreakingChange) {
  bumpType = 'major';
} else if (hasFeature) {
  bumpType = 'minor';
} else if (hasFix) {
  bumpType = 'patch';
}

console.log("\nDetection Results:");
console.log(`PR title has breaking marker: ${prTitle.match(/^feat.*!:/) || prTitle.includes('BREAKING CHANGE')}`);
console.log(`PR body has BREAKING CHANGE: ${prBody.includes('BREAKING CHANGE')}`);
console.log(`Commits have breaking change: ${hasBreakingChange}`);
console.log(`Commits have feature: ${hasFeature}`);
console.log(`Commits have fix: ${hasFix}`);

console.log(`\nFinal result: ${bumpType} bump detected`);
