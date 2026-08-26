import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { typedCreateReturnRule } from "./typedCreateReturn.js";

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

ruleTester.run("typed-create-return", typedCreateReturnRule.module, {
  invalid: [
    {
      ...pageObject(
        `async goToDashboard() { return this.create("DashboardPage"); }`,
      ),
      errors: [{ messageId: "missingReturnType" }],
    },
    {
      ...pageObject(
        `async goToDashboard(): Promise<any> { return this.create("DashboardPage"); }`,
      ),
      errors: [{ messageId: "uselessReturnType" }],
    },
    {
      ...pageObject(
        `async goToDashboard(): Promise<void> { return this.create("DashboardPage"); }`,
      ),
      errors: [{ messageId: "uselessReturnType" }],
    },
    {
      ...pageObject(
        `async goToDashboard(): Promise<unknown> { return this.create("DashboardPage"); }`,
      ),
      errors: [{ messageId: "uselessReturnType" }],
    },
    {
      // Awaited, then returned.
      ...pageObject(
        `async goToDashboard() { return await this.create("DashboardPage"); }`,
      ),
      errors: [{ messageId: "missingReturnType" }],
    },
    {
      ...pageObject(`goToDashboard() { return this.create("DashboardPage"); }`),
      errors: [{ messageId: "missingReturnType" }],
    },
    {
      ...pageObject(`
        async openPreview() {
          const [popupPage] = await Promise.all([
            this.page.waitForEvent("popup"),
            this.locators.openInNewTab.click(),
          ]);
          return PreviewPage.createFromPage(popupPage);
        }
      `),
      errors: [{ messageId: "missingReturnType" }],
    },
    {
      ...pageObject(
        `wrap(popupPage: Page): any { return PreviewPage.createFromPage(popupPage); }`,
      ),
      errors: [{ messageId: "uselessReturnType" }],
    },
    {
      code: `class SignInPage extends BasePageObject {
        async goToDashboard() { return this.create("DashboardPage"); }
      }`,
      errors: [{ messageId: "missingReturnType" }],
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      ...pageObject(
        `async goToDashboard(): Promise<DashboardPage> { return this.create("DashboardPage"); }`,
      ),
    },
    {
      ...pageObject(
        `async openPreview(): Promise<PreviewPage> { return PreviewPage.createFromPage(this.page); }`,
      ),
    },
    {
      // A synchronous method returns the class itself, not a promise of it.
      ...pageObject(
        `wrap(popupPage: Page): PreviewPage { return PreviewPage.createFromPage(popupPage); }`,
      ),
    },
    {
      // A generic call still needs the annotation, and has it.
      ...pageObject(
        `async goToDashboard(): Promise<DashboardPage> { return this.create<DashboardPage>("DashboardPage"); }`,
      ),
    },
    {
      // Not `this.create`.
      ...pageObject(`async build() { return this.factory.create("Thing"); }`),
    },
    {
      // A different method on `this` that also takes a string.
      ...pageObject(`async load() { return this.fetchJson("DashboardPage"); }`),
    },
    {
      // A dynamic name gives the message no page to suggest.
      ...pageObject(`async go(name: string) { return this.create(name); }`),
    },
    {
      // Not a create call at all.
      ...pageObject(`async count(): Promise<number> { return 1; }`),
    },
    {
      // A bare return has no argument.
      ...pageObject(`async go(): Promise<void> { return; }`),
    },
    {
      // Outside `src/pages/`.
      code: `class Flow { async go() { return this.create("DashboardPage"); } }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
