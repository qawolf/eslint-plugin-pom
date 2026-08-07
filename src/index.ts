import { noInlineLocatorInPageObjectRule } from "./rules/noInlineLocatorInPageObject.js";
import type { PomLintRule } from "./types.js";

export type { PomLintRule } from "./types.js";

/**
 * The name a config registers this plugin under. Deliberately not `@qawolf/pom`
 * -- that is a different, published package, and sharing the name would make a
 * rule id look like it ships from there.
 */
export const rulePrefix = "@qawolf/pom-lint";

const allRules: PomLintRule[] = [noInlineLocatorInPageObjectRule];

/** ESLint's plugin contract: unprefixed names, since the config supplies the prefix. */
export const rules = Object.fromEntries(
  allRules.map((rule) => [rule.name, rule.module]),
);

/**
 * The same modules keyed by the id a config sees. A host registering rules
 * through `Linter.defineRules` has no `plugins` block to do the prefixing, so
 * without this every such host reimplements it and can disagree with
 * `ruleSeverities` about what a rule is called.
 */
export const rulesById = Object.fromEntries(
  allRules.map((rule) => [`${rulePrefix}/${rule.name}`, rule.module]),
);

/**
 * Severities keyed the same way, so a consumer can spread this straight into
 * `rules` rather than restating a severity per rule.
 */
export const ruleSeverities = Object.fromEntries(
  allRules.map((rule) => [`${rulePrefix}/${rule.name}`, rule.severity]),
);
