import { pageObject, pagePath, ruleTester } from "../testHelpers.js";
import { assertExpectPairingRule } from "./assertExpectPairing.js";

const expectOutsideAssert = [{ messageId: "expectOutsideAssert" }];
const expectPrefixedName = [{ messageId: "expectPrefixedName" }];

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
      ...pageObject(
        `async expectHeadingVisible() { await expect(this.locators.heading).toBeVisible(); }`,
      ),
      errors: expectPrefixedName,
    },
    {
      // `expected` is a different word, so this is an action method mixing in an assert.
      ...pageObject(`async expected() { expect(1).toBe(1); }`),
      errors: expectOutsideAssert,
    },
    {
      // `waitForever` only starts with the prefix; the exemption needs the word.
      ...pageObject(`async waitForever() { expect(1).toBe(1); }`),
      errors: expectOutsideAssert,
    },
    {
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
      ...pageObject(
        `async signIn() { await this.locators.signInButton.click(); }`,
      ),
    },
    {
      ...pageObject(`async signIn() { await this.helper.expect(1); }`),
    },
    {
      ...pageObject(`async signIn() { logStep("signing in"); }`),
    },
    {
      ...pageObject(`
        async deleteAllProjects(prefix: string) {
          const rows = this.dynamicLocators.matchingRows(prefix);
          for (let attempt = 0; attempt < 10; attempt++) {
            const countBeforeDelete = await rows.count();
            if (countBeforeDelete === 0) break;
            await rows.first().click();
            await this.locators.confirmDeleteButton.click();
            await expect(rows).toHaveCount(countBeforeDelete - 1);
          }
        }
      `),
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
      code: `export function check() { expect(1).toBe(1); }`,
      filename: pagePath,
    },
    {
      code: `class Flow { async run() { expect(1).toBe(1); } }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
