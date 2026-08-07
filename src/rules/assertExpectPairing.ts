import { enclosingMethod, isPageObjectFile } from "../pageObject/index.js";
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

          const method = enclosingMethod(node);
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
          "`{{name}}` performs an action and asserts. Move the assertion into `{{suggestion}}` so a flow can act without also asserting, and reads as arrange-act-assert. Then call `{{suggestion}}` from the flow that relied on it -- moving the assertion out without calling it anywhere leaves a flow that checks nothing and still passes.",
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
