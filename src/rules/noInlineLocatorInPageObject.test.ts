import { RuleTester } from "eslint";
import { createRequire } from "node:module";

import { noInlineLocatorInPageObjectRule } from "./noInlineLocatorInPageObject.js";

// RuleTester takes the parser as a resolved path, and this package is ESM.
const require = createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
});

const inlineLocator = [{ messageId: "inlineLocator" }];

const pagePath = "src/pages/sign-in-page.ts";

/** A filename is required: RuleTester defaults to `<input>`, which is out of scope. */
function pageObject(body: string, base = "BasePageObject") {
  return {
    code: `class SignInPage extends ${base} {\n${body}\n}`,
    filename: pagePath,
  };
}

ruleTester.run(
  "no-inline-locator-in-page-object",
  noInlineLocatorInPageObjectRule.module,
  {
    invalid: [
      {
        ...pageObject(`
          async signIn() {
            await this.page.getByRole("button", { name: "Sign in" }).click();
          }
        `),
        errors: inlineLocator,
      },
      {
        ...pageObject(`
          async search() {
            await this.page.locator("#search").fill("hello");
          }
        `),
        errors: inlineLocator,
      },
      {
        ...pageObject(`
          async confirm() {
            await this.page.frameLocator("#f").getByRole("button").click();
          }
        `),
        errors: inlineLocator,
      },
      {
        ...pageObject(`
          private get header() {
            return this.page.getByRole("banner");
          }
        `),
        errors: inlineLocator,
      },
      {
        ...pageObject(`
          locators() {
            return { ok: this.page.getByRole("button") };
          }
        `),
        errors: inlineLocator,
      },
      {
        ...pageObject(
          `async start() { await this.page.getByText("Go").click(); }`,
          "EntryPointPageObject",
        ),
        errors: inlineLocator,
      },
      {
        ...pageObject(
          `async start() { await this.page.getByText("Go").click(); }`,
          "SubPageObject<HomePage>",
        ),
        errors: inlineLocator,
      },
      {
        // `!`, `as` and `satisfies` wrap `this.page` in a node the shape match
        // would otherwise miss.
        ...pageObject(
          `async a() { await this.page!.getByRole("button").click(); }`,
        ),
        errors: inlineLocator,
      },
      {
        ...pageObject(
          `async a() { await (this.page as Page).getByRole("button").click(); }`,
        ),
        errors: inlineLocator,
      },
      {
        ...pageObject(
          `async a() { await (this.page satisfies Page).getByRole("button").click(); }`,
        ),
        errors: inlineLocator,
      },
      {
        // Nested wrappers.
        ...pageObject(
          `async a() { await (this.page! as Page).getByRole("button").click(); }`,
        ),
        errors: inlineLocator,
      },
      {
        // Extends another page object, the blind spot under base-class scoping.
        ...pageObject(
          `async signIn() { await this.page.getByRole("button").click(); }`,
          "LoginPage",
        ),
        errors: inlineLocator,
      },
      {
        code: `const SignInPage = class extends BasePageObject {
          async signIn() {
            await this.page.getByRole("button").click();
          }
        };`,
        errors: inlineLocator,
        filename: pagePath,
      },
      {
        code: `class SignInPage extends BasePageObject {
          async signIn() { await this.page.getByRole("button").click(); }
        }`,
        errors: inlineLocator,
        filename: "file:///src/pages/auth/sign-in-page.ts",
      },
      {
        code: `class SignInPage extends BasePageObject {
          async signIn() { await this.page.getByRole("button").click(); }
        }`,
        errors: inlineLocator,
        filename: "/src/pages/sign-in-page.ts",
      },
      {
        ...pageObject(`
          async pickFirst(names: string[]) {
            await Promise.all(
              names.map((name) => this.page.getByText(name).click()),
            );
          }
        `),
        errors: inlineLocator,
      },
      {
        ...pageObject(`
          private get locators() {
            return { ok: this.page.getByRole("button") } as const;
          }
          async submit() {
            await this.page.getByRole("button", { name: "Other" }).click();
          }
        `),
        errors: inlineLocator,
      },
    ],
    valid: [
      {
        ...pageObject(`
          private get locators() {
            return {
              emailInput: this.page.getByLabel("Email"),
              signInButton: this.page.getByRole("button", { name: "Sign in" }),
            } as const;
          }
        `),
      },
      {
        ...pageObject(`
          private get dynamicLocators() {
            return {
              airportOption: (airportName: string) =>
                this.page.getByText(airportName),
            } as const;
          }
        `),
      },
      {
        ...pageObject(`
          private readonly locators = {
            ok: this.page.getByRole("button"),
          } as const;
        `),
      },
      {
        ...pageObject(`
          private get selectors() {
            return { ok: this.page.locator("#ok") } as const;
          }
        `),
      },
      {
        ...pageObject(`
          private get dynamicSelectors() {
            return { row: (id: string) => this.page.locator(id) } as const;
          }
        `),
      },
      {
        ...pageObject(`
          async open(url: string) {
            await this.page.goto(url);
            await this.page.waitForLoadState();
          }
        `),
      },
      {
        // A `page` on something other than `this` is not this page object's.
        ...pageObject(
          `async a(helper: { page: Page }) { await helper.page.getByRole("button").click(); }`,
        ),
      },
      {
        // Narrowed off an instance locator, not off `this.page`.
        ...pageObject(`
          async confirm() {
            await this.dialog.getByRole("button", { name: "OK" }).click();
          }
        `),
      },
      {
        // References, not calls: nothing is built.
        ...pageObject(`
          async wire() {
            const build = this.page.getByRole;
            register(this.page.locator);
            return build;
          }
        `),
      },
      {
        ...pageObject(`
          async clickIn(row: { getByRole(role: string): { click(): Promise<void> } }) {
            await row.getByRole("button").click();
          }
        `),
      },
      {
        // Flows build locators inline by design.
        code: `class SignInPage extends BasePageObject {
          async signIn() { await this.page.getByRole("button").click(); }
        }`,
        filename: "src/flows/checkout.flow.ts",
      },
      {
        // No enclosing class member, so there is no holder to move it into.
        code: `export const build = () => this.page.getByRole("button");`,
        filename: pagePath,
      },
    ],
  },
);
