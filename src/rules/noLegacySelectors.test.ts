import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";

import { noLegacySelectorsRule } from "./noLegacySelectors.js";

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

ruleTester.run("no-legacy-selectors", noLegacySelectorsRule.module, {
  invalid: [
    {
      ...pageObject(`async go() { this.page.locator("//div[@id='ok']"); }`),
      errors: [{ messageId: "noXpath" }],
    },
    {
      ...pageObject(`async go() { this.page.locator("(//div)[1]"); }`),
      errors: [{ messageId: "noXpath" }],
    },
    {
      ...pageObject(`async go() { this.page.locator("xpath=//div"); }`),
      errors: [{ messageId: "noXpath" }],
    },
    {
      ...pageObject(`async go() { this.page.locator("text=Sign in"); }`),
      errors: [{ messageId: "noLegacyEngine" }],
    },
    {
      ...pageObject(`async go() { this.page.locator("css=.button"); }`),
      errors: [{ messageId: "noLegacyEngine" }],
    },
    {
      ...pageObject(`async go() { this.page.locator("id=submit"); }`),
      errors: [{ messageId: "noLegacyEngine" }],
    },
    {
      ...pageObject(`async go() { this.page.locator("form >> button"); }`),
      errors: [{ messageId: "noChainCombinator" }],
    },
    {
      ...pageObject(`async go() { this.page.frameLocator("//iframe"); }`),
      errors: [{ messageId: "noXpath" }],
    },
    {
      // A static chunk of a template literal still carries the prefix.
      ...pageObject(
        "async go(name: string) { this.page.locator(`text=${name}`); }",
      ),
      errors: [{ messageId: "noLegacyEngine" }],
    },
    {
      ...pageObject(`async go() { this.page.locator("  //div"); }`),
      errors: [{ messageId: "noXpath" }],
    },
    {
      code: `class SignInPage extends BasePageObject {
        async go() { this.page.locator("//div"); }
      }`,
      errors: [{ messageId: "noXpath" }],
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      ...pageObject(`async go() { this.page.locator("#ok"); }`),
    },
    {
      ...pageObject(`async go() { this.page.locator(".card > .button"); }`),
    },
    {
      // Current Playwright pseudo-classes, not the legacy `text=` engine.
      ...pageObject(`async go() { this.page.locator("li:text-is('Paris')"); }`),
    },
    {
      ...pageObject(`async go() { this.page.locator("div:has-text('ok')"); }`),
    },
    {
      ...pageObject(
        `async go() { this.page.getByText("text=not a selector"); }`,
      ),
    },
    {
      // An engine prefix only counts at the start. A CSS attribute selector
      // contains `id=` and `text=` without being legacy syntax.
      ...pageObject(`async go() { this.page.locator("[data-id=submit]"); }`),
    },
    {
      ...pageObject(`async go() { this.page.locator("[aria-text=hello]"); }`),
    },
    {
      // A fully dynamic selector has no static chunk to inspect.
      ...pageObject("async go(sel: string) { this.page.locator(`${sel}`); }"),
    },
    {
      ...pageObject(
        `async go() { this.page.locator("form").locator("button"); }`,
      ),
    },
    {
      ...pageObject(`async go() { this.page.locator(); }`),
    },
    {
      code: `class Flow { async go() { this.page.locator("//div"); } }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
