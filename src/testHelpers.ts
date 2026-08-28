import tsParser from "@typescript-eslint/parser";
import { RuleTester } from "eslint";

export const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    parser: tsParser,
    sourceType: "module",
  },
});

export const pagePath = "src/pages/sign-in-page.ts";

/** A filename is required: RuleTester defaults to `<input>`, which is out of scope. */
export function pageObject(body: string, base = "BasePageObject") {
  return {
    code: `class SignInPage extends ${base} {\n${body}\n}`,
    filename: pagePath,
  };
}
