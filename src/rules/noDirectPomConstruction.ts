import type { Rule } from "eslint";

import {
  isPageObjectContext,
  isPageObjectName,
  isThisPageExpression,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

export const noDirectPomConstructionRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

      return {
        NewExpression(node) {
          if (node.callee.type !== "Identifier") return;
          if (!node.arguments.some(isThisPageExpression)) return;

          const { name } = node.callee;
          if (!isPageObjectName(name)) return;
          // A page object's own static factory does `new ThisPage(page)`.
          if (name === enclosingClassName(node)) return;

          context.report({ data: { name }, messageId: "useCreate", node });
        },
      };
    },
    meta: {
      docs: {
        description:
          "Get sibling page objects from the registry rather than `new`, so every instance is built and hooked up the same way.",
        url: "https://github.com/qawolf/eslint-plugin-pom#no-direct-pom-construction",
      },
      messages: {
        useCreate:
          '`new {{name}}(...)` builds another page object directly. Ask the registry for it instead: `await this.create("{{name}}")`, with the name spelled exactly as the class is. The method has to be `async` to await it.',
      },
      schema: [],
      type: "suggestion",
    },
  },

  name: "no-direct-pom-construction",

  severity: "warn",
};

function enclosingClassName(node: Rule.Node): string | undefined {
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (
      current.type === "ClassDeclaration" ||
      current.type === "ClassExpression"
    )
      return current.id?.name;

    current = current.parent;
  }

  return undefined;
}
