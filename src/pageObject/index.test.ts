import type { Rule } from "eslint";
import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import {
  enclosingClassMember,
  isLocatorHolder,
  isPageObjectFile,
} from "./index.js";

// RuleTester takes the parser as a resolved path, and this package is ESM.
// A Node built-in is fine here: only the rules are constrained, not the tests.
const require = createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
});

describe("isPageObjectFile", () => {
  // Each host spells the same file differently, and a rule that only matched
  // one of these would report nothing in the others.
  it.each([
    ["file:///src/pages/home-page.ts", "editor"],
    ["/src/pages/home-page.ts", "agent"],
    ["src/pages/home-page.ts", "plain workspace path"],
    ["file:///src/pages/auth/sign-in-page.ts", "editor, nested"],
    ["/src/pages/auth/sign-in-page.ts", "agent, nested"],
    // Percent-encoding survives the check: encodeURIComponent leaves letters,
    // `.` and the `/` separators alone, so no decoding is needed.
    ["file:///src/pages/order%5B1%5D-page.ts", "editor, encoded segment"],
  ])("accepts %s (%s)", (filename) => {
    expect(isPageObjectFile(filename)).toBe(true);
  });

  it.each([
    ["src/flows/checkout.flow.ts"],
    ["/src/lib/register-pages.ts"],
    ["file:///src/utilities/helpers.ts"],
    // The trailing slash matters, or a sibling directory would match.
    ["src/pages-legacy/home-page.ts"],
    // Not TypeScript.
    ["src/pages/home-page.js"],
    ["file:///src/pages/README.md"],
    // RuleTester's default when a case omits `filename`. Pinned so a test
    // written without one fails loudly instead of passing vacuously.
    ["<input>"],
  ])("rejects %s", (filename) => {
    expect(isPageObjectFile(filename)).toBe(false);
  });
});

/**
 * Exercises the AST helpers through a real rule, so the nodes they see are the
 * ones ESLint actually hands a rule. Reports every `this.page` outside a
 * locator holder -- the combination the ported rules rely on.
 */
const probe: Rule.RuleModule = {
  create(context) {
    return {
      MemberExpression(node) {
        if (node.property.type !== "Identifier") return;
        if (node.property.name !== "page") return;
        if (node.object.type !== "ThisExpression") return;

        const member = enclosingClassMember(node);
        if (!member || isLocatorHolder(member)) return;

        context.report({ messageId: "found", node });
      },
    };
  },
  meta: { messages: { found: "found" } },
};

const found = [{ messageId: "found" }];

ruleTester.run("pageObject AST helpers", probe, {
  invalid: [
    {
      code: `class P extends BasePageObject { go() { return this.page; } }`,
      errors: found,
    },
    {
      // A page object extending another page object. This was the blind spot
      // under base-class scoping.
      code: `class P extends LoginPage { go() { return this.page; } }`,
      errors: found,
    },
    {
      code: `const P = class extends BasePageObject { go() { return this.page; } };`,
      errors: found,
    },
    {
      // A getter, but not one of the locator holders.
      code: `class P extends BasePageObject { private get header() { return this.page; } }`,
      errors: found,
    },
    {
      // A plain method of that name is neither the getter nor a property.
      code: `class P extends BasePageObject { locators() { return { a: this.page }; } }`,
      errors: found,
    },
    {
      // The innermost member wins, so the outer holder does not excuse a
      // nested class's method.
      code: `class P extends BasePageObject {
        private get locators() {
          const Inner = class { go() { return this.page; } };
          return { a: Inner } as const;
        }
      }`,
      errors: found,
    },
  ],
  valid: [
    // Not inside a class member at all.
    { code: `function go(self) { return self.page; }` },
    // Inside a locator holder, in each spelling the convention allows.
    {
      code: `class P extends BasePageObject { private get locators() { return { a: this.page } as const; } }`,
    },
    {
      code: `class P extends BasePageObject { private get selectors() { return { a: this.page } as const; } }`,
    },
    {
      code: `class P extends BasePageObject { private get dynamicSelectors() { return { a: this.page } as const; } }`,
    },
    {
      code: `class P extends BasePageObject { private readonly locators = { a: this.page }; }`,
    },
    {
      // A dynamic entry is a function, which is why the check keys on the member.
      code: `class P extends BasePageObject { private get dynamicLocators() { return { a: (x: string) => this.page } as const; } }`,
    },
  ],
});
