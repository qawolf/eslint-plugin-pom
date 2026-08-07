import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { webFirstAssertionsRule } from "./webFirstAssertions.js";

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

const preferWebFirst = [{ messageId: "preferWebFirst" }];

ruleTester.run("web-first-assertions", webFirstAssertionsRule.module, {
  invalid: [
    {
      ...pageObject(`
        async assertReady() {
          expect(await this.locators.banner.isVisible()).toBe(true);
        }
      `),
      errors: preferWebFirst,
    },
    {
      ...pageObject(`
        async assertText() {
          expect(await this.locators.banner.innerText()).toContain("Hi");
        }
      `),
      errors: preferWebFirst,
    },
    {
      // The compared value moves into the matcher, so the suggestion carries
      // its argument shape rather than empty parens.
      ...pageObject(`
        async assertRows() {
          expect(await this.locators.rows.count()).toBe(3);
        }
      `),
      errors: [{ message: /toHaveCount\(expected\)/ }],
    },
    {
      ...pageObject(`
        async assertValue() {
          expect(await this.locators.email.inputValue()).toBe("a@b.c");
        }
      `),
      errors: preferWebFirst,
    },
    {
      ...pageObject(`
        async assertAttribute() {
          expect(await this.locators.link.getAttribute("href")).toBe("/home");
        }
      `),
      errors: preferWebFirst,
    },
    {
      // A negated comparison. The rule ships no autofix, so the message is the
      // whole fix -- it has to name `.not`, or applying it literally inverts
      // the assertion.
      ...pageObject(`
        async assertChecked() {
          expect(await this.locators.box.isChecked()).toBe(false);
        }
      `),
      errors: [{ message: /\.not\.toBeChecked\(\)/ }],
    },
    {
      code: `class SignInPage extends BasePageObject {
        async assertReady() {
          expect(await this.locators.banner.isVisible()).toBe(true);
        }
      }`,
      errors: preferWebFirst,
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      ...pageObject(`
        async assertReady() {
          await expect(this.locators.banner).toBeVisible();
        }
      `),
    },
    {
      ...pageObject(`
        async assertText() {
          await expect(this.locators.banner).toHaveText("Hi");
        }
      `),
    },
    {
      // Awaited, but not one of the point-in-time reads.
      ...pageObject(`
        async assertTitle() {
          expect(await this.page.title()).toBe("Home");
        }
      `),
    },
    {
      // Not awaited, so nothing was read.
      ...pageObject(`
        async assertCount(rows: number) {
          expect(rows).toBe(3);
        }
      `),
    },
    {
      // A read outside expect is fine -- the value is being used, not asserted.
      ...pageObject(`
        async readBanner(): Promise<string> {
          return (await this.locators.banner.innerText()) ?? "";
        }
      `),
    },
    {
      // Some other function taking the same awaited read is not an assertion
      // this rule can rewrite.
      ...pageObject(`
        async log() {
          record(await this.locators.banner.innerText());
        }
      `),
    },
    {
      // Outside `src/pages/`.
      code: `class Flow {
        async go() { expect(await this.locators.banner.isVisible()).toBe(true); }
      }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
