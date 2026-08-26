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
          "`{{name}}` acts and asserts. Move the `expect` calls into a new `{{suggestion}}` method and call that from the flow. An assertion method holds no actions, and its name starts with `assert`.",
        expectPrefixedName:
          "The `{{name}}` method only asserts, so its name should start with `assert`: rename it to `{{suggestion}}`.",
      },
    },
  },

  name: "assert-expect-pairing",

  severity: "warn",
};

function isAssertName(name: string): boolean {
  return /^assert[A-Z]/.test(name);
}

/** A `waitFor*` method's `expect` is the wait itself, not an assertion. */
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
 * Stops at the enclosing member, so this is the `expect`'s own loop rather than
 * one anywhere above it. An `expect` inside a loop is the per-iteration settle
 * wait a cleanup method needs, not an assertion to move out.
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
