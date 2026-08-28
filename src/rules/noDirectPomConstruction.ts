import type { Rule } from "eslint";

import {
  isPageObjectFile,
  isPageObjectName,
  isThisPageExpression,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * Sibling page objects come from the registry, not from `new`.
 *
 * ```ts
 * // Reported
 * async goToDashboard() { return new DashboardPage(this.page); }
 *
 * // Expected
 * async goToDashboard(): Promise<DashboardPage> {
 *   return this.create("DashboardPage");
 * }
 * ```
 */
export const noDirectPomConstructionRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        NewExpression(node) {
          if (node.callee.type !== "Identifier") return;
          if (!node.arguments.some(isThisPageExpression)) return;

          const { name } = node.callee;
          if (!isPageObjectName(name)) return;
          // A page object's own static factory does `new ThisPage(page)`.
          if (name === enclosingClassName(node)) return;

          context.report({ data: { name }, messageId: "useCreate", node });
        },
      };
    },
    meta: {
      messages: {
        useCreate:
          '`new {{name}}(...)` builds another page object directly. Ask the registry for it instead: `await this.create("{{name}}")`, with the name spelled exactly as the class is. The method has to be `async` to await it.',
      },
    },
  },

  name: "no-direct-pom-construction",

  severity: "warn",
};

function enclosingClassName(node: Rule.Node): string | undefined {
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (
      current.type === "ClassDeclaration" ||
      current.type === "ClassExpression"
    )
      return current.id?.name;

    current = current.parent;
  }

  return undefined;
}
