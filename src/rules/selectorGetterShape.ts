import type { Rule } from "eslint";
import type { Expression } from "estree";

import {
  isLocatorHolderName,
  isPageObjectContext,
  nodeType,
  typeAssertionOperand,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * The locator holder is a private getter returning `as const`.
 *
 * ```ts
 * // Reported
 * get locators() {
 *   return { signInButton: this.page.getByRole("button") };
 * }
 *
 * // Expected
 * private get locators() {
 *   return { signInButton: this.page.getByRole("button") } as const;
 * }
 * ```
 */
export const selectorGetterShapeRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

      return {
        MethodDefinition(node) {
          const name = holderName(node);
          if (!name) return;

          if (node.kind !== "get") {
            context.report({ data: { name }, messageId: "mustBeGetter", node });
            return;
          }

          if (!("accessibility" in node) || node.accessibility !== "private")
            context.report({
              data: { name },
              messageId: "mustBePrivate",
              node,
            });

          const returned = returnedExpression(node);
          if (returned && !isAsConst(returned))
            context.report({
              data: { name },
              messageId: "missingAsConst",
              node: returned,
            });
        },

        PropertyDefinition(node) {
          const name = holderName(node);
          if (!name) return;

          context.report({ data: { name }, messageId: "useGetter", node });
        },
      };
    },
    meta: {
      docs: {
        description:
          "Require the locator holder to be a private getter returning `as const`.",
        url: "https://github.com/qawolf/eslint-plugin-pom#selector-getter-shape",
      },
      messages: {
        missingAsConst:
          "Add `as const` to the object `{{name}}` returns: `return { ... } as const;`. Without it TypeScript only knows the object holds locators, not which names are in it, so a typo like `this.{{name}}.signInButtn` compiles and fails when the test runs instead of being underlined in the editor.",
        mustBeGetter:
          "`{{name}}` is a method, so reading a locator from it means calling it: `this.{{name}}().signInButton`. Change it to `private get {{name}}()` and it reads `this.{{name}}.signInButton`, the same as every other page object.",
        mustBePrivate:
          "Add `private` to the `{{name}}` getter. While it is public a flow can reach in and use these locators directly, and then a markup change breaks the flow as well as this file. Only this page object's own methods should touch them.",
        useGetter:
          "`{{name}}` is a field. Change it to `private get {{name}}()` returning the same object, so it matches every other page object and is built each time it is read rather than once when the page object is constructed.",
      },
      schema: [],
      type: "suggestion",
    },
  },

  name: "selector-getter-shape",

  severity: "warn",
};

function holderName(node: Rule.Node): string | undefined {
  if (node.type !== "MethodDefinition" && node.type !== "PropertyDefinition")
    return undefined;
  if (node.key.type !== "Identifier") return undefined;

  return isLocatorHolderName(node.key.name) ? node.key.name : undefined;
}

function returnedExpression(node: Rule.Node): Expression | undefined {
  if (node.type !== "MethodDefinition") return undefined;
  const { body } = node.value;
  if (!body || body.type !== "BlockStatement") return undefined;

  for (const statement of body.body) {
    if (statement.type === "ReturnStatement" && statement.argument)
      return statement.argument;
  }

  return undefined;
}

/**
 * Walks the whole wrapper chain rather than only the outermost node, so
 * `({ … } as const) satisfies Locators` still counts.
 */
function isAsConst(returned: Expression): boolean {
  let current: unknown = returned;

  while (current !== undefined) {
    if (assertsConstType(current)) return true;
    current = typeAssertionOperand(current);
  }

  return false;
}

/** `{ … } as const` parses to a TSAsExpression naming the `const` type. */
function assertsConstType(node: unknown): boolean {
  if (typeof node !== "object" || node === null) return false;
  if (!("typeAnnotation" in node)) return false;

  const annotation: unknown = node.typeAnnotation;
  if (typeof annotation !== "object" || annotation === null) return false;
  if (nodeType(annotation) !== "TSTypeReference") return false;
  if (!("typeName" in annotation)) return false;

  const typeName: unknown = annotation.typeName;
  if (typeof typeName !== "object" || typeName === null) return false;
  return "name" in typeName && typeName.name === "const";
}
