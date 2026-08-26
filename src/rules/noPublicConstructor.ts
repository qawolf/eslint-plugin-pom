import { isPageObjectFile } from "../pageObject/index.js";
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
          "This constructor is public, while the one it overrides on `BasePageObject` is `protected`. Public means any code can call `new` on this page object and get an instance without going through the page registry that `this.create()` uses. If the body only calls `super(page)`, delete the whole constructor -- it is inherited, so nothing changes. If it does more than that, add `protected` in front.",
      },
    },
  },

  name: "no-public-constructor",

  severity: "warn",
};
