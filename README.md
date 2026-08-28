# @qawolf/eslint-plugin-pom

ESLint rules for [QA Wolf](https://www.qawolf.com) page objects.

## Requirements

- Node.js `>=20.19.0 <25`
- ESLint `>=8.40.0`, **using flat config** (`eslint.config.mjs`)
- A TypeScript parser in your config, such as
  [`@typescript-eslint/parser`](https://typescript-eslint.io/packages/parser)

This package is ESM-only, which a `.eslintrc.*` file cannot load — ESLint 8
resolves eslintrc plugins with `require`, and that fails here with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. On ESLint 8 you need flat config turned on
(`ESLINT_USE_FLAT_CONFIG=true`); on 9 and later it is the default.

## Install

```bash
npm i --save-dev @qawolf/eslint-plugin-pom
```

## Use

Point a TypeScript parser at your page objects, then spread the recommended
config, which turns on every rule at its shipped severity:

```js
// eslint.config.mjs
import tsParser from "@typescript-eslint/parser";
import pomLint from "@qawolf/eslint-plugin-pom";

export default [
  { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
  pomLint.configs.recommended,
];
```

The parser is not optional. Without one ESLint reads a page object as plain
JavaScript and reports `Parsing error` instead of linting it.

To pick rules yourself, register the plugin and name them:

```js
export default [
  { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
  {
    plugins: { "@qawolf/pom-lint": pomLint },
    rules: { "@qawolf/pom-lint/no-inline-locator-in-page-object": "error" },
  },
];
```

## Where your page objects live

The page-object rules ignore files outside your page-object directory, which
defaults to `src/pages/`. If yours live somewhere else, say so once and all the rules
follow:

```js
export default [
  { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
  { settings: { "@qawolf/pom-lint": { pagesDirectory: "e2e/pages" } } },
  pomLint.configs.recommended,
];
```

A leading `./` and a trailing `/` are both accepted. The rules read `.ts`,
`.mts` and `.cts` files under the directory. A value that cannot name a
directory raises an error rather than falling back to the default, because a
rule scoped to a directory that does not exist reports nothing and reads
exactly like a clean workspace.

## How a rule finds its subject

Two mechanisms, and each rule says which it uses:

- **By path.** The page-object rules apply to `.ts` files under the page-object
  directory above, the directory a workspace reserves for page objects.
- **By code.** The rules ported from `@qawolf/pom` recognise a **flow** as a
  module that imports `flow` from `@qawolf/flows` (any subpath) or
  default-exports a `flow(...)` call, and a **page object** as a class whose
  superclass is `BasePageObject`, `SubPageObject` or `EntryPointPageObject`,
  wherever the file lives. The `.flow.ts` name is not the signal, so a flow
  kept elsewhere is still checked. A page object that extends _another page
  object_ is not recognised this way — following that chain needs type
  information — which is why the path is the default for page objects.

A file that is neither is not checked, except by the rules marked _anywhere_
and by `file-naming-convention`, whose subject is the path itself.

## Rules

| Rule                                    | Level | Where                 | Reports                                                                                    |
| --------------------------------------- | ----- | --------------------- | ------------------------------------------------------------------------------------------ |
| `no-raw-page-in-flows`                  | error | flow                  | `page.goto()`, `page.click()`, … in a flow                                                 |
| `no-selectors-in-flows`                 | error | flow                  | `locator()` / `getBy*()` / `frameLocator()` in a flow, on any receiver                     |
| `no-expect-in-flows`                    | warn  | flow                  | `expect()` in a flow, rather than an `assert*()` page-object method                        |
| `no-fetch-axios-in-flows`               | error | flow                  | `fetch()` or an `axios` import in a flow                                                   |
| `no-any-shared-state`                   | error | flow                  | a `let` inside the flow callback typed `any`, or not typed at all                          |
| `flow-export-structure`                 | error | flow                  | a flow module without `export default flow(name, target, callback)`, or a non-literal name |
| `no-code-between-steps`                 | error | flow                  | a statement after the first `await test(...)` that is not itself one                       |
| `test-aaa-comments`                     | warn  | flow                  | a step with no Arrange / Act / Assert comment                                              |
| `aaa-banner-format`                     | warn  | flow                  | an Arrange / Act / Assert marker that is not the 32-dash three-line banner                 |
| `assert-expect-pairing`                 | warn  | `src/pages/`          | `expect()` in a page-object method not named `assert*`                                     |
| `correct-base-class`                    | warn  | `src/pages/`          | a class that reads `this.page` but extends nothing, or not a page-object base              |
| `entry-point-factory`                   | warn  | `src/pages/`          | an `EntryPointPageObject` subclass with no `static create()`                               |
| `no-direct-pom-construction`            | warn  | `src/pages/`          | `new OtherPage(this.page)` instead of `this.create("OtherPage")`                           |
| `no-inline-locator-in-page-object`      | warn  | `src/pages/`          | a locator built from `this.page` outside the `locators` getter                             |
| `no-legacy-selectors`                   | warn  | `src/pages/`          | XPath, a `css=` / `text=` / `id=` prefix, or a `>>` chain in a `locator()` string          |
| `no-mutable-state-in-pom`               | warn  | `src/pages/`          | an instance field that is not `readonly`                                                   |
| `no-public-constructor`                 | warn  | `src/pages/`          | a redeclared constructor that is not `protected`                                           |
| `no-wait-for-timeout-in-poms`           | warn  | `src/pages/`          | `waitForTimeout()` / `waitForSelector()` in a page object                                  |
| `selector-getter-shape`                 | warn  | `src/pages/`          | a `locators` holder that is public, a field, a method, or missing `as const`               |
| `typed-create-return`                   | warn  | `src/pages/`          | a method returning `this.create("Name")` with no return type naming `Name`                 |
| `web-first-assertions`                  | warn  | `src/pages/`          | `expect(await locator.isVisible()).toBe(true)` and its siblings                            |
| `require-locator-jsdoc`                 | warn  | page object, by class | an entry in the `locators` map with no `/** … */` above it                                 |
| `require-env-pattern`                   | error | flow or page object   | `process.env.X` in a flow or page object, instead of the workspace's `requireEnv()`        |
| `require-value-import-for-created-page` | error | _anywhere_            | `this.create("Name")` where `Name` is bound by a type-only import                          |
| `file-naming-convention`                | warn  | _anywhere_            | a file under `src/` whose name is not kebab-case                                           |
| `no-non-null-assertion`                 | error | _anywhere_            | a postfix `!`                                                                              |
| `no-parameter-properties`               | error | _anywhere_            | `constructor(private x: T)`                                                                |

`warn` marks a convention rather than a defect. A pre-commit hook that runs
`eslint --max-warnings 0` turns warnings into blockers; if a workspace is not
ready for one, turn it `"off"` in the config rather than disabling it at each
site.

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

### `correct-base-class`

A class under `src/pages/` that reads `this.page` has to extend a page-object
base.

```ts
// Reported
export class SignInPage {                          // missingBase
  async signIn() { await this.page.getByRole("button").click(); }
}
export class SignInPage extends EventEmitter { … }  // unknownBase

// Expected
export class SignInPage extends BasePageObject { … }
```

The base class is what supplies `this.page`, `this.create()` and the page hooks —
a class reading `this.page` without one only compiles because `page` was declared
by hand, and it gets none of the rest.

A superclass named like a page object (`…Page`, `…Component`, `…Modal`) is
accepted rather than reported: extending another page object is legitimate and
names no base class. A class that never touches `this.page` — a data factory, a
helper — is left alone, even in `src/pages/`. Class expressions are covered, since
the rule visits the class body.

One thing the rule cannot check: a workspace provisioned before `@qawolf/pom`
keeps its own copy of the kit under `src/lib/`, and the two must not be mixed —
each carries its own page registry, so a page object registered through one is
invisible to `this.create()` in the other. Import the base from wherever the rest
of the workspace imports it.

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

**`require-locator-jsdoc`** (warn) — an entry in the `locators` map (getter or
property form; `as const` / `satisfies` unwrapped) with no `/** … */` above it.
The selector says how the element is found today; the comment says what it
must find.

**`require-value-import-for-created-page`** (error, anywhere) —
`this.create("Name")` where `Name` is bound by a type-only import from a
relative or absolute path. The name is resolved at runtime by reading the
calling file's imports, and compilation erases a type-only import, so on the
runner the call throws `Unknown page`. Drop the `type`, or pass the class:
`this.create(Name)`.

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the constraints a rule has to
respect, and how releases are cut.

## Security

Report vulnerabilities as described in [SECURITY.md](SECURITY.md). Please do not
open a public issue for them.

## License

[MIT](LICENSE)
