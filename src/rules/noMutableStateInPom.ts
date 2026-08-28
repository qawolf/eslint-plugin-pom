import type { Rule } from "eslint";

import {
  enclosingClass,
  isLocatorHolderName,
  isPageObjectClass,
  isPageObjectContext,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

export const noMutableStateInPomRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

      return {
        PropertyDefinition(node) {
          if (node.static) return;
          if (!isPageObjectClass(enclosingClass(node))) return;
          if ("readonly" in node && node.readonly === true) return;
          if (node.key.type !== "Identifier") return;

          const name = node.key.name;
          // Inherited from BasePageObject, and a page object needs it.
          if (name === "page") return;
          // A holder in field form is selector-getter-shape's report.
          if (isLocatorHolderName(name)) return;
          if (isFunctionValued(node)) return;

          context.report({ data: { name }, messageId: "mutableField", node });
        },
      };
    },
    meta: {
      docs: {
        description:
          "Return values from methods instead of storing them on the page object, since every `this.create(...)` builds a fresh instance.",
        url: "https://github.com/qawolf/eslint-plugin-pom#no-mutable-state-in-pom",
      },
      messages: {
        mutableField:
          "`{{name}}` is state kept on the page object, and it does not survive: every `this.create(...)` builds a fresh instance, so what one method writes here is gone the next time this page object is reached for. Return the value from the method that produces it, or pass it in where it is needed. If it never changes after construction, `readonly` is enough.",
      },
      schema: [],
      type: "suggestion",
    },
  },

  name: "no-mutable-state-in-pom",

  severity: "warn",
};

/** A field holding a function is behaviour rather than remembered state. */
function isFunctionValued(node: Rule.Node): boolean {
  if (node.type !== "PropertyDefinition") return false;

  return (
    node.value?.type === "ArrowFunctionExpression" ||
    node.value?.type === "FunctionExpression"
  );
}
