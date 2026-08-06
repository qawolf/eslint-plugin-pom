import type { Rule } from "eslint";
import type { Expression, Property } from "estree";

import {
  isLocatorHolderName,
  isPageObjectFile,
  nodeType,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * Each entry in a locator holder says which element it targets, in a JSDoc
 * comment above it.
 *
 * ```ts
 * private get locators() {
 *   return {
 *     signInButton: this.page.getByRole("button"),   // reported
 *   } as const;
 * }
 * ```
 */
export const selectorJsdocRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        MethodDefinition(node) {
          if (node.kind !== "get") return;
          if (node.key.type !== "Identifier") return;
          if (!isLocatorHolderName(node.key.name)) return;

          for (const property of holderProperties(node)) {
            const comments = context.sourceCode.getCommentsBefore(property.key);
            const last = comments.at(-1);
            if (last?.type === "Block" && last.value.startsWith("*")) continue;

            context.report({
              data: { name: entryName(property) },
              messageId: "missingJsdoc",
              node: property,
            });
          }
        },
      };
    },
    meta: {
      messages: {
        missingJsdoc:
          "Describe what `{{name}}` targets in a `/** ... */` comment above it. The selector says how to find the element; the comment says which element it is, which is what someone needs when the markup changes and the selector stops matching.",
      },
    },
  },

  name: "selector-jsdoc",

  severity: "warn",
};

function holderProperties(node: Rule.Node): Property[] {
  if (node.type !== "MethodDefinition") return [];
  const { body } = node.value;
  if (!body || body.type !== "BlockStatement") return [];

  for (const statement of body.body) {
    if (statement.type !== "ReturnStatement" || !statement.argument) continue;

    const object = unwrapAsExpression(statement.argument);
    if (object.type !== "ObjectExpression") return [];

    return object.properties.filter(
      (property): property is Property => property.type === "Property",
    );
  }

  return [];
}

/** `{ ... } as const` wraps the object in a TSAsExpression, which ESTree omits. */
function unwrapAsExpression(node: Expression): Expression {
  if (nodeType(node) !== "TSAsExpression") return node;
  if (!("expression" in node)) return node;

  const inner = node.expression;
  return typeof inner === "object" && inner !== null && "type" in inner
    ? inner
    : node;
}

function entryName(property: Property): string {
  const { key } = property;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return "this selector";
}
