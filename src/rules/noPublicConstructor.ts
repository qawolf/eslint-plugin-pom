import {
  enclosingClass,
  isPageObjectClass,
  isPageObjectContext,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

export const noPublicConstructorRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectContext(context)) return {};

      return {
        MethodDefinition(node) {
          if (node.kind !== "constructor") return;
          if (!isPageObjectClass(enclosingClass(node))) return;
          // Omitted means public, and `public` says so outright.
          if (
            "accessibility" in node &&
            (node.accessibility === "protected" ||
              node.accessibility === "private")
          )
            return;

          context.report({ messageId: "publicConstructor", node });
        },
      };
    },
    meta: {
      docs: {
        description:
          "Keep a redeclared constructor `protected`, so the registry stays the only way to build a page object.",
        url: "https://github.com/qawolf/eslint-plugin-pom#no-public-constructor",
      },
      messages: {
        publicConstructor:
          "This constructor is public, but the one it overrides on `BasePageObject` is `protected`, so this lets any code call `new` and skip the registry. If the body only calls `super(page)`, delete the constructor -- it is inherited either way. Otherwise put `protected` in front of it.",
      },
      schema: [],
      type: "suggestion",
    },
  },

  name: "no-public-constructor",

  severity: "warn",
};
