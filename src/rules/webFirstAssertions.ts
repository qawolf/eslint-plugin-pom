import { isPageObjectFile } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const webFirstEquivalents = new Map([
  ["count", "toHaveCount()"],
  ["getAttribute", "toHaveAttribute()"],
  ["innerText", "toHaveText()"],
  ["inputValue", "toHaveValue()"],
  ["isChecked", "toBeChecked()"],
  ["isDisabled", "toBeDisabled()"],
  ["isEnabled", "toBeEnabled()"],
  ["isHidden", "toBeHidden()"],
  ["isVisible", "toBeVisible()"],
  ["textContent", "toHaveText()"],
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
          "`expect(await ....{{read}}())` reads the value once, so it fails if the page has not caught up yet. Use `await expect(locator).{{suggestion}}` instead, which retries until it holds or the timeout expires.",
      },
    },
  },

  name: "web-first-assertions",

  severity: "warn",
};
