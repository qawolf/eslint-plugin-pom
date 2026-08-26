import {
  enclosingClass,
  isPageObjectClass,
  isPageObjectFile,
} from "../pageObject/index.js";
import type { PomLintRule } from "../types.js";

/**
 * `BasePageObject`'s constructor is `protected`, so a page object that
 * redeclares one without saying `protected` widens it to public.
 *
 * ```ts
 * // Reported
 * constructor(page: Page) { super(page); }
 *
 * // Expected -- drop it, or keep the base's visibility
 * protected constructor(page: Page) { super(page); }
 * ```
 */
export const noPublicConstructorRule: PomLintRule = {
  module: {
    create(context) {
      if (!isPageObjectFile(context.filename)) return {};

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
      messages: {
        publicConstructor:
          "This constructor is public, but the one it overrides on `BasePageObject` is `protected`, so this lets any code call `new` and skip the registry. If the body only calls `super(page)`, delete the constructor -- it is inherited either way. Otherwise put `protected` in front of it.",
      },
    },
  },

  name: "no-public-constructor",

  severity: "warn",
};
