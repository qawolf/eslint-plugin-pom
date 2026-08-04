# Contributing

## Setup

```bash
npm ci
npm test
```

## Writing a rule

Add a file to `src/rules/`, list it in `src/index.ts`, and cover it with
ESLint's `RuleTester`.

### Constraints

A rule may run outside Node, and under either ESLint 8 or 9, so keep it to plain
AST work:

- **No Node built-ins.** No `fs`; use string operations instead of `path`.
  Enforced by `import/no-nodejs-modules` for everything outside tests.
- **No APIs that changed between ESLint 8 and 9.** The `eslint` peer range is
  `>=8.40.0`.
- **No autofixes.** Consumers drop `fix` before the diagnostic reaches an
  editor, so describe the fix in the message instead.

### Which files should the rule check?

A rule sees every file in a workspace, so it has to recognise its own subject —
and it is usually better to do that from the code than from the file path.

Paths are not dependable. Most page objects sit in a `pages/` directory, but not
all of them: an entry point often lives elsewhere, and layouts differ between
workspaces. The class declaration is the more stable signal:

```ts
export class SignInPage extends BasePageObject { ... }
```

So check the superclass: `BasePageObject`, `EntryPointPageObject` or
`SubPageObject`. It is right there in the AST and needs no type information.
`no-inline-locator-in-page-object` is the worked example, and it handles the
variations you would expect — `abstract class`, `export default class`, and the
generic `extends SubPageObject<Parent>`.

**Where this approach stops.** A page object that extends _another page object_
names neither base class, so a superclass check does not match it:

```ts
export class AdminLoginPage extends LoginPage { ... } // not matched
```

Following that chain means resolving an import, which needs type information a
rule does not have. Every page object in the workspaces checked so far extends a
base class directly, so this is a known blind spot rather than a common one — but
say so in the rule rather than implying full coverage.

One thing to watch. A rule that recognises nothing reports nothing, which looks
exactly like a rule that found no problems. So add a `RuleTester` case for a file
your rule should _not_ touch, then break the check on purpose and confirm that
case fails.

## Rule ids

`rulePrefix` is `@qawolf/pom-lint`, not `@qawolf/pom` — that is a different,
published package, and sharing the name would make a rule id look like it ships
from there.

## Releasing

Version-driven: bump `version` in `package.json` in a pull request, and merging
to `main` publishes to GitHub Packages.
