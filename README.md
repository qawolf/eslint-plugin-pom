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

## How a rule finds its subject

Two mechanisms, and each rule says which it uses:

- **By path.** The original three rules apply to `.ts` files under
  `src/pages/`, the directory a workspace reserves for page objects.
- **By code.** The rules ported from `@qawolf/pom` recognise a **page object**
  as a class whose superclass is `BasePageObject`, `SubPageObject` or
  `EntryPointPageObject`, and a **flow** as a module that imports `flow` from
  `@qawolf/flows` (any subpath) or default-exports a `flow(...)` call. The
  `.flow.ts` name is not the signal, so a flow kept elsewhere is still
  checked. A page object that extends _another page object_ is not recognised
  this way — following that chain needs type information.

A file that is neither is not checked, except by the rules marked _anywhere_
and by `file-naming-convention`, whose subject is the path itself.

## Rules

| Rule                                    | Level | Reports                                                                                    |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| `no-raw-page-in-flows`                  | error | `page.goto()`, `page.click()`, … in a flow                                                 |
| `no-selectors-in-flows`                 | error | `locator()` / `getBy*()` / `frameLocator()` in a flow, on any receiver                     |
| `no-expect-in-flows`                    | warn  | `expect()` in a flow, rather than an `assert*()` page-object method                        |
| `no-fetch-axios-in-flows`               | error | `fetch()` or an `axios` import in a flow                                                   |
| `no-any-shared-state`                   | error | a `let` inside the flow callback typed `any`, or not typed at all                          |
| `flow-export-structure`                 | error | a flow module without `export default flow(name, target, callback)`, or a non-literal name |
| `no-code-between-steps`                 | error | a statement after the first `await test(...)` that is not itself one                       |
| `test-aaa-comments`                     | warn  | a step with no Arrange / Act / Assert comment                                              |
| `aaa-banner-format`                     | warn  | an Arrange / Act / Assert marker that is not the 32-dash three-line banner                 |
| `assert-expect-pairing`                 | error | `expect()` in a page-object method not named `assert*`                                     |
| `entry-point-factory`                   | error | an `EntryPointPageObject` subclass with no `static create()`                               |
| `no-inline-locator-in-page-object`      | warn  | a locator built from `this.page` outside the `locators` getter                             |
| `no-legacy-selectors`                   | error | XPath, a `css=` / `text=` / `id=` prefix, or a `>>` chain in a `locator()` string          |
| `no-mutable-state-in-page-object`       | warn  | an instance field that is not `readonly`                                                   |
| `no-page-object-constructor`            | error | a constructor on a page object                                                             |
| `no-wait-for-timeout`                   | error | `waitForTimeout()` / `waitForSelector()` in a page object or a flow                        |
| `require-locator-jsdoc`                 | warn  | an entry in the `locators` map with no `/** … */` above it                                 |
| `require-page-object-base-class`        | warn  | a class with a `locators` map that extends nothing                                         |
| `require-value-import-for-created-page` | error | `this.create("Name")` where `Name` is bound by a type-only import                          |
| `selector-getter-shape`                 | warn  | a `locators` holder that is public, a field, a method, or missing `as const`               |
| `web-first-assertions`                  | warn  | `expect(await locator.isVisible()).toBe(true)` and its siblings                            |
| `require-env-pattern`                   | error | `process.env.X` in a flow or page object, instead of the workspace's `requireEnv()`        |
| `file-naming-convention`                | warn  | a file under `src/` whose name is not kebab-case                                           |
| `no-non-null-assertion`                 | error | a postfix `!` — _anywhere_                                                                 |
| `no-parameter-properties`               | error | `constructor(private x: T)` — _anywhere_                                                   |

`warn` marks a convention rather than a defect. A pre-commit hook that runs
`eslint --max-warnings 0` turns warnings into blockers; if a workspace is not
ready for one, turn it `"off"` in the config rather than disabling it at each
site.

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

### The flow / page-object boundary

Applies to flow modules, recognised by code (see above).

**`no-raw-page-in-flows`** (error) — a member named like a Playwright `Page`
method on an identifier named `page`: `page.goto()`, `page.click()`,
`page.waitForTimeout()`, … A flow says what the user does; how the app is
driven belongs to the page object.

**`no-selectors-in-flows`** (error) — `locator()`, `getBy*()` or
`frameLocator()` called on any receiver in a flow. A selector in a flow is
invisible to every other flow that needs the element.

