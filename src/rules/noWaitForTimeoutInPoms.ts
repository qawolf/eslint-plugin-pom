import type { Rule } from "eslint";

import { isPageObjectFile } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const bannedWaits = new Map([
  [
    "waitForTimeout",
    "a fixed sleep passes on a fast machine and fails on a slow one",
  ],
  [
    "waitForSelector",
    "it returns before the element is stable, and it takes a selector string rather than a locator",
  ],
]);

/**
 * Wait for the thing, not for a duration.
 *
 * ```ts
 * // Reported
 * await this.page.waitForTimeout(2000);
 *
 * // Expected
 * await this.locators.banner.waitFor();
 * ```
 */
export const noWaitForTimeoutInPomsRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        CallExpression(node) {
          if (node.callee.type !== "MemberExpression") return;
          if (node.callee.property.type !== "Identifier") return;

          const method = node.callee.property.name;
          const reason = bannedWaits.get(method);
          if (!reason) return;
          if (method === "waitForTimeout" && hasJustification(context, node))
            return;

          context.report({
            data: { method, reason },
            messageId: "bannedWait",
            node,
          });
        },
      };
    },
    meta: {
      messages: {
        bannedWait:
          "`{{method}}()` waits for the wrong thing -- {{reason}}. Wait on the condition instead: `await this.locators.someElement.waitFor()` for an element, `await this.page.waitForURL(pattern)` after a navigation, or `await expect(...)` for a state. If nothing observable covers it, keep the sleep and say on the line above what it is waiting on.",
      },
    },
  },

  name: "no-wait-for-timeout-in-poms",

  severity: "warn",
};

/**
 * A fixed sleep is allowed when the author says what it is waiting on, and the
 * review checklist takes that on the same line or the line above.
 */
function hasJustification(context: Rule.RuleContext, node: Rule.Node): boolean {
  const callLine = node.loc?.start.line;
  if (callLine === undefined) return false;

  return context.sourceCode.getAllComments().some((comment) => {
    const commentLine = comment.loc?.end.line;
    return commentLine === callLine || commentLine === callLine - 1;
  });
}
