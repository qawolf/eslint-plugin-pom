import type { Rule } from "eslint";

import {
  enclosingClassMember,
  isLocatorHolder,
  isPageObjectContext,
  isThisPageExpression,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

export const noInlineLocatorInPageObjectRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

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
      docs: {
        description:
          "Keep locators in a named getter, so a method body reads as the action it performs and a changed selector is fixed in one place.",
        url: "https://github.com/qawolf/eslint-plugin-pom#no-inline-locator-in-page-object",
      },
      messages: {
        inlineLocator:
          "This `{{name}}` call builds a locator in the middle of a method. Give it a name in the `locators` getter -- `private get locators() { return { signInButton: this.page.{{name}}(...) } as const; }` -- and use `this.locators.signInButton` here instead. Then another method needing the same element reuses the name, and when the markup changes there is one line to fix rather than every place it was written out. Use `dynamicLocators` if the locator needs an argument, or `selectors` / `dynamicSelectors` on mobile.",
      },
      schema: [],
      type: "suggestion",
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
