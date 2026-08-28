import { aaaBannerFormatRule } from "./rules/aaaBannerFormat.js";
import { assertExpectPairingRule } from "./rules/assertExpectPairing.js";
import { entryPointFactoryRule } from "./rules/entryPointFactory.js";
import { fileNamingConventionRule } from "./rules/fileNamingConvention.js";
import { flowExportStructureRule } from "./rules/flowExportStructure.js";
import { noAnySharedStateRule } from "./rules/noAnySharedState.js";
import { noCodeBetweenStepsRule } from "./rules/noCodeBetweenSteps.js";
import { noExpectInFlowsRule } from "./rules/noExpectInFlows.js";
import { noFetchAxiosInFlowsRule } from "./rules/noFetchAxiosInFlows.js";
import { noInlineLocatorInPageObjectRule } from "./rules/noInlineLocatorInPageObject.js";
import { noLegacySelectorsRule } from "./rules/noLegacySelectors.js";
import { noMutableStateInPageObjectRule } from "./rules/noMutableStateInPageObject.js";
import { noNonNullAssertionRule } from "./rules/noNonNullAssertion.js";
import { noPageObjectConstructorRule } from "./rules/noPageObjectConstructor.js";
import { noParameterPropertiesRule } from "./rules/noParameterProperties.js";
import { noRawPageInFlowsRule } from "./rules/noRawPageInFlows.js";
import { noSelectorsInFlowsRule } from "./rules/noSelectorsInFlows.js";
import { noWaitForTimeoutRule } from "./rules/noWaitForTimeout.js";
import { requireEnvPatternRule } from "./rules/requireEnvPattern.js";
import { requireLocatorJsdocRule } from "./rules/requireLocatorJsdoc.js";
import { requirePageObjectBaseClassRule } from "./rules/requirePageObjectBaseClass.js";
import { requireValueImportForCreatedPageRule } from "./rules/requireValueImportForCreatedPage.js";
import { selectorGetterShapeRule } from "./rules/selectorGetterShape.js";
import { testAaaCommentsRule } from "./rules/testAaaComments.js";
import { webFirstAssertionsRule } from "./rules/webFirstAssertions.js";
import type { PomLintRule } from "./types.js";

/**
 * The name a config registers this plugin under. Deliberately not `@qawolf/pom`
 * -- that is a different, published package, and sharing the name would make a
 * rule id look like it ships from there.
 */
export const rulePrefix = "@qawolf/pom-lint";

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
  entryPointFactoryRule,
  noInlineLocatorInPageObjectRule,
  noLegacySelectorsRule,
  noMutableStateInPageObjectRule,
  noPageObjectConstructorRule,
  noWaitForTimeoutRule,
  requireLocatorJsdocRule,
  requirePageObjectBaseClassRule,
  requireValueImportForCreatedPageRule,
  selectorGetterShapeRule,
  webFirstAssertionsRule,

  // Workspace conventions and TypeScript hygiene.
  fileNamingConventionRule,
  noNonNullAssertionRule,
  noParameterPropertiesRule,
  requireEnvPatternRule,
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
