import type { Rule } from "eslint";

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

          if (isInsideLoop(node)) return;

          const method = enclosingClassMember(node);
          if (!method || method.type !== "MethodDefinition") return;
          if (method.kind === "constructor") return;
          if (method.key.type !== "Identifier") return;

          const name = method.key.name;
          if (isAssertName(name) || isSyncPointName(name)) return;

          if (isExpectName(name)) {
            context.report({
              data: { name, suggestion: renamedFromExpect(name) },
              messageId: "expectPrefixedName",
              node,
            });
            return;
          }

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
        expectPrefixedName:
          "`{{name}}` already only asserts, so rename it to `{{suggestion}}` rather than moving anything. Verification methods carry the `assert` prefix; a flow reading `expect` in the call misses that this line is the check.",
      },
    },
  },

  name: "assert-expect-pairing",

  severity: "warn",
};

function isAssertName(name: string): boolean {
  return /^assert[A-Z]/.test(name);
}

/**
 * `waitFor*` names a sync point a caller awaits before its next action, and
 * `await expect(locator).toBeVisible()` is how the convention says to wait. So
 * the `expect` in one is the method doing its job, not an assertion to move out.
 */
function isSyncPointName(name: string): boolean {
  return /^waitFor([A-Z]|$)/.test(name);
}

const loopTypes = new Set([
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "WhileStatement",
]);

/**
 * A cleanup method deletes every match in a bounded loop, and the convention
 * requires `await expect(rows).toHaveCount(countBeforeDelete - 1)` each
 * iteration: without it the next iteration can open a stale row. That settle
 * wait is the loop's own sync point, and moving it to an `assert*` method would
 * break the loop it paces.
 */
function isInsideLoop(node: Rule.Node): boolean {
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (loopTypes.has(current.type)) return true;
    if (
      current.type === "MethodDefinition" ||
      current.type === "PropertyDefinition"
    )
      return false;

    current = current.parent;
  }

  return false;
}

/** `expectHeadingVisible` is already an assertion method under older naming. */
function isExpectName(name: string): boolean {
  return /^expect[A-Z]/.test(name);
}

function renamedFromExpect(name: string): string {
  return `assert${name.slice("expect".length)}()`;
}

function assertName(name: string): string {
  return `assert${name.charAt(0).toUpperCase()}${name.slice(1)}()`;
}
