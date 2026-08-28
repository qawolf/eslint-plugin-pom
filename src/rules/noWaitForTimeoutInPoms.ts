import type { Rule } from "eslint";

import { isPageObjectContext } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const bannedWaits = new Map([
  ["waitForSelector", "selectorWait"],
  ["waitForTimeout", "fixedSleep"],
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
      if (!isPageObjectContext(context)) return {};

      return {
        CallExpression(node) {
          if (node.callee.type !== "MemberExpression") return;
          if (node.callee.property.type !== "Identifier") return;

          const method = node.callee.property.name;
          const messageId = bannedWaits.get(method);
          if (!messageId) return;
          if (method === "waitForTimeout" && hasJustification(context, node))
            return;

          context.report({ messageId, node });
        },
      };
    },
    meta: {
      docs: {
        description:
          "Wait on a locator or a condition instead of a fixed duration, so the wait ends when the page is ready rather than when a timer runs out.",
        url: "https://github.com/qawolf/eslint-plugin-pom#no-wait-for-timeout-in-poms",
      },
      messages: {
        fixedSleep:
          "`waitForTimeout()` waits for a duration, and a fixed sleep passes on a fast machine and fails on a slow one. Wait on the condition instead: `await this.locators.someElement.waitFor()` for an element, `await this.page.waitForURL(pattern)` after a navigation, or `await expect(...)` for a state. If nothing observable covers it, keep the `waitForTimeout()` call and put a comment saying what it is waiting for, on the same line or the line above.",
        selectorWait:
          "`waitForSelector()` returns before the element is stable, and it takes a selector string rather than a locator. Wait on the locator instead -- `await this.locators.someElement.waitFor()`, or `await expect(this.locators.someElement).toBeVisible()` for a state. A comment does not excuse this one the way it excuses `waitForTimeout()`: there is already a locator to wait on.",
      },
      schema: [],
      type: "suggestion",
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
