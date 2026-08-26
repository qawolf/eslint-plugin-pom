import type { Rule } from "eslint";

import { enclosingClassMember, isPageObjectFile } from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const untypedReturns = new Set([
  "any",
  "Promise<any>",
  "Promise<unknown>",
  "Promise<void>",
  "unknown",
  "void",
]);

/**
 * A method handing back another page object says which one.
 *
 * ```ts
 * // Reported
 * async goToDashboard() { return this.create("DashboardPage"); }
 *
 * // Expected
 * async goToDashboard(): Promise<DashboardPage> {
 *   return this.create("DashboardPage");
 * }
 * ```
 */
export const typedCreateReturnRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

      return {
        ReturnStatement(node) {
          const page = createdPageName(node);
          if (!page) return;

          const method = enclosingClassMember(node);
          if (!method || method.type !== "MethodDefinition") return;
          if (method.key.type !== "Identifier") return;

          const annotation = returnTypeText(context, method);
          if (annotation === undefined) {
            context.report({
              data: { method: method.key.name, page },
              messageId: "missingReturnType",
              node,
            });
            return;
          }

          if (untypedReturns.has(annotation))
            context.report({
              data: { current: annotation, method: method.key.name, page },
              messageId: "uselessReturnType",
              node,
            });
        },
      };
    },
    meta: {
      messages: {
        missingReturnType:
          "`{{method}}` hands back a `{{page}}` without saying so. Add `: Promise<{{page}}>` to it, and `import type` the class if this file does not already -- type-only, because two page objects importing each other as values is a circular import. Until it is annotated the caller only knows it got a `BasePageObject`, so every method on `{{page}}` looks like it does not exist and the next line will not compile.",
        uselessReturnType:
          "`{{method}}` hands back a `{{page}}` but is annotated `{{current}}`, so the caller still cannot see any of `{{page}}`'s methods. Change the annotation to `: Promise<{{page}}>`.",
      },
    },
  },

  name: "typed-create-return",

  severity: "warn",
};

/** The page name in `return this.create("Name")`, if that is what this is. */
function createdPageName(node: Rule.Node): string | undefined {
  if (node.type !== "ReturnStatement") return undefined;
  const returned = node.argument;
  if (!returned) return undefined;

  const call =
    returned.type === "AwaitExpression" ? returned.argument : returned;
  if (call.type !== "CallExpression") return undefined;
  if (call.callee.type !== "MemberExpression") return undefined;
  if (call.callee.object.type !== "ThisExpression") return undefined;
  if (call.callee.property.type !== "Identifier") return undefined;
  if (call.callee.property.name !== "create") return undefined;

  const [first] = call.arguments;
  if (first?.type !== "Literal") return undefined;
  return typeof first.value === "string" ? first.value : undefined;
}

/** Undefined when the method has no annotation at all. */
function returnTypeText(
  context: Rule.RuleContext,
  method: Rule.Node,
): string | undefined {
  if (method.type !== "MethodDefinition") return undefined;
  if (!("returnType" in method.value)) return undefined;

  const returnType = method.value.returnType;
  if (typeof returnType !== "object" || returnType === null) return undefined;
  if (!("typeAnnotation" in returnType)) return undefined;

  const annotation = returnType.typeAnnotation;
  if (typeof annotation !== "object" || annotation === null) return undefined;
  if (!("range" in annotation)) return undefined;

  // The annotation is a TypeScript node, so `getText(node)` will not take it.
  const range: unknown = annotation.range;
  if (!isSourceRange(range)) return undefined;

  return context.sourceCode.getText().slice(range[0], range[1]);
}

function isSourceRange(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}
