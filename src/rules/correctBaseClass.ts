import type { Rule } from "eslint";

import {
  isPageObjectFile,
  isPageObjectName,
  isThisPageExpression,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const baseClasses = new Set([
  "BasePageObject",
  "EntryPointPageObject",
  "SubPageObject",
]);

/**
 * A class driving a page is a page object, and says so.
 *
 * ```ts
 * // Reported
 * export class SignInPage {
 *   async signIn() { await this.page.getByRole("button").click(); }
 * }
 *
 * // Expected
 * export class SignInPage extends BasePageObject { ... }
 * ```
 */
export const correctBaseClassRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

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
      messages: {
        missingBase:
          "`{{name}}` reads `this.page`, so it is a page object, but it extends nothing -- and `this.page`, `this.create()` and the page hooks all come from the base class. Extend `BasePageObject`, or `EntryPointPageObject` if a flow starts on this page, or `SubPageObject<Parent>` if it is part of another page. Import the base from wherever the other files here import it.",
        unknownBase:
          "`{{name}}` extends `{{superClass}}`, which is not a page object base class, so it gets none of `this.page`, `this.create()` or the page hooks. Extend `BasePageObject`, `EntryPointPageObject` or `SubPageObject<Parent>` instead -- and if `{{superClass}}` was giving this class something, move that across first.",
      },
    },
  },

  name: "correct-base-class",

  severity: "warn",
};

/** True when any member of this class body reads `this.page`. */
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
