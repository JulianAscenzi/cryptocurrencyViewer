import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    // Node-side code: server, CLI, shared module, tests.
    files: ["*.js", "src/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Browser client, loaded as an ES module.
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        Chart: "readonly",
      },
    },
  },
  {
    ignores: ["node_modules/", "coverage/"],
  },
  eslintConfigPrettier,
];
