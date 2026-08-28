import { pageObject, ruleTester } from "../testHelpers.js";
import { noWaitForTimeoutInPomsRule } from "./noWaitForTimeoutInPoms.js";

const fixedSleep = [{ messageId: "fixedSleep" }];
const selectorWait = [{ messageId: "selectorWait" }];

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
        errors: selectorWait,
      },
      {
        ...pageObject(
          `async settle() { await this.page.waitForTimeout(2000); }`,
        ),
        errors: fixedSleep,
      },
      {
        ...pageObject(
          `async settle() { await this.page.waitForSelector("#ok"); }`,
        ),
        errors: selectorWait,
      },
      {
        ...pageObject(
          `async settle() { await this.locators.row.waitForTimeout(50); }`,
        ),
        errors: fixedSleep,
      },
      {
        ...pageObject(`
          async settle() {
            await this.page.waitForTimeout(100);
            await this.page.waitForSelector("#ok");
          }
        `),
        errors: [{ messageId: "fixedSleep" }, { messageId: "selectorWait" }],
      },
      {
        code: `class SignInPage extends BasePageObject {
          async settle() { await this.page.waitForTimeout(2000); }
        }`,
        errors: fixedSleep,
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
