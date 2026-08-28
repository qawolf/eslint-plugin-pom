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

## Rules

### `assert-expect-pairing`

Only `assert*` methods hold assertions.

```ts
// Reported
async signIn() {
  await this.locators.signInButton.click();
  await expect(this.locators.banner).toBeVisible();
}

// Expected
async signIn() { await this.locators.signInButton.click(); }
async assertSignedIn() { await expect(this.locators.banner).toBeVisible(); }
```

An assertion method holds no actions, and its name starts with `assert`. A method
that acts and asserts hands every caller the check too, so a flow that only wants
the action cannot opt out of it. The message names the `assert*` method to
move the `expect` calls into and says to call that from the flow — an assertion
nothing calls leaves the flow green while it checks nothing.

The prefix has to be followed by a capital, so `assert` and `assertion` are both
reported. A method whose name starts with `expect` gets the shorter message: it
only asserts already, so its name should start with `assert` and the fix is the
rename alone.

Three shapes are left alone:

- A `waitFor*` method. Its `await expect(locator).toBeVisible()` is the sync
  point the caller awaits, not a check to move out.
- An `expect` inside a loop. A cleanup method needs that settle wait every
  iteration, or the next one acts on a stale row.
- A field initializer, which has no actions to separate the assertion from.

Applies to `.ts` files under `src/pages/`.

Ships at `warn`.

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
untouched — only locator builders are reported, and only when built from
`this.page`, including through a `!` or an `as`.

Ships at `warn`.

### `selector-getter-shape`

The locator holder is a private getter returning `as const`.

```ts
// Reported
get locators() { ... }                          // not private
locators() { ... }                              // not a getter
private readonly locators = { ... } as const;   // a field, not a getter
private get locators() { return { ... }; }      // missing `as const`

// Expected
private get locators() {
  return { signInButton: this.page.getByRole("button") } as const;
}
```

`as const` is what makes a typo in `this.locators.signInButon` a compile error
rather than a failing test, and `private` keeps a flow from reaching past the
page object into markup it is meant to hide.

Applies to `.ts` files under `src/pages/`, to `locators` and `dynamicLocators`,
and to the mobile `selectors` and `dynamicSelectors`.

Ships at `warn`.

### `typed-create-return`

A method handing back another page object says which one.

```ts
// Reported
async goToDashboard() { return this.create("DashboardPage"); }
async goToDashboard(): Promise<any> { return this.create("DashboardPage"); }

// Expected
async goToDashboard(): Promise<DashboardPage> {
  return this.create("DashboardPage");
}
```

Without the return type the caller gets whatever the call infers — `BasePageObject`
or `any` — so `DashboardPage`'s own methods either go missing or type-check
against nothing. `any`, `unknown`, `void` and their `Promise<…>` spellings count
as no return type, since none of them name the class.

Two shapes are covered, both of which hand a page object to the caller:

```ts
return this.create("DashboardPage"); // a sibling from the registry
return PreviewPage.createFromPage(popupPage); // a new tab wrapped in its class
```

The suggested type follows the method: `Promise<DashboardPage>` for an `async`
method, `DashboardPage` for a synchronous one. `return await this.create(…)`
counts as the same shape.

A dynamic name — `this.create(nextPage)` — is left alone, since there is no class
name to suggest.

Applies to `.ts` files under `src/pages/`.

Ships at `warn`.

### `web-first-assertions`

Assert on the locator, not on a value read out of it.

```ts
// Reported
expect(await this.locators.banner.isVisible()).toBe(true);
expect(await this.locators.rows.count()).toBe(3);
expect(await this.locators.box.isChecked()).toBe(false);

// Expected
await expect(this.locators.banner).toBeVisible();
await expect(this.locators.rows).toHaveCount(3);
await expect(this.locators.box).not.toBeChecked();
```

The `await` runs before `expect` sees it, so `expect` only ever gets a plain
value: it checks once, at that instant, and fails if the element has not reached
that state yet — the usual source of a test that passes locally and fails in CI.
Passing the locator instead lets Playwright re-check until it holds or the
timeout expires.

Note the third pair: the matcher has to keep the assertion pointing the same way,
so a comparison against `false` becomes `.not.`.

Ten reads are covered, each with its own suggested matcher in the message:
`isVisible`, `isEnabled`, `isDisabled`, `isChecked`, `isHidden`, `innerText`,
`textContent`, `count`, `getAttribute`, `inputValue`.

Applies to `.ts` files under `src/pages/`. Reading a value to use it is fine —
only reads inside `expect(await ...)` are reported.

Ships at `warn`.
