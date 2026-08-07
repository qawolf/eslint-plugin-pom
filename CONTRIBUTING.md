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

A rule sees every file in a workspace, so it has to recognise its own subject.
Page objects live under `src/pages/`, so gate on the path and bail out early:

```ts
create(context) {
  if (!isPageObjectFile(context.filename)) return {};
  return { MemberExpression(node) { ... } };
}
```

`isPageObjectFile` comes from `src/pageObject/index.js`. Use it rather than
comparing paths yourself, because **no host passes the workspace path
verbatim**:

| Host                 | `context.filename`                                            |
| -------------------- | ------------------------------------------------------------- |
| Editor               | `file:///src/pages/home-page.ts`, percent-encoded per segment |
| Agent                | `/src/pages/home-page.ts`                                     |
| `RuleTester` default | `<input>`                                                     |

A bare `context.filename.startsWith("src/pages/")` matches none of the three.
The rule would pass its tests and report nothing in either host — and a rule that
recognises nothing looks exactly like a rule that found no problems.

Which is also why **every `RuleTester` case needs an explicit `filename`**. Omit
it and the case is vacuous. Add a case for a file your rule should _not_ touch
(`src/flows/checkout.flow.ts` is a good one), then break the gate on purpose and
confirm both that case and the positive cases fail.

**The trade-off.** Scoping by path means a class inside `src/pages/` that is not
a page object is in scope too. In a directory reserved for page objects that is
the more useful default. The alternative — matching `extends BasePageObject` /
`EntryPointPageObject` / `SubPageObject` — is a tighter filter but misses a page
object that extends _another page object_:

```ts
export class AdminLoginPage extends LoginPage { ... } // no base class named
```

Following that chain needs type information a rule does not have. Path scoping
covers it for free, and it is the same definition platform uses for a page file.

## Rule ids

`rulePrefix` is `@qawolf/pom-lint`, not `@qawolf/pom` — that is a different,
published package, and sharing the name would make a rule id look like it ships
from there.

## Releasing

Version-driven: bump `version` in `package.json` in a pull request, and merging
to `main` publishes to GitHub Packages.

**Adding or changing a rule needs two bumps, not one.**

1. Bump `version` here, in the same pull request as the rule. Merging publishes
   it. Without the bump nothing is published and the rule never leaves this
   repo.
2. Bump `@qawolf/eslint-plugin-pom` in `qawolf/platform` to the version you just
   published, refresh the lockfile, and commit the regenerated
   `ts-worker.js` — the editor's linter is a checked-in bundle, so a rule that
   is only in the lockfile does not reach a QA engineer's editor.

The second bump is what actually ships the rule. Skipping it leaves the rule
published and unused, which looks identical to a rule that is not working.

> **Access:** if you cannot open that pull request, ask in #engineering.
