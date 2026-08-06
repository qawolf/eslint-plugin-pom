import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { selectorJsdocRule } from "./selectorJsdoc.js";

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

const missingJsdoc = [{ messageId: "missingJsdoc" }];

ruleTester.run("selector-jsdoc", selectorJsdocRule.module, {
  invalid: [
    {
      ...pageObject(`
        private get locators() {
          return { signInButton: this.page.getByRole("button") } as const;
        }
      `),
      errors: missingJsdoc,
    },
    {
      // A line comment is not JSDoc.
      ...pageObject(`
        private get locators() {
          return {
            // The sign-in button.
            signInButton: this.page.getByRole("button"),
          } as const;
        }
      `),
      errors: missingJsdoc,
    },
    {
      // A block comment that is not JSDoc.
      ...pageObject(`
        private get locators() {
          return {
            /* The sign-in button. */
            signInButton: this.page.getByRole("button"),
          } as const;
        }
      `),
      errors: missingJsdoc,
    },
    {
      // One documented, one not.
      ...pageObject(`
        private get locators() {
          return {
            /** The email field. */
            emailInput: this.page.getByLabel("Email"),
            signInButton: this.page.getByRole("button"),
          } as const;
        }
      `),
      errors: missingJsdoc,
    },
    {
      // Without `as const` there is no TSAsExpression to unwrap.
      ...pageObject(`
        private get selectors() {
          return { ok: this.page.locator("#ok") };
        }
      `),
      errors: missingJsdoc,
    },
    {
      ...pageObject(`
        private get dynamicLocators() {
          return { row: (id: string) => this.page.locator(id) } as const;
        }
      `),
      errors: missingJsdoc,
    },
    {
      // A quoted key still needs a description.
      ...pageObject(`
        private get locators() {
          return { "sign-in": this.page.getByRole("button") } as const;
        }
      `),
      errors: missingJsdoc,
    },
    {
      code: `class SignInPage extends BasePageObject {
        private get locators() {
          return { ok: this.page.locator("#ok") } as const;
        }
      }`,
      errors: missingJsdoc,
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      ...pageObject(`
        private get locators() {
          return {
            /** The email field in the sign-in card. */
            emailInput: this.page.getByLabel("Email"),
            /** The primary submit button. */
            signInButton: this.page.getByRole("button"),
          } as const;
        }
      `),
    },
    {
      ...pageObject(`
        private get dynamicSelectors() {
          return {
            /** A table row by its id. */
            row: (id: string) => this.page.locator(id),
          } as const;
        }
      `),
    },
    {
      // Not a locator holder, so its entries are not selectors.
      ...pageObject(`
        private get config() {
          return { retries: 3 } as const;
        }
      `),
    },
    {
      // A plain method is the wrong shape entirely, which is
      // selector-getter-shape's report to make, not this rule's.
      ...pageObject(`
        locators() {
          return { ok: this.page.locator("#ok") } as const;
        }
      `),
    },
    {
      // A spread carries no key to document.
      ...pageObject(`
        private get locators() {
          return { ...sharedLocators } as const;
        }
      `),
    },
    {
      // An empty holder has nothing to document.
      ...pageObject(`
        private get locators() {
          return {} as const;
        }
      `),
    },
    {
      // Outside `src/pages/`.
      code: `class Helper {
        private get locators() { return { ok: 1 } as const; }
      }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
