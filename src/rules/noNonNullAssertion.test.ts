import { ruleTester } from "../testHelpers.js";

import { noNonNullAssertionRule } from "./noNonNullAssertion.js";

ruleTester.run("no-non-null-assertion", noNonNullAssertionRule.module, {
  invalid: [
    {
      code: `const url = process.env.URL!;`,
      errors: [{ messageId: "nonNullAssertion" }],
    },
    {
      code: `await this.page!.goto(url);`,
      errors: [{ messageId: "nonNullAssertion" }],
    },
    {
      // Every assertion in a chain is its own report.
      code: `const name = rows[0]!.cells[1]!.text;`,
      errors: [
        { messageId: "nonNullAssertion" },
        { messageId: "nonNullAssertion" },
      ],
    },
  ],
  valid: [
    { code: `const url = requireEnv("URL");` },
    { code: `const name = rows[0]?.cells[1]?.text;` },
    {
      // `!` as logical not is not the assertion.
      code: `if (!row) throw Error("No row for " + name);`,
    },
    { code: `const done = a !== b;` },
  ],
});
