import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { noDirectPomConstructionRule } from "./noDirectPomConstruction.js";

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

const useCreate = [{ messageId: "useCreate" }];

ruleTester.run(
  "no-direct-pom-construction",
  noDirectPomConstructionRule.module,
  {
    invalid: [
      {
        ...pageObject(
          `async goToDashboard() { return new DashboardPage(this.page); }`,
        ),
        errors: useCreate,
      },
      {
        // Extra arguments do not change it.
        ...pageObject(
          `async goToDashboard() { return new DashboardPage(this.page, { retries: 2 }); }`,
        ),
        errors: useCreate,
      },
      {
        ...pageObject(
          `async goToDashboard() { return new DashboardPage(this.page!); }`,
        ),
        errors: useCreate,
      },
      {
        ...pageObject(
          `async goToDashboard() { return new DashboardPage(this.page as Page); }`,
        ),
        errors: useCreate,
      },
      {
        // Assigned rather than returned.
        ...pageObject(`
          async goToDashboard() {
            const dashboard = new DashboardPage(this.page);
            return dashboard;
          }
        `),
        errors: useCreate,
      },
      {
        // Component sub-page-objects are constructed the same way.
        ...pageObject(
          `async openEditor() { return new AutomateEditorComponent(this.page); }`,
        ),
        errors: useCreate,
      },
      {
        code: `class SignInPage extends BasePageObject {
          async goToDashboard() { return new DashboardPage(this.page); }
        }`,
        errors: useCreate,
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
        // A page object's own static factory constructs itself.
        ...pageObject(`
          static async create(page: Page): Promise<SignInPage> {
            return new SignInPage(page);
          }
        `),
      },
      {
        // Self-construction with `this.page` is still self-construction.
        ...pageObject(`async clone() { return new SignInPage(this.page); }`),
      },
      {
        // Not built from this page object's page.
        ...pageObject(
          `async build(page: Page) { return new DashboardPage(page); }`,
        ),
      },
      {
        // Ordinary constructors that happen to be handed the page.
        ...pageObject(
          `async watch() { return new NetworkMonitor(this.page); }`,
        ),
      },
      {
        // No arguments at all.
        ...pageObject(`async fail() { throw new Error("nope"); }`),
      },
      {
        // A different member off `this`, not the page.
        ...pageObject(`async go() { return new DashboardPage(this.context); }`),
      },
      {
        // Outside `src/pages/`.
        code: `class Flow { async go() { return new DashboardPage(this.page); } }`,
        filename: "src/flows/checkout.flow.ts",
      },
    ],
  },
);
