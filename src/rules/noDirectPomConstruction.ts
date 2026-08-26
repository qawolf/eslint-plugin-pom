import type { Rule } from "eslint";

import { isPageObjectFile, isThisPageExpression } from "../pageObject/index.js";
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
          '`new {{name}}(this.page)` builds another page object directly. Use `await this.create("{{name}}")`, which looks it up in the page registry -- that is how two page objects can use each other without importing each other as values, which would be a circular import. Two things to check when you swap it: this method has to be `async`, and `{{name}}` has to be listed in `src/lib/register-pages.ts` under exactly that name. If it is not, this compiles fine and then throws when the test runs.',
      },
    },
  },

  name: "no-direct-pom-construction",

  severity: "warn",
};

const pageObjectSuffixes = ["Component", "Modal", "Page"];

/**
 * Page objects are named for what they are. Without this, anything else handed
 * the page -- `new NetworkMonitor(this.page)` -- would be reported, and there is
 * no `this.create` to point those at.
 */
function isPageObjectName(name: string): boolean {
  return pageObjectSuffixes.some((suffix) => name.endsWith(suffix));
}

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
