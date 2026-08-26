import { enclosingClassMember, isPageObjectFile } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * Only `assert*` methods hold assertions.
 *
 * ```ts
 * // Reported
 * async signIn() {
 *   await this.locators.signInButton.click();
 *   await expect(this.locators.banner).toBeVisible();
 * }
 *
 * // Expected
 * async signIn() { await this.locators.signInButton.click(); }
 * async assertSignedIn() { await expect(this.locators.banner).toBeVisible(); }
 * ```
 */
export const assertExpectPairingRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        CallExpression(node) {
          if (node.callee.type !== "Identifier") return;
          if (node.callee.name !== "expect") return;

          const method = enclosingClassMember(node);
          if (!method || method.type !== "MethodDefinition") return;
          if (method.kind === "constructor") return;
          if (method.key.type !== "Identifier") return;

          const name = method.key.name;
          if (isAssertName(name)) return;

          context.report({
            data: { name, suggestion: assertName(name) },
            messageId: "expectOutsideAssert",
            node,
          });
        },
      };
    },
    meta: {
      messages: {
        expectOutsideAssert:
          "`{{name}}` does something to the page and also asserts. Leave the actions here and move this `expect` into a new `{{suggestion}}` method, then call `{{suggestion}}` from the flow. Flows are written Arrange / Act / Assert, so a flow that only wants the action currently gets the assertion too and cannot avoid it. Do call the new method somewhere -- if the assertion moves out and nothing calls it, the flow passes while checking nothing.",
      },
    },
  },

  name: "assert-expect-pairing",

  severity: "warn",
};

function isAssertName(name: string): boolean {
  return /^assert[A-Z]/.test(name);
}

function assertName(name: string): string {
  return `assert${name.charAt(0).toUpperCase()}${name.slice(1)}()`;
}
