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

### `entry-point-factory`

A class extending `EntryPointPageObject` needs a `static create()`.

```ts
// Reported
export class SignInPage extends EntryPointPageObject {
  async signIn() { ... }
}

// Expected
export class SignInPage extends EntryPointPageObject {
  static async create(options: CreateOptions = {}): Promise<SignInPage> { ... }
}
```

The entry point is the one page object a flow constructs itself, and `create` is
what launches the browser and installs the page hooks before handing the instance
back. Without it there is no way in, since the constructor is protected.

A static _field_ named `create` does not satisfy it — only a static method does.
`BasePageObject` and `SubPageObject` subclasses are untouched; a flow reaches
those through `this.create(…)` on a page object it already holds.

Applies to `.ts` files under `src/pages/`.

Ships at `warn`.

### `no-direct-pom-construction`

Sibling page objects come from the registry, not from `new`.

```ts
// Reported
async goToDashboard() { return new DashboardPage(this.page); }

// Expected
async goToDashboard(): Promise<DashboardPage> {
  return this.create("DashboardPage");
}
```

`this.create` looks the class up in the page registry, which is how two page
objects can use each other without importing each other as values — a circular
import. The name is a string for the same reason, so it has to match the class
exactly, and `create` is async.

Reported when the constructed name ends in `Page`, `Component` or `Modal` and
`this.page` is among the arguments, including through a `!` or an `as`. Anything
else handed the page — `new NetworkMonitor(this.page)` — is left alone, since the
registry does not hold it and there is no `create` call to point it at.

A class constructing itself is fine: a page object's own `static create` factory
is exactly where `new ThisPage(page)` belongs.

Applies to `.ts` files under `src/pages/`.

Ships at `warn`.

### `no-wait-for-timeout-in-poms`

Wait for the thing, not for a duration.

```ts
// Reported
await this.page.waitForTimeout(2000);
await this.page.waitForSelector("#ok");

// Expected
await this.locators.banner.waitFor();
await this.page.waitForURL("**/home");
await expect(this.locators.banner).toBeVisible();
```

The two fail differently, and the message says which: a fixed sleep passes on a
fast machine and fails on a slow one, while `waitForSelector` returns before the
element is stable _and_ takes a selector string, so it also routes around the
`locators` getter.

A `waitForTimeout` with a comment on the same line or the line above is left
alone — that is the justification the code-review checklist asks for, and some
waits genuinely have nothing observable to hang on. `waitForSelector` has no such
exemption, since a comment does not make the selector string a locator.

`waitForURL` and `waitForLoadState` are untouched; both wait on a real condition.

Applies to `.ts` files under `src/pages/`.

Ships at `warn`.

### `no-legacy-selectors`

Bans XPath, the deprecated engine prefixes, and the `>>` engine chain in
`locator()` / `frameLocator()` strings.

```ts
// Reported
this.page.locator("//div[@id='ok']"); // noXpath
this.page.locator("xpath=//div"); // noXpath
this.page.locator("text=Sign in"); // noLegacyEngine
this.page.locator("form >> button"); // noChainCombinator

// Expected
this.page.getByRole("button", { name: "Sign in" });
this.page.locator("form").locator("button");
```

XPath breaks on any markup reshuffle and cannot pierce shadow DOM. The
`css=` / `text=` / `id=` prefixes are v1 engine syntax — modern Playwright takes a
bare CSS string or a `getBy*` method.

Not banned: `:text-is()`, `:has-text()` and friends. Those are current Playwright
pseudo-classes, not the legacy `text=` engine — the canonical `dynamicLocators`
example uses `:text-is()`. A prefix only counts at the start of the string, so an
ordinary attribute selector like `[data-id=submit]` is left alone.

The static chunks of a template literal are checked too, since a prefix survives
interpolation. A fully dynamic selector has nothing to read and is skipped.

Every message ends with the same caveat: a selector carried over from a recorded
flow should only be rewritten when the replacement targets the same element.
Satisfying a linter is not a reason to change what a test clicks.

Applies to `.ts` files under `src/pages/`.

Ships at `warn`.

### `no-mutable-state-in-pom`

Page objects describe a page; they do not remember things about it.

```ts
// Reported
private lastSearchTerm = "";
private rowCount: number;

// Expected
async search(term: string): Promise<string> { …; return term; }
private readonly defaultUrl = "https://example.com";
```

State written to a field does not survive: every `this.create(…)` builds a fresh
instance, so what one method writes is gone the next time that page object is
reached for. It reads as belonging to the page and does not — a worse failure
than not having it at all.

Left alone: `readonly` and `static` fields, the inherited `page`, a locator
holder in field form (`selector-getter-shape` reports that one, and two warnings
for one field is noise), and a field holding a helper function, which is
behaviour rather than state. Only page-object classes are reported, so a helper
class sharing the directory is out of scope.

Applies to `.ts` files under `src/pages/`.

Ships at `warn`.

### `no-public-constructor`

`BasePageObject` declares `protected constructor(page: Page)`. Redeclaring one
without saying `protected` widens it to public.

```ts
// Reported
constructor(page: Page) { super(page); }
public constructor(page: Page) { super(page); }

// Expected — delete it, or keep the base's visibility
protected constructor(page: Page) { super(page); }
```

A public constructor lets any code call `new SignInPage(page)` and skip the
registry, which is what `no-direct-pom-construction` exists to protect. A
constructor whose body only calls `super(page)` can go entirely — it is
inherited.

Only classes that are page objects are reported: one extending
`BasePageObject`, `EntryPointPageObject` or `SubPageObject`, or named like a page
object (`…Page`, `…Component`, `…Modal`) since a page object may extend another
page object. A helper class that happens to sit under `src/pages/` is left alone.

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
