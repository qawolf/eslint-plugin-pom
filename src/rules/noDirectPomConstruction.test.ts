import { pageObject, ruleTester } from "../testHelpers.js";
import { noDirectPomConstructionRule } from "./noDirectPomConstruction.js";

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
        ...pageObject(`
          async goToDashboard() {
            const dashboard = new DashboardPage(this.page);
            return dashboard;
          }
        `),
        errors: useCreate,
      },
      {
        ...pageObject(`async openEdit() { return new EditModal(this.page); }`),
        errors: useCreate,
      },
      {
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
        ...pageObject(`async fail() { throw new Error("nope"); }`),
      },
      {
        // A different member off `this`, not the page.
        ...pageObject(`async go() { return new DashboardPage(this.context); }`),
      },
      {
        code: `class Flow { async go() { return new DashboardPage(this.page); } }`,
        filename: "src/flows/checkout.flow.ts",
      },
    ],
  },
);
