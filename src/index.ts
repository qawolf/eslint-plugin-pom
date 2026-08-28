import { assertExpectPairingRule } from "./rules/assertExpectPairing.js";
import { correctBaseClassRule } from "./rules/correctBaseClass.js";
import { entryPointFactoryRule } from "./rules/entryPointFactory.js";
import { noDirectPomConstructionRule } from "./rules/noDirectPomConstruction.js";
import { noInlineLocatorInPageObjectRule } from "./rules/noInlineLocatorInPageObject.js";
import { noWaitForTimeoutInPomsRule } from "./rules/noWaitForTimeoutInPoms.js";
import { noLegacySelectorsRule } from "./rules/noLegacySelectors.js";
import { noMutableStateInPomRule } from "./rules/noMutableStateInPom.js";
import { noPublicConstructorRule } from "./rules/noPublicConstructor.js";
import { selectorGetterShapeRule } from "./rules/selectorGetterShape.js";
import { typedCreateReturnRule } from "./rules/typedCreateReturn.js";
import { webFirstAssertionsRule } from "./rules/webFirstAssertions.js";
import { rulePrefix } from "./settings.js";
import type { PomLintRule } from "./types.js";

export { rulePrefix } from "./settings.js";

const allRules: PomLintRule[] = [
  assertExpectPairingRule,
  correctBaseClassRule,
  entryPointFactoryRule,
  noDirectPomConstructionRule,
  noInlineLocatorInPageObjectRule,
  noLegacySelectorsRule,
  noMutableStateInPomRule,
  noPublicConstructorRule,
  noWaitForTimeoutInPomsRule,
  selectorGetterShapeRule,
  typedCreateReturnRule,
  webFirstAssertionsRule,
];

export const rules = Object.fromEntries(
  allRules.map((rule) => [rule.name, rule.module]),
);

export const ruleSeverities = Object.fromEntries(
  allRules.map((rule) => [`${rulePrefix}/${rule.name}`, rule.severity]),
);

const plugin = { meta: { name: "@qawolf/eslint-plugin-pom" }, rules };

export const configs = {
  recommended: {
    files: ["**/*.ts", "**/*.mts", "**/*.cts"],
    plugins: { [rulePrefix]: plugin },
    rules: ruleSeverities,
  },
};

export default { ...plugin, configs };
