/** @type {import("eslint").Linter.Config} */
module.exports = {
  env: { es2024: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier",
  ],
  ignorePatterns: ["dist/", "node_modules/"],
  overrides: [
    {
      // Rules ship to other people's ESLint hosts, some of which have no
      // filesystem, so they must stay portable. Tests only run here.
      excludedFiles: ["src/**/*.test.{cts,ts,tsx}"],
      files: ["src/**/*.{cts,ts,tsx}"],
      rules: { "import/no-nodejs-modules": "error" },
    },
    {
      extends: ["plugin:jest/recommended"],
      files: ["**/*.test.{cts,ts,tsx}"],
      plugins: ["jest"],
    },
    {
      // Config files are plain JS and are not in the tsconfig, so no type
      // information exists for them.
      extends: ["plugin:@typescript-eslint/disable-type-checked"],
      files: ["*.cjs", "*.js"],
      parserOptions: { project: null },
      rules: { "@typescript-eslint/no-var-requires": "off" },
    },
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", project: true, sourceType: "module" },
  plugins: ["@typescript-eslint", "import", "perfectionist"],
  root: true,
  rules: {
    "import/no-cycle": "error",
    "perfectionist/sort-objects": ["error", { type: "natural" }],
  },
  settings: {
    "import/resolver": { typescript: { alwaysTryTypes: true } },
  },
};
