import type { Rule } from "eslint";
import type { Expression } from "estree";

import {
  isLocatorHolderName,
  isPageObjectFile,
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
      if (!isPageObjectFile(context.filename)) return {};

      return {
        MethodDefinition(node) {
          if (!isHolderKey(node)) return;

          const name = holderName(node);
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
          if (!isHolderKey(node)) return;

          context.report({
            data: { name: holderName(node) },
            messageId: "useGetter",
            node,
          });
        },
      };
    },
    meta: {
      messages: {
        missingAsConst:
          "Return the `{{name}}` object `as const`. Without it every entry widens to `Locator`, so a typo in `this.{{name}}.someName` is only caught when the test runs.",
        mustBeGetter:
          "Make `{{name}}` a getter (`private get {{name}}()`), not a method. Every page object spells this the same way, and callers read `this.{{name}}.signInButton` rather than calling it.",
        mustBePrivate:
          "Mark the `{{name}}` getter `private`. Locators are this page object's own business — a flow that reaches into them is coupled to markup the page object exists to hide.",
        useGetter:
          "Make `{{name}}` a `private get {{name}}()` getter rather than a field, so it matches every other page object and is evaluated on access.",
      },
    },
  },

  name: "selector-getter-shape",

  severity: "warn",
};

function isHolderKey(node: Rule.Node): boolean {
  if (node.type !== "MethodDefinition" && node.type !== "PropertyDefinition")
    return false;

  return node.key.type === "Identifier" && isLocatorHolderName(node.key.name);
}

function holderName(node: Rule.Node): string {
  if (
    (node.type === "MethodDefinition" || node.type === "PropertyDefinition") &&
    node.key.type === "Identifier"
  )
    return node.key.name;

  return "locators";
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
