module.exports = {
  clearMocks: true,
  collectCoverage: false, // Disable coverage to avoid Babel/Istanbul issues
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.test.js"
  ],
  setupFilesAfterEnv: [
    "<rootDir>/jest.setup.js"
  ],
  verbose: true,
  // Set transform to null to avoid using Babel/Istanbul
  transform: {},
  // Exclude moduleNameMapper that might cause issues
  moduleNameMapper: {
    "@actions/core": "<rootDir>/__mocks__/@actions/core.js"
  }
};
