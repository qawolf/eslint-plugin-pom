import type { Rule } from "eslint";

import { ruleTester } from "../testHelpers.js";
import {
  enclosingClassMember,
  isLocatorHolder,
  isPageObjectFile,
} from "./index.js";

describe("isPageObjectFile", () => {
  it.each([
    ["file:///src/pages/home-page.ts", "editor"],
    ["/src/pages/home-page.ts", "agent"],
    ["src/pages/home-page.ts", "plain workspace path"],
    ["file:///src/pages/auth/sign-in-page.ts", "editor, nested"],
    ["/src/pages/auth/sign-in-page.ts", "agent, nested"],
    ["file:///src/pages/order%5B1%5D-page.ts", "editor, encoded segment"],
    ["/Users/qae/workspace/src/pages/home-page.ts", "plain eslint, absolute"],
    ["/home/runner/work/repo/src/pages/auth/sign-in-page.ts", "CI, absolute"],
    ["C:\\Users\\qae\\workspace\\src\\pages\\home-page.ts", "Windows"],
    ["src/pages/home-page.mts", "ESM extension"],
    ["src/pages/home-page.cts", "CommonJS extension"],
    [
      "file:///C:/Users/qae/workspace/src/pages/home-page.ts",
      "Windows file URI",
    ],
  ])("accepts %s (%s)", (filename) => {
    expect(isPageObjectFile(filename, "src/pages/")).toBe(true);
  });

  it.each([
    ["src/flows/checkout.flow.ts", "flow"],
    ["/src/lib/register-pages.ts", "lib"],
    ["file:///src/utilities/helpers.ts", "utility"],
    ["src/pages-legacy/home-page.ts", "sibling directory"],
    ["/Users/qae/my-src/pages/home-page.ts", "absolute, sibling directory"],
    ["/Users/qae/notsrc/pages/home-page.ts", "absolute, name ends in src"],
    ["/Users/qae/src/pagesx/home-page.ts", "absolute, name starts with pages"],
    ["src/pages/home-page.js", "not TypeScript"],
    ["src/pages/home-page.tsx", "JSX, not a page object"],
    ["file:///src/pages/README.md", "not TypeScript"],
    ["<input>", "RuleTester default, so a case without a filename fails"],
  ])("rejects %s (%s)", (filename) => {
    expect(isPageObjectFile(filename, "src/pages/")).toBe(false);
  });

  it("matches a workspace that keeps page objects somewhere else", () => {
    expect(isPageObjectFile("e2e/pages/home-page.ts", "e2e/pages/")).toBe(true);
    expect(isPageObjectFile("src/pages/home-page.ts", "e2e/pages/")).toBe(
      false,
    );
  });
});

/** Reports every `this.page` outside a locator holder. */
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
      // Extends another page object, the blind spot under base-class scoping.
      code: `class P extends LoginPage { go() { return this.page; } }`,
      errors: found,
    },
    {
      code: `const P = class extends BasePageObject { go() { return this.page; } };`,
      errors: found,
    },
    {
      code: `class P extends BasePageObject { private get header() { return this.page; } }`,
      errors: found,
    },
    {
      code: `class P extends BasePageObject { locators() { return { a: this.page }; } }`,
      errors: found,
    },
    {
      // The innermost member wins, so the outer holder does not cover this.
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
    { code: `function go(self) { return self.page; }` },
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
      code: `class P extends BasePageObject { private get dynamicLocators() { return { a: (x: string) => this.page } as const; } }`,
    },
  ],
});
