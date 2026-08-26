import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { entryPointFactoryRule } from "./entryPointFactory.js";

// RuleTester takes the parser as a resolved path, and this package is ESM.
const require = createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
});

const pagePath = "src/pages/sign-in-page.ts";

const missingCreate = [{ messageId: "missingCreate" }];

ruleTester.run("entry-point-factory", entryPointFactoryRule.module, {
  invalid: [
    {
      code: `export class SignInPage extends EntryPointPageObject {
        async signIn() { await this.locators.button.click(); }
      }`,
      errors: missingCreate,
      filename: pagePath,
    },
    {
      // An instance method named create is not the factory.
      code: `export class SignInPage extends EntryPointPageObject {
        async create() { return this; }
      }`,
      errors: missingCreate,
      filename: pagePath,
    },
    {
      // A static field is not a method.
      code: `export class SignInPage extends EntryPointPageObject {
        static create = 1;
      }`,
      errors: missingCreate,
      filename: pagePath,
    },
    {
      // A static method, but not the factory.
      code: `export class SignInPage extends EntryPointPageObject {
        static async open(): Promise<SignInPage> { return this.build(); }
      }`,
      errors: missingCreate,
      filename: pagePath,
    },
    {
      code: `const SignInPage = class extends EntryPointPageObject {
        async signIn() {}
      };`,
      errors: missingCreate,
      filename: pagePath,
    },
    {
      code: `export class SignInPage extends EntryPointPageObject {}`,
      errors: missingCreate,
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      code: `export class SignInPage extends EntryPointPageObject {
        static async create(options: CreateOptions = {}): Promise<SignInPage> {
          const page = await this.launch(options);
          return new SignInPage(page);
        }
      }`,
      filename: pagePath,
    },
    {
      // A non-async static factory still is one.
      code: `export class SignInPage extends EntryPointPageObject {
        static create(): SignInPage { return new SignInPage(page); }
      }`,
      filename: pagePath,
    },
    {
      // Only entry points need the factory.
      code: `export class DashboardPage extends BasePageObject {
        async open() {}
      }`,
      filename: pagePath,
    },
    {
      code: `export class ProfilePanel extends SubPageObject<DashboardPage> {
        async open() {}
      }`,
      filename: pagePath,
    },
    {
      // Not a page object at all.
      code: `export class Helper { async run() {} }`,
      filename: pagePath,
    },
    {
      // Outside `src/pages/`.
      code: `export class SignInPage extends EntryPointPageObject {}`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
