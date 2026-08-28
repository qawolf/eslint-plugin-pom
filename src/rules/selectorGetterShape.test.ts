import { pageObject, ruleTester } from "../testHelpers.js";
import { selectorGetterShapeRule } from "./selectorGetterShape.js";

ruleTester.run("selector-getter-shape", selectorGetterShapeRule.module, {
  invalid: [
    {
      ...pageObject(
        `get locators() { return { ok: this.page.locator("#ok") } as const; }`,
      ),
      errors: [{ messageId: "mustBePrivate" }],
    },
    {
      ...pageObject(
        `private get locators() { return { ok: this.page.locator("#ok") }; }`,
      ),
      errors: [{ messageId: "missingAsConst" }],
    },
    {
      ...pageObject(
        `locators() { return { ok: this.page.locator("#ok") } as const; }`,
      ),
      errors: [{ messageId: "mustBeGetter" }],
    },
    {
      ...pageObject(
        `private readonly locators = { ok: this.page.locator("#ok") } as const;`,
      ),
      errors: [{ messageId: "useGetter" }],
    },
    {
      // Both problems on one getter.
      ...pageObject(
        `get locators() { return { ok: this.page.locator("#ok") }; }`,
      ),
      errors: [{ messageId: "mustBePrivate" }, { messageId: "missingAsConst" }],
    },
    {
      // The mobile spelling.
      ...pageObject(
        `private get selectors() { return { ok: this.page.locator("#ok") }; }`,
      ),
      errors: [{ messageId: "missingAsConst" }],
    },
    {
      ...pageObject(
        `private get dynamicLocators() { return { row: (id: string) => this.page.locator(id) }; }`,
      ),
      errors: [{ messageId: "missingAsConst" }],
    },
    {
      // `satisfies` alone does not narrow the entries.
      ...pageObject(
        `private get locators() { return { ok: this.page.locator("#ok") } satisfies Locators; }`,
      ),
      errors: [{ messageId: "missingAsConst" }],
    },
    {
      // `as SomeType` is not `as const`.
      ...pageObject(
        `private get locators() { return { ok: this.page.locator("#ok") } as Locators; }`,
      ),
      errors: [{ messageId: "missingAsConst" }],
    },
    {
      code: `class SignInPage extends BasePageObject {
        get locators() { return { ok: this.page.locator("#ok") } as const; }
      }`,
      errors: [{ messageId: "mustBePrivate" }],
      filename: "file:///src/pages/auth/sign-in-page.ts",
    },
  ],
  valid: [
    {
      ...pageObject(
        `private get locators() { return { ok: this.page.locator("#ok") } as const; }`,
      ),
    },
    {
      ...pageObject(
        `private get dynamicLocators() { return { row: (id: string) => this.page.locator(id) } as const; }`,
      ),
    },
    {
      ...pageObject(
        `private get selectors() { return { ok: this.page.locator("#ok") } as const; }`,
      ),
    },
    {
      ...pageObject(
        `private get dynamicSelectors() { return { ok: this.page.locator("#ok") } as const; }`,
      ),
    },
    {
      // `as const` under a `satisfies` is still `as const`.
      ...pageObject(
        `private get locators() { return ({ ok: this.page.locator("#ok") } as const) satisfies Locators; }`,
      ),
    },
    {
      ...pageObject(
        `private get locators() { return ({ ok: this.page.locator("#ok") } satisfies Locators) as const; }`,
      ),
    },
    {
      // Not a holder name, so its shape is not this rule's business.
      ...pageObject(`get header() { return this.page.getByRole("banner"); }`),
    },
    {
      // A getter with no return statement has no object to make `as const`.
      ...pageObject(`private get locators() { throw Error("not ready"); }`),
    },
    {
      // Outside `src/pages/`.
      code: `class Helper { get locators() { return { ok: 1 }; } }`,
      filename: "src/flows/checkout.flow.ts",
    },
  ],
});
