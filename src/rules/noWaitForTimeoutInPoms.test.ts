import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { noWaitForTimeoutInPomsRule } from "./noWaitForTimeoutInPoms.js";

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

const bannedWait = [{ messageId: "bannedWait" }];

ruleTester.run(
  "no-wait-for-timeout-in-poms",
  noWaitForTimeoutInPomsRule.module,
  {
    invalid: [
      {
        // A justification excuses a fixed sleep, not a selector string.
        ...pageObject(`
          async settle() {
            // The banner is slow on staging.
            await this.page.waitForSelector("#ok");
          }
        `),
        errors: bannedWait,
      },
      {
        ...pageObject(
          `async settle() { await this.page.waitForTimeout(2000); }`,
        ),
        errors: bannedWait,
      },
      {
        ...pageObject(
          `async settle() { await this.page.waitForSelector("#ok"); }`,
        ),
        errors: bannedWait,
      },
      {
        ...pageObject(
          `async settle() { await this.locators.row.waitForTimeout(50); }`,
        ),
        errors: bannedWait,
      },
      {
        ...pageObject(`
          async settle() {
            await this.page.waitForTimeout(100);
            await this.page.waitForSelector("#ok");
          }
        `),
        errors: [{ messageId: "bannedWait" }, { messageId: "bannedWait" }],
      },
      {
        code: `class SignInPage extends BasePageObject {
          async settle() { await this.page.waitForTimeout(2000); }
        }`,
        errors: bannedWait,
        filename: "file:///src/pages/auth/sign-in-page.ts",
      },
    ],
    valid: [
      {
        ...pageObject(`
          async exportReport() {
            // The export runs on a queue the page does not reflect.
            await this.page.waitForTimeout(2000);
          }
        `),
      },
      {
        ...pageObject(
          `async exportReport() { await this.page.waitForTimeout(2000); /* waiting on the third-party widget */ }`,
        ),
      },
      {
        ...pageObject(
          `async settle() { await this.locators.banner.waitFor(); }`,
        ),
      },
      {
        ...pageObject(
          `async settle() { await this.page.waitForURL("**/home"); }`,
        ),
      },
      {
        ...pageObject(
          `async settle() { await this.page.waitForLoadState("networkidle"); }`,
        ),
      },
      {
        ...pageObject(`async wire() { return this.page.waitForTimeout; }`),
      },
      {
        ...pageObject(`async settle() { logStep("settling"); }`),
      },
      {
        code: `class Flow { async go() { await this.page.waitForTimeout(1); } }`,
        filename: "src/flows/checkout.flow.ts",
      },
    ],
  },
);
