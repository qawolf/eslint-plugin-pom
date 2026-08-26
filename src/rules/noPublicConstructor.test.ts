import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { noPublicConstructorRule } from "./noPublicConstructor.js";

// RuleTester takes the parser as a resolved path, and this package is ESM.
const require = createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
});

const pagePath = "src/pages/sign-in-page.ts";

/** A filename is required: RuleTester defaults to `<input>`, which is out of scope. */
function pageObject(body: string) {
  return {
    code: `class SignInPage extends BasePageObject {\n${body}\n}`,
    filename: pagePath,
  };
}

const publicConstructor = [{ messageId: "publicConstructor" }];

ruleTester.run("no-public-constructor", noPublicConstructorRule.module, {
  invalid: [
    {
      ...pageObject(`constructor(page: Page) { super(page); }`),
      errors: publicConstructor,
    },
    {
      // Saying `public` outright is the same widening.
      ...pageObject(`public constructor(page: Page) { super(page); }`),
      errors: publicConstructor,
    },
    {
      // A body doing more than `super()` is still public.
      ...pageObject(`
        constructor(page: Page) {
          super(page);
          this.retries = 2;
        }
      `),
      errors: publicConstructor,
    },
    {
      code: `class SignInPage extends BasePageObject {
        constructor(page: Page) { super(page); }
      }`,
      errors: publicConstructor,
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      // No constructor at all, which is the usual shape.
      ...pageObject(`async signIn() { await this.locators.button.click(); }`),
    },
    {
      // Matches the base class's visibility.
      ...pageObject(`protected constructor(page: Page) { super(page); }`),
    },
    {
      ...pageObject(`private constructor(page: Page) { super(page); }`),
    },
    {
      // A method named constructor-ish is not a constructor.
      ...pageObject(`async construct(page: Page) { return page; }`),
    },
    {
      // Outside `src/pages/`.
      code: `class Helper { constructor(page: Page) { this.page = page; } }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
