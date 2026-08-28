import type { Rule } from "eslint";

import {
  isPageObjectContext,
  isPageObjectName,
  isThisPageExpression,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const baseClasses = new Set([
  "BasePageObject",
  "EntryPointPageObject",
  "SubPageObject",
]);

export const correctBaseClassRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

      return {
        ClassBody(node) {
          const declaration = node.parent;
          if (
            declaration.type !== "ClassDeclaration" &&
            declaration.type !== "ClassExpression"
          )
            return;
          if (!usesPage(node)) return;

          const { superClass } = declaration;
          const name = declaration.id?.name ?? "This class";

          if (!superClass) {
            context.report({
              data: { name },
              messageId: "missingBase",
              node: declaration,
            });
            return;
          }

          // An unresolvable superclass expression is not worth guessing about.
          if (superClass.type !== "Identifier") return;
          if (baseClasses.has(superClass.name)) return;
          // Extending another page object is allowed, and names no base class.
          if (isPageObjectName(superClass.name)) return;

          context.report({
            data: { name, superClass: superClass.name },
            messageId: "unknownBase",
            node: declaration,
          });
        },
      };
    },
    meta: {
      docs: {
        description:
          "A class that drives the page extends a page-object base, so it gets `this.page`, `this.create()` and the page hooks.",
        url: "https://github.com/qawolf/eslint-plugin-pom#correct-base-class",
      },
      messages: {
        missingBase:
          "`{{name}}` reads `this.page`, so it is a page object, but it extends nothing -- and `this.page`, `this.create()` and the page hooks all come from the base class. Extend `BasePageObject`, or `EntryPointPageObject` if a flow starts on this page, or `SubPageObject<Parent>` if it is part of another page. Import the base from wherever the other files here import it.",
        unknownBase:
          "`{{name}}` extends `{{superClass}}`, which is not a page object base class, so it gets none of `this.page`, `this.create()` or the page hooks. Extend `BasePageObject`, `EntryPointPageObject` or `SubPageObject<Parent>` instead -- and if `{{superClass}}` was giving this class something, move that across first.",
      },
      schema: [],
      type: "suggestion",
    },
  },

  name: "correct-base-class",

  severity: "warn",
};

function usesPage(node: Rule.Node): boolean {
  if (node.type !== "ClassBody") return false;

  return node.body.some((member) => readsThisPage(member));
}

/** `Object.entries` walks arrays too, so their elements need no special case. */
function readsThisPage(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  if (isThisPageExpression(value)) return true;

  return Object.entries(value).some(
    ([key, child]) => key !== "parent" && readsThisPage(child),
  );
}
