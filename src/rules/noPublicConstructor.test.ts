import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";

import { noPublicConstructorRule } from "./noPublicConstructor.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    parser: tsParser,
    sourceType: "module",
  },
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
      // A page object extending another page object is still a page object.
      code: `class AdminLoginPage extends LoginPage { constructor(page: Page) { super(page); } }`,
      errors: publicConstructor,
      filename: pagePath,
    },
    {
      ...pageObject(`public constructor(page: Page) { super(page); }`),
      errors: publicConstructor,
    },
    {
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
      ...pageObject(`async signIn() { await this.locators.button.click(); }`),
    },
    {
      ...pageObject(`protected constructor(page: Page) { super(page); }`),
    },
    {
      ...pageObject(`private constructor(page: Page) { super(page); }`),
    },
    {
      ...pageObject(`async construct(page: Page) { return page; }`),
    },
    {
      // A helper sharing the directory is not a page object.
      code: `class TestDataFactory { constructor(seed: number) { this.seed = seed; } }`,
      filename: pagePath,
    },
    {
      code: `class Helper { constructor(page: Page) { this.page = page; } }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
