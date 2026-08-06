import type { Rule } from "eslint";
import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { enclosingPageObject, isLocatorHolder } from "./index.js";
import { enclosingClassMember } from "./index.js";

// RuleTester takes the parser as a resolved path, and this package is ESM.
// A Node built-in is fine here: only the rules are constrained, not the tests.
const require = createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
});

/**
 * Exercises the helpers through a real rule, so the nodes they see are the ones
 * ESLint actually hands a rule. Reports every `this.page` that sits inside a
 * page object but outside a locator holder -- the combination the ported rules
 * rely on.
 */
const probe: Rule.RuleModule = {
  create(context) {
    return {
      MemberExpression(node) {
        if (node.property.type !== "Identifier") return;
        if (node.property.name !== "page") return;
        if (node.object.type !== "ThisExpression") return;
        if (!enclosingPageObject(node)) return;
        if (isLocatorHolder(enclosingClassMember(node))) return;

        context.report({ messageId: "found", node });
      },
    };
  },
  meta: { messages: { found: "found" } },
};

const found = [{ messageId: "found" }];

ruleTester.run("pageObject helpers", probe, {
  invalid: [
    {
      code: `class P extends BasePageObject { go() { return this.page; } }`,
      errors: found,
    },
    {
      code: `class P extends EntryPointPageObject { go() { return this.page; } }`,
      errors: found,
    },
    {
      // The generic form still names the base class.
      code: `class P extends SubPageObject<Home> { go() { return this.page; } }`,
      errors: found,
    },
    {
      code: `const P = class extends BasePageObject { go() { return this.page; } };`,
      errors: found,
    },
    {
      // Detection is by class, not path -- a tooling path still reports.
      code: `class P extends BasePageObject { go() { return this.page; } }`,
      errors: found,
      filename: "/tools/scripts/whatever.ts",
    },
  ],
  valid: [
    // Not a page object. Includes a page object extending another page object,
    // the documented blind spot.
    { code: `class P extends LoginPage { go() { return this.page; } }` },
    { code: `class P { go() { return this.page; } }` },
    { code: `function go(self) { return self.page; }` },
    // Inside a locator holder, in each spelling the convention allows.
    {
      code: `class P extends BasePageObject { private get locators() { return { a: this.page } as const; } }`,
    },
    {
      code: `class P extends BasePageObject { private get selectors() { return { a: this.page } as const; } }`,
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
