# @qawolf/eslint-plugin-pom

ESLint rules for [QA Wolf](https://www.qawolf.com) page objects.

## Install

```bash
npm i --save-dev @qawolf/eslint-plugin-pom
```

## Use

Register the plugin and enable the rules it ships:

```js
// eslint.config.mjs
import * as pomLint from "@qawolf/eslint-plugin-pom";

export default [
  {
    plugins: { [pomLint.rulePrefix]: { rules: pomLint.rules } },
    rules: pomLint.ruleSeverities,
  },
];
```

`ruleSeverities` is keyed by the ids that arrangement produces, so the two stay
in step. To pick rules individually, name them yourself instead:

```js
rules: { "@qawolf/pom-lint/no-inline-locator-in-page-object": "error" }
```

### Without a config file

A host that registers rules through `Linter.defineRules` has no `plugins` block
to prefix the ids, so use `rulesById`, which is already prefixed:

```js
const linter = new Linter();
linter.defineRules(pomLint.rulesById);
linter.verify(source, { rules: pomLint.ruleSeverities }, { filename });
```

`rulesById` and `ruleSeverities` are keyed identically, so the two cannot drift
apart. Prefer them over prefixing `rules` yourself, because the two ways of
getting it wrong are not equally obvious: an id you enable but never register is
reported as `Definition for rule '...' was not found`, while rules you register
and never enable say nothing at all — the run comes back clean because none of
them ran.

## Rules

### `no-inline-locator-in-page-object`

A page object keeps its locators in a named getter, so a method body reads as
the action it performs and a changed selector is fixed in one place.

```ts
// Reported
async signIn() {
  await this.page.getByRole("button", { name: "Sign in" }).click();
}

// Expected
private get locators() {
  return { signInButton: this.page.getByRole("button", { name: "Sign in" }) } as const;
}
async signIn() {
  await this.locators.signInButton.click();
}
```

Applies to `.ts` files under `src/pages/`. `this.page.goto` and friends are
untouched — only locator builders are reported, and only when built directly
from `this.page`.

Ships at `warn`.
