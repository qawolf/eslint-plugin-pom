import type { Rule } from "eslint";

import {
  enclosingClassMember,
  isPageObjectContext,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

const untypedReturns = new Set([
  "any",
  "Promise<any>",
  "Promise<unknown>",
  "Promise<void>",
  "unknown",
  "void",
]);

export const typedCreateReturnRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

      return {
        ReturnStatement(node) {
          const page = createdPageName(node);
          if (!page) return;

          const method = enclosingClassMember(node);
          if (!method || method.type !== "MethodDefinition") return;
          if (method.key.type !== "Identifier") return;

          const suggestion = isAsyncMethod(method) ? `Promise<${page}>` : page;
          const annotation = returnTypeText(context, method);
          if (annotation === undefined) {
            context.report({
              data: { method: method.key.name, page, suggestion },
              messageId: "missingReturnType",
              node,
            });
            return;
          }

          if (untypedReturns.has(annotation))
            context.report({
              data: {
                current: annotation,
                method: method.key.name,
                page,
                suggestion,
              },
              messageId: "uselessReturnType",
              node,
            });
        },
      };
    },
    meta: {
      docs: {
        description:
          "A method handing back another page object declares which one, so the caller's use of it is type-checked.",
        url: "https://github.com/qawolf/eslint-plugin-pom#typed-create-return",
      },
      messages: {
        missingReturnType:
          "`{{method}}` hands back a `{{page}}`, so give it the return type `: {{suggestion}}`. Without it the caller gets whatever the call infers -- `BasePageObject` or `any` -- and `{{page}}`'s own methods are either missing or unchecked.",
        uselessReturnType:
          "`{{method}}` hands back a `{{page}}` but its return type says `{{current}}`, which tells the caller nothing about it. Change the return type to `: {{suggestion}}`.",
      },
      schema: [],
      type: "suggestion",
    },
  },

  name: "typed-create-return",

  severity: "warn",
};

function createdPageName(node: Rule.Node): string | undefined {
  if (node.type !== "ReturnStatement") return undefined;
  const returned = node.argument;
  if (!returned) return undefined;

  const call =
    returned.type === "AwaitExpression" ? returned.argument : returned;
  if (call.type !== "CallExpression") return undefined;
  if (call.callee.type !== "MemberExpression") return undefined;
  if (call.callee.property.type !== "Identifier") return undefined;

  const { object, property } = call.callee;

  if (property.name === "createFromPage")
    return object.type === "Identifier" ? object.name : undefined;

  if (property.name !== "create") return undefined;
  if (object.type !== "ThisExpression") return undefined;

  const [first] = call.arguments;
  if (first?.type !== "Literal") return undefined;
  return typeof first.value === "string" ? first.value : undefined;
}

function isAsyncMethod(method: Rule.Node): boolean {
  return method.type === "MethodDefinition" && method.value.async === true;
}

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
