import type { Rule } from "eslint";

export type PomLintRule = {
  module: Rule.RuleModule;

  /** Unprefixed, as ESLint expects inside a plugin's `rules` map. */
  name: string;

  severity: "error" | "warn";
};
