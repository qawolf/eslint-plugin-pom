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
          "`{{method}}()` should not be used here -- {{reason}}. Wait for the thing this was really waiting for: `await this.locators.someElement.waitFor()` for an element, `await this.page.waitForURL(pattern)` for a navigation, or a web-first `await expect(...)` for a state. Each of those keeps checking until it is true or the timeout runs out. Work out what the wait was covering rather than deleting it -- delete it and the test passes on a fast machine and fails in CI.",
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
