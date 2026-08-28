import type { Expression, SpreadElement } from "estree";

import { isPageObjectFile } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const selectorMethods = new Set(["frameLocator", "locator"]);

/**
 * Bans XPath and the deprecated Playwright selector engines.
 *
 * ```ts
 * // Reported
 * this.page.locator("//div[@id='ok']");
 * this.page.locator("text=Sign in");
 * this.page.locator("form >> button");
 *
 * // Expected
 * this.page.getByRole("button", { name: "Sign in" });
 * this.page.locator("form").locator("button");
 * ```
 */
export const noLegacySelectorsRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        CallExpression(node) {
          if (node.callee.type !== "MemberExpression") return;
          if (node.callee.property.type !== "Identifier") return;
          if (!selectorMethods.has(node.callee.property.name)) return;

          const [argument] = node.arguments;
          if (!argument) return;

          for (const text of staticStrings(argument)) {
            const messageId = classify(text);
            if (!messageId) continue;

            context.report({
              data: { text: text.trim().slice(0, 40) },
              messageId,
              node: argument,
            });
            return;
          }
        },
      };
    },
    meta: {
      messages: {
        noChainCombinator:
          '`{{text}}` uses `>>`, old Playwright syntax for two selectors in one string. Chain them instead: `.locator("form").locator("button")`. Only rewrite it when the new form finds the same element -- satisfying this rule is not a reason to change what the test acts on.',
        noLegacyEngine:
          '`{{text}}` uses an old Playwright engine prefix. Current Playwright takes a plain CSS selector or a `getBy*` method: `text=Sign in` becomes `getByText("Sign in")`, `id=submit` becomes `#submit`, and `css=` can be dropped. Only rewrite it when the new form finds the same element.',
        noXpath:
          "`{{text}}` is XPath, which describes a path through the markup: it breaks as soon as anything is wrapped or moved, and it cannot see into a shadow DOM. Use `getByRole`, `getByText`, or a CSS selector on something stable like a test id. Only rewrite it when the new form finds the same element.",
      },
    },
  },

  name: "no-legacy-selectors",

  severity: "warn",
};

function classify(value: string): string | undefined {
  const text = value.trim();
  if (
    text.startsWith("//") ||
    text.startsWith("(//") ||
    text.startsWith("xpath=")
  )
    return "noXpath";
  if (/^(css|id|text)=/.test(text)) return "noLegacyEngine";
  if (text.includes(">>")) return "noChainCombinator";
  return undefined;
}

/** A template literal's static chunks still carry an engine prefix. */
function staticStrings(argument: Expression | SpreadElement): string[] {
  if (argument.type === "Literal")
    return typeof argument.value === "string" ? [argument.value] : [];

  if (argument.type === "TemplateLiteral")
    return argument.quasis.map((quasi) => quasi.value.raw);

  return [];
}
