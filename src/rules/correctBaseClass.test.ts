import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { correctBaseClassRule } from "./correctBaseClass.js";

// RuleTester takes the parser as a resolved path, and this package is ESM.
const require = createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
});

const pagePath = "src/pages/sign-in-page.ts";

ruleTester.run("correct-base-class", correctBaseClassRule.module, {
  invalid: [
    {
      code: `export class SignInPage {
        async signIn() { await this.page.getByRole("button").click(); }
      }`,
      errors: [{ messageId: "missingBase" }],
      filename: pagePath,
    },
    {
      code: `export class SignInPage {
        private get locators() { return { ok: this.page.locator("#ok") } as const; }
      }`,
      errors: [{ messageId: "missingBase" }],
      filename: pagePath,
    },
    {
      code: `export class SignInPage extends EventEmitter {
        async signIn() { await this.page.getByRole("button").click(); }
      }`,
      errors: [{ messageId: "unknownBase" }],
      filename: pagePath,
    },
    {
      code: `const SignInPage = class {
        async signIn() { await this.page.getByRole("button").click(); }
      };`,
      errors: [{ messageId: "missingBase" }],
      filename: pagePath,
    },
    {
      code: `export class SignInPage {
        async signIn(names: string[]) {
          await Promise.all(names.map((name) => this.page.getByText(name).click()));
        }
      }`,
      errors: [{ messageId: "missingBase" }],
      filename: pagePath,
    },
    {
      code: `export class SignInPage {
        async signIn() { await this.page.getByRole("button").click(); }
      }`,
      errors: [{ messageId: "missingBase" }],
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      code: `export class SignInPage extends BasePageObject {
        async signIn() { await this.page.getByRole("button").click(); }
      }`,
      filename: pagePath,
    },
    {
      code: `export class SignInPage extends EntryPointPageObject {
        async signIn() { await this.page.getByRole("button").click(); }
      }`,
      filename: pagePath,
    },
    {
      code: `export class ProfilePanel extends SubPageObject<DashboardPage> {
        async open() { await this.page.getByRole("tab").click(); }
      }`,
      filename: pagePath,
    },
    {
      // Extending another page object names no base class, and is allowed.
      code: `export class AdminLoginPage extends LoginPage {
        async signIn() { await this.page.getByRole("button").click(); }
      }`,
      filename: pagePath,
    },
    {
      code: `export class WidePanel extends DashboardComponent {
        async open() { await this.page.getByRole("tab").click(); }
      }`,
      filename: pagePath,
    },
    {
      code: `export class EditModal extends InviteModal {
        async close() { await this.page.keyboard.press("Escape"); }
      }`,
      filename: pagePath,
    },
    {
      // A helper that never touches the page is not a page object.
      code: `export class UserFactory {
        build(name: string) { return { name }; }
      }`,
      filename: pagePath,
    },
    {
      code: `export class UserFactory {
        async open(page: Page) { await page.getByRole("button").click(); }
      }`,
      filename: pagePath,
    },
    {
      code: `export class SignInPage {
        async signIn() { await this.page.getByRole("button").click(); }
      }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
