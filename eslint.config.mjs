import globals from "globals";
import js from "@eslint/js";
import jestPlugin from "eslint-plugin-jest";
import prettierConfig from "eslint-config-prettier";

export default [
  // 1. Globally recommended configurations
  js.configs.recommended,
  jestPlugin.configs["flat/recommended"],

  // 2. Custom project-specific configuration
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node, // `node: true` from your old config
        // `jest: true` is now automatically handled by `jestPlugin.configs['flat/recommended']`
      },
    },

    rules: {
      // Your custom rules
      indent: ["error", 2],
      "linebreak-style": ["error", "unix"],
      quotes: ["error", "single"],
      semi: ["error", "always"],
      "no-unused-vars": ["warn"],
      "no-console": "off",

      // Your Jest-specific rules (these can override the recommended set)
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/valid-expect": "error",
    },
  },

  // 3. Prettier config MUST be last to override other formatting rules
  prettierConfig,
];
