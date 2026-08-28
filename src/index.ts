import { assertExpectPairingRule } from "./rules/assertExpectPairing.js";
import { noInlineLocatorInPageObjectRule } from "./rules/noInlineLocatorInPageObject.js";
import { selectorGetterShapeRule } from "./rules/selectorGetterShape.js";
import { typedCreateReturnRule } from "./rules/typedCreateReturn.js";
import { webFirstAssertionsRule } from "./rules/webFirstAssertions.js";
import type { PomLintRule } from "./types.js";

/**
 * The name a config registers this plugin under. Deliberately not `@qawolf/pom`
 * -- that is a different, published package, and sharing the name would make a
 * rule id look like it ships from there.
 */
export const rulePrefix = "@qawolf/pom-lint";

const allRules: PomLintRule[] = [
  assertExpectPairingRule,
  noInlineLocatorInPageObjectRule,
  selectorGetterShapeRule,
  typedCreateReturnRule,
  webFirstAssertionsRule,
];

/** ESLint's plugin contract: unprefixed names, since the config supplies the prefix. */
export const rules = Object.fromEntries(
  allRules.map((rule) => [rule.name, rule.module]),
);

/**
 * Severities keyed by the id `rules` registered under a `plugins` block, so a
 * consumer can spread this straight into `rules` rather than restating a
 * severity per rule.
 */
export const ruleSeverities = Object.fromEntries(
  allRules.map((rule) => [`${rulePrefix}/${rule.name}`, rule.severity]),
);
