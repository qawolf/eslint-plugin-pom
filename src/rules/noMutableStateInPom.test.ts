import { pageObject, pagePath, ruleTester } from "../testHelpers.js";
import { noMutableStateInPomRule } from "./noMutableStateInPom.js";

const mutableField = [{ messageId: "mutableField" }];

ruleTester.run("no-mutable-state-in-pom", noMutableStateInPomRule.module, {
  invalid: [
    {
      ...pageObject(`private lastSearchTerm = "";`),
      errors: mutableField,
    },
    {
      ...pageObject(`private rowCount: number;`),
      errors: mutableField,
    },
    {
      ...pageObject(`public attempts = 0;`),
      errors: mutableField,
    },
    {
      ...pageObject(`attempts = 0;`),
      errors: mutableField,
    },
    {
      code: `class SignInPage extends BasePageObject {
        private lastSearchTerm = "";
      }`,
      errors: mutableField,
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      ...pageObject(`private readonly defaultUrl = "https://example.com";`),
    },
    {
      ...pageObject(`static readonly DEFAULT_URL = "https://example.com";`),
    },
    {
      ...pageObject(`static defaultTimeout = 30000;`),
    },
    {
      // Inherited from BasePageObject.
      ...pageObject(`protected page: Page;`),
    },
    {
      // A holder in field form is selector-getter-shape's report, not this one.
      ...pageObject(`private locators = { ok: this.page.locator("#ok") };`),
    },
    {
      ...pageObject(`private selectors = { ok: this.page.locator("#ok") };`),
    },
    {
      ...pageObject(`
        private get locators() {
          return { ok: this.page.locator("#ok") } as const;
        }
        async search(term: string): Promise<string> {
          await this.locators.ok.fill(term);
          return term;
        }
      `),
    },
    {
      ...pageObject(`private toSlug = (label: string) => label.toLowerCase();`),
    },
    {
      // A helper sharing the directory is not a page object.
      code: `class TestDataFactory { private seed = 0; }`,
      filename: pagePath,
    },
    {
      code: `class Flow { private attempts = 0; }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
