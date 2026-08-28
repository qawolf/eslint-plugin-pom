import type { Rule } from "eslint";

import { isPageObjectContext } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

export const entryPointFactoryRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

      return {
        ClassBody(node) {
          const declaration = node.parent;
          if (!extendsEntryPoint(declaration)) return;

          const hasCreate = node.body.some(
            (member) =>
              member.type === "MethodDefinition" &&
              member.static &&
              member.key.type === "Identifier" &&
              member.key.name === "create",
          );
          if (hasCreate) return;

          context.report({
            data: { name: className(declaration) },
            messageId: "missingCreate",
            node: declaration,
          });
        },
      };
    },
    meta: {
      docs: {
        description:
          "An entry point declares a `static create()`, so a flow has a way to open the page it starts on.",
        url: "https://github.com/qawolf/eslint-plugin-pom#entry-point-factory",
      },
      messages: {
        missingCreate:
          "`{{name}}` extends `EntryPointPageObject` but has no `static create()`, so a flow has no way to open this page -- the constructor is protected, and `create` is what launches the browser and installs the page hooks. Add `static async create(options?: { instantiatedPage?: Page; url?: string })`, copying the shape from another entry point under `src/pages/`.",
      },
      schema: [],
      type: "suggestion",
    },
  },

  name: "entry-point-factory",

  severity: "warn",
};

function extendsEntryPoint(node: Rule.Node): boolean {
  if (node.type !== "ClassDeclaration" && node.type !== "ClassExpression")
    return false;

  const { superClass } = node;
  return (
    superClass?.type === "Identifier" &&
    superClass.name === "EntryPointPageObject"
  );
}

function className(node: Rule.Node): string {
  if (node.type !== "ClassDeclaration" && node.type !== "ClassExpression")
    return "This class";

  return node.id?.name ?? "This class";
}
