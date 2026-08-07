import type { Rule } from "eslint";

import {
  enclosingClassMember,
  isLocatorHolder,
  isPageObjectFile,
  isThisPageExpression,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * Page objects keep every locator in a named getter.
 *
 * ```ts
 * // Reported
 * async signIn() {
 *   await this.page.getByRole("button", { name: "Sign in" }).click();
 * }
 *
 * // Expected
 * private get locators() {
 *   return { signInButton: this.page.getByRole("button") } as const;
 * }
 * ```
 */
export const noInlineLocatorInPageObjectRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        MemberExpression(node) {
          const name = locatorCallName(node);
          if (!name) return;

          const member = enclosingClassMember(node);
          if (!member || isLocatorHolder(member)) return;

          context.report({ data: { name }, messageId: "inlineLocator", node });
        },
      };
    },
    meta: {
      messages: {
        inlineLocator:
          "Move this `{{name}}` call into the page object's `locators` or `dynamicLocators` (`selectors` on mobile) and reference it from here. A locator named for its purpose is fixed in one place when the markup changes; inline, it is invisible to every other method that needs the same element.",
      },
    },
  },

  name: "no-inline-locator-in-page-object",

  severity: "warn",
};

function locatorCallName(node: Rule.Node): string | undefined {
  if (node.type !== "MemberExpression") return undefined;
  if (node.property.type !== "Identifier") return undefined;
  // The callee, so `register(this.page.getByRole)` builds nothing.
  if (node.parent.type !== "CallExpression" || node.parent.callee !== node)
    return undefined;

  const { name } = node.property;
  const builds =
    name === "locator" || name === "frameLocator" || name.startsWith("getBy");
  if (!builds) return undefined;

  return isThisPageExpression(node.object) ? name : undefined;
}
