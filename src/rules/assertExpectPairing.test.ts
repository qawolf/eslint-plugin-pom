import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { assertExpectPairingRule } from "./assertExpectPairing.js";

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

const expectOutsideAssert = [{ messageId: "expectOutsideAssert" }];

ruleTester.run("assert-expect-pairing", assertExpectPairingRule.module, {
  invalid: [
    {
      ...pageObject(
        `async signIn() { await expect(this.locators.banner).toBeVisible(); }`,
      ),
      errors: expectOutsideAssert,
    },
    {
      // `assert` alone does not match `assert[A-Z]`.
      ...pageObject(`async assert() { expect(1).toBe(1); }`),
      errors: expectOutsideAssert,
    },
    {
      // Lowercase after the prefix is a different word, not an assert method.
      ...pageObject(`async assertion() { expect(1).toBe(1); }`),
      errors: expectOutsideAssert,
    },
    {
      // `waitForever` only starts with the prefix; the exemption needs the word.
      ...pageObject(`async waitForever() { expect(1).toBe(1); }`),
      errors: expectOutsideAssert,
    },
    {
      // Nested in a callback, still inside the action method.
      ...pageObject(`
        async clickAll(names: string[]) {
          names.forEach((name) => {
            expect(name).toBeTruthy();
          });
        }
      `),
      errors: expectOutsideAssert,
    },
    {
      // A getter is a method too.
      ...pageObject(`get ready() { expect(1).toBe(1); return true; }`),
      errors: expectOutsideAssert,
    },
    {
      ...pageObject(`
        async signIn() {
          expect(1).toBe(1);
          expect(2).toBe(2);
        }
      `),
      errors: [
        { messageId: "expectOutsideAssert" },
        { messageId: "expectOutsideAssert" },
      ],
    },
    {
      code: `class SignInPage extends BasePageObject {
        async signIn() { await expect(this.locators.banner).toBeVisible(); }
      }`,
      errors: expectOutsideAssert,
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      ...pageObject(
        `async assertSignedIn() { await expect(this.locators.banner).toBeVisible(); }`,
      ),
    },
    {
      ...pageObject(
        `async assertCityIsValid(city: string) { expect(city).toBe("x"); }`,
      ),
    },
    {
      // No expect at all.
      ...pageObject(
        `async signIn() { await this.locators.signInButton.click(); }`,
      ),
    },
    {
      // A different function named expect on an object is not the matcher.
      ...pageObject(`async signIn() { await this.helper.expect(1); }`),
    },
    {
      // A plain call that is not `expect` is just an action.
      ...pageObject(`async signIn() { logStep("signing in"); }`),
    },
    {
      ...pageObject(
        `async waitForContentVisible() { await expect(this.locators.content).toBeVisible(); }`,
      ),
    },
    {
      ...pageObject(
        `async waitFor() { await expect(this.locators.row).toHaveCount(1); }`,
      ),
    },
    {
      // A field, not a method, so there is no action to separate the assert from.
      ...pageObject(`readonly ready = expect(1).toBe(1);`),
    },
    {
      // Outside a method, so there is no action method being mixed.
      code: `export function check() { expect(1).toBe(1); }`,
      filename: pagePath,
    },
    {
      // Outside `src/pages/`. Flows assert freely.
      code: `class Flow { async run() { expect(1).toBe(1); } }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
