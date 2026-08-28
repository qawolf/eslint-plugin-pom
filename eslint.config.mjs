import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jestPlugin from "eslint-plugin-jest";
import perfectionist from "eslint-plugin-perfectionist";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/"] },

  js.configs.recommended,
  ...tsPlugin.configs["flat/recommended-type-checked"],
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,

  {
    files: ["**/*.{cts,mts,ts,tsx}"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        ecmaVersion: "latest",
        project: true,
        sourceType: "module",
      },
    },
    plugins: { perfectionist },
    rules: {
      "import/no-cycle": "error",
      "no-inner-declarations": "error",
      "perfectionist/sort-objects": ["error", { type: "natural" }],
    },
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
  },

  {
    files: ["src/**/*.{cts,ts,tsx}"],
    ignores: ["src/**/*.test.{cts,ts,tsx}"],
    rules: { "import/no-nodejs-modules": "error" },
  },

  {
    ...jestPlugin.configs["flat/recommended"],
    files: ["**/*.test.{cts,ts,tsx}"],
  },

  {
    ...tsPlugin.configs["flat/disable-type-checked"],
    files: ["**/*.{cjs,js,mjs}"],
    settings: {
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
  },

  prettier,
];
