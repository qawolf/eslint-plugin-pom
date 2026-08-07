import { isPageObjectFile } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * Each suggestion carries its argument shape, since the value being compared
 * moves out of `expect(...)` and into the matcher.
 */
const webFirstEquivalents = new Map([
  ["count", "toHaveCount(expected)"],
  ["getAttribute", "toHaveAttribute(name, expected)"],
  ["innerText", "toHaveText(expected)"],
  ["inputValue", "toHaveValue(expected)"],
  ["isChecked", "toBeChecked()"],
  ["isDisabled", "toBeDisabled()"],
  ["isEnabled", "toBeEnabled()"],
  ["isHidden", "toBeHidden()"],
  ["isVisible", "toBeVisible()"],
  ["textContent", "toHaveText(expected)"],
]);

/**
 * Assert on the locator, not on a value read from it.
 *
 * ```ts
 * // Reported
 * expect(await this.locators.banner.isVisible()).toBe(true);
 *
 * // Expected
 * await expect(this.locators.banner).toBeVisible();
 * ```
 */
export const webFirstAssertionsRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        CallExpression(node) {
          if (node.callee.type !== "Identifier") return;
          if (node.callee.name !== "expect") return;

          const [argument] = node.arguments;
          if (argument?.type !== "AwaitExpression") return;

          const awaited = argument.argument;
          if (awaited.type !== "CallExpression") return;
          if (awaited.callee.type !== "MemberExpression") return;
          if (awaited.callee.property.type !== "Identifier") return;

          const read = awaited.callee.property.name;
          const suggestion = webFirstEquivalents.get(read);
          if (!suggestion) return;

          context.report({
            data: { read, suggestion },
            messageId: "preferWebFirst",
            node,
          });
        },
      };
    },
    meta: {
      messages: {
        preferWebFirst:
          "`await locator.{{read}}()` runs before `expect` sees it, so `expect` only gets a plain value: it checks once, at that instant, and fails if the element has not reached that state yet. Pass the locator instead -- `await expect(locator).{{suggestion}}`, or `.not.{{suggestion}}` if this assertion is a negative one -- and it re-checks until it holds or the timeout expires.",
      },
    },
  },

  name: "web-first-assertions",

  severity: "warn",
};
