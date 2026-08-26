import type { Rule } from "eslint";

import { isPageObjectFile } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * An entry point is where a flow starts, so it needs the factory that opens it.
 *
 * ```ts
 * // Expected
 * export class SignInPage extends EntryPointPageObject {
 *   static async create(options: CreateOptions = {}): Promise<SignInPage> { ... }
 * }
 * ```
 */
export const entryPointFactoryRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

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
      messages: {
        missingCreate:
          "`{{name}}` extends `EntryPointPageObject` but has no `static create()`. A flow reaches this page by calling `{{name}}.create()`, and that factory is what launches the browser and installs the page hooks before handing the instance back -- without it there is no supported way to get one, since the constructor is protected. Add a `static async create(...)` that launches and returns an instance; copy the shape from another entry point under `src/pages/`.",
      },
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
