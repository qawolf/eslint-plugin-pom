import { aaaBannerFormatRule } from "./rules/aaaBannerFormat.js";
import { assertExpectPairingRule } from "./rules/assertExpectPairing.js";
import { correctBaseClassRule } from "./rules/correctBaseClass.js";
import { entryPointFactoryRule } from "./rules/entryPointFactory.js";
import { fileNamingConventionRule } from "./rules/fileNamingConvention.js";
import { flowExportStructureRule } from "./rules/flowExportStructure.js";
import { noAnySharedStateRule } from "./rules/noAnySharedState.js";
import { noCodeBetweenStepsRule } from "./rules/noCodeBetweenSteps.js";
import { noDirectPomConstructionRule } from "./rules/noDirectPomConstruction.js";
import { noExpectInFlowsRule } from "./rules/noExpectInFlows.js";
import { noFetchAxiosInFlowsRule } from "./rules/noFetchAxiosInFlows.js";
import { noInlineLocatorInPageObjectRule } from "./rules/noInlineLocatorInPageObject.js";
import { noLegacySelectorsRule } from "./rules/noLegacySelectors.js";
import { noMutableStateInPomRule } from "./rules/noMutableStateInPom.js";
import { noNonNullAssertionRule } from "./rules/noNonNullAssertion.js";
import { noParameterPropertiesRule } from "./rules/noParameterProperties.js";
import { noPublicConstructorRule } from "./rules/noPublicConstructor.js";
import { noRawPageInFlowsRule } from "./rules/noRawPageInFlows.js";
import { noSelectorsInFlowsRule } from "./rules/noSelectorsInFlows.js";
import { noWaitForTimeoutInPomsRule } from "./rules/noWaitForTimeoutInPoms.js";
import { requireEnvPatternRule } from "./rules/requireEnvPattern.js";
import { requireLocatorJsdocRule } from "./rules/requireLocatorJsdoc.js";
import { requireValueImportForCreatedPageRule } from "./rules/requireValueImportForCreatedPage.js";
import { selectorGetterShapeRule } from "./rules/selectorGetterShape.js";
import { testAaaCommentsRule } from "./rules/testAaaComments.js";
import { typedCreateReturnRule } from "./rules/typedCreateReturn.js";
import { webFirstAssertionsRule } from "./rules/webFirstAssertions.js";
import { rulePrefix } from "./settings.js";
import type { PomLintRule } from "./types.js";

export { rulePrefix } from "./settings.js";

const allRules: PomLintRule[] = [
  // The flow / page-object boundary.
  noExpectInFlowsRule,
  noFetchAxiosInFlowsRule,
  noRawPageInFlowsRule,
  noSelectorsInFlowsRule,
  noAnySharedStateRule,

  // Flow structure.
  aaaBannerFormatRule,
  flowExportStructureRule,
  noCodeBetweenStepsRule,
  testAaaCommentsRule,

  // Page-object shape and correctness.
  assertExpectPairingRule,
  correctBaseClassRule,
  entryPointFactoryRule,
  noDirectPomConstructionRule,
  noInlineLocatorInPageObjectRule,
  noLegacySelectorsRule,
  noMutableStateInPomRule,
  noPublicConstructorRule,
  noWaitForTimeoutInPomsRule,
  requireLocatorJsdocRule,
  requireValueImportForCreatedPageRule,
  selectorGetterShapeRule,
  typedCreateReturnRule,
  webFirstAssertionsRule,

  // Workspace conventions and TypeScript hygiene.
  fileNamingConventionRule,
  noNonNullAssertionRule,
  noParameterPropertiesRule,
  requireEnvPatternRule,
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
