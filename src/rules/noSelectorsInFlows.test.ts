import { ruleTester } from "../testHelpers.js";

import { noSelectorsInFlowsRule } from "./noSelectorsInFlows.js";
import { flow } from "./testSupport.js";

ruleTester.run("no-selectors-in-flows", noSelectorsInFlowsRule.module, {
  invalid: [
    {
      code: flow(`await page.getByRole("button", { name: "Save" }).click();`),
      errors: [{ data: { method: "getByRole" }, messageId: "selector" }],
    },
    {
      // Any receiver: a locator narrowed from a locator is still a selector.
      code: flow(`await dialog.locator(".confirm").click();`),
      errors: [{ data: { method: "locator" }, messageId: "selector" }],
    },
    {
      // Each builder in a chain is its own selector.
      code: flow(`await page.frameLocator("#f").getByText("Go").click();`),
      errors: [{ messageId: "selector" }, { messageId: "selector" }],
    },
    {
      code: flow(`const row = page.getByTestId("row");`),
      errors: [{ messageId: "selector" }],
    },
  ],
  valid: [
    {
      code: flow(`
        const settings = await SettingsPage.create();
        await settings.save();
      `),
    },
    {
      // A property, not a call: nothing is being built here.
      code: flow(`const build = page.locator;`),
    },
    {
      // Not a flow module.
      code: `async function run(page: Page) {
        await page.getByRole("button").click();
      }`,
    },
  ],
});