**`no-expect-in-flows`** (warn) — `expect()`, `expect.soft()` or
`expect.poll()` in a flow. Assertions live in `assert*()` page-object methods.

**`no-fetch-axios-in-flows`** (error) — a `fetch()` call or an `axios` import
in a flow. HTTP goes behind a helper on Playwright's request API.

**`no-any-shared-state`** (error) — a `let` inside the flow callback (any
depth) typed `any`, initialised with an `any` cast, or declared with neither a
type nor an initializer. Shared state is typed as the page object it holds.

### Flow structure

**`flow-export-structure`** (error) — a module that imports `flow` but does
not `export default flow(name, target, callback)`, with three arguments and a
string-literal name. The target's value is not checked: the platform serves
its execution targets as a catalogue that changes without a release of this
package, so any list here would go stale.

**`no-code-between-steps`** (error) — once the flow callback's first
`await test(...)` has run, every later top-level statement must be one too.
Setup goes above the first step.

**`test-aaa-comments`** (warn) — every `test("name", cb)` body has a comment
containing Arrange, Act and Assert (any case; a combined `// Arrange / Act:`
marks both).

**`aaa-banner-format`** (warn) — each marker is the three-line banner: a line
of exactly 32 dashes, `// Arrange:` (title case, trailing colon), 32 dashes.

### Page objects, by superclass

Applies to classes extending `BasePageObject`, `SubPageObject` or
`EntryPointPageObject`, wherever the file lives.

**`assert-expect-pairing`** (error) — `expect()` inside a method whose name
does not match `assert[A-Z]…`. The name is the contract: a flow reading
`save()` cannot see that it also asserts, and one that needs the action without
the check cannot get it.

**`entry-point-factory`** (error) — a concrete `EntryPointPageObject` subclass
with no `static create()`; `abstract` bases are skipped. `initializeBrowser`
is `protected static`, so `create` is the one place a flow can get a browser
with the entry point's hooks installed.

**`no-legacy-selectors`** (error) — a string handed to `locator()` /
`frameLocator()` that is XPath (`//…`, `(//…`, `xpath=`), carries a `css=` /
`text=` / `id=` engine prefix, or chains with `>>`. Template literals are
checked by their static parts. `:text()` / `:has-text()` are current CSS and
pass.

**`no-mutable-state-in-page-object`** (warn) — an instance field that is not
`readonly`, `static` or `declare`. The `locators` map is exempt in any form.
Data flows through parameters and return values.

**`no-page-object-constructor`** (error) — any constructor. `createFromPage`,
`this.create(...)` and an entry point's `create` all call `new Cls(page)`; a
constructor taking anything else cannot be satisfied from them, and for
`this.create("Name")` that fails on the runner rather than in `tsc`.

**`no-wait-for-timeout`** (error) — `waitForTimeout()` or `waitForSelector()`
in a page object or a flow. Wait for the condition: `locator.waitFor()`,
`page.waitForURL()`, or a web-first assertion.

**`require-locator-jsdoc`** (warn) — an entry in the `locators` map (getter or
property form; `as const` / `satisfies` unwrapped) with no `/** … */` above it.
The selector says how the element is found today; the comment says what it
must find.

**`require-page-object-base-class`** (warn) — a class with a `locators` map
and no `extends` at all. A class extending something other than a known base
is left alone: it may be a page object extending another page object.

**`require-value-import-for-created-page`** (error) — `this.create("Name")`
where `Name` is bound by a type-only import from a relative or absolute path.
The name is resolved at runtime by reading the calling file's imports, and
compilation erases a type-only import, so on the runner the call throws
`Unknown page`. Drop the `type`, or pass the class: `this.create(Name)`.

### Workspace conventions and TypeScript hygiene

**`require-env-pattern`** (error) — `process.env.X` (dot, bracket, or with
`!`) in a flow or page object. Read it through the workspace's
`requireEnv("X")` / `optionalEnv("X")` helper, which fails at the read with
the variable's name. Library code, including the helper's own module, is not
in scope.

**`file-naming-convention`** (warn) — a file under a `src/` directory whose
name, minus its extension and any `.flow` / `.test` / `.spec` suffix, is not
kebab-case. The one rule that is about the path, because the path is its
subject.

**`no-non-null-assertion`** (error, anywhere) — a postfix `!`. Replace it with
`?.`, a type guard, or a throw that names what was missing.

**`no-parameter-properties`** (error, anywhere) — `constructor(private x: T)`.
Not erasable syntax: Node's type stripping rejects the file. Declare the field
and assign it in the constructor body; the message spells out the rewrite.
