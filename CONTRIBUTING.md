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

The unit tests run on the pinned `eslint` devDependency, which is 9, using its
flat `RuleTester`. The whole peer range is covered by `scripts/smoke.sh`, which
installs the packed tarball and lints a page object under ESLint 8, 9 and 10.
Run one with `./scripts/smoke.sh 8`.

### Which files should the rule check?

A rule sees every file in a workspace, so it has to recognise its own subject.
Page objects live under the workspace's page-object directory, so gate on the
path and bail out early:

```ts
create(context) {
  if (!isPageObjectContext(context)) return {};
  return { MemberExpression(node) { ... } };
}
```

`isPageObjectContext` comes from `src/pageObject/index.js`, and reads the
directory from settings so a workspace can move its page objects. Use it rather
than comparing paths yourself, because **no host passes the workspace path
verbatim**:

| Host                 | `context.filename`                                            |
| -------------------- | ------------------------------------------------------------- |
| Editor               | `file:///src/pages/home-page.ts`, percent-encoded per segment |
| Agent                | `/src/pages/home-page.ts`                                     |
| Plain `eslint`       | `/Users/qae/workspace/src/pages/home-page.ts`, or `C:\…`      |
| `RuleTester` default | `<input>`                                                     |

Getting this wrong is silent: a gate that never matches passes its tests and
reports nothing, which looks exactly like a rule that found no problems.

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
covers it for free.

### Scoping by code

The rules ported from `@qawolf/pom` take the other side of that trade-off, and
the helpers for it are shared:

- `enclosingPageObject(node)` from `src/pageObject/index.js` — the nearest
  enclosing class when its superclass is `BasePageObject`, `SubPageObject` or
  `EntryPointPageObject`. Call it per report. `memberName`,
  `enclosingClassMember` and `isLocatorHolder` sit beside it.
- `isFlowModule(context.sourceCode.ast)` from `src/flow/index.js` — a module
  that imports `flow` from `@qawolf/flows` (any subpath) or default-exports a
  `flow(...)` call. Check it once in `create()` and return `{}` when false.
  `isInsideFlowCallback`, `isFlowCall` and `flowCallbackOf` handle the callback.

A rule scoped this way needs no `filename` in its `RuleTester` cases; it still
needs the case for a file it must _not_ touch (a class with no base, a module
with no `flow` import). `src/rules/testSupport.ts` has the `flow(body)` and
`pageObject(body, base)` source builders.

Which mechanism a new rule uses depends on its subject: a rule about a
directory's contents scopes by path; a rule about the flow / page-object
boundary, or one that must see a page object wherever it lives, scopes by code.
Say which in the rule's doc comment.

## Rule ids

`rulePrefix` is `@qawolf/pom-lint`, not `@qawolf/pom` — that is a different,
published package, and sharing the name would make a rule id look like it ships
from there.

## Releasing

Version-driven: bump `version` in `package.json` in a pull request, and merging
to `main` publishes to npm. See [`RELEASING.md`](RELEASING.md) for the full
process.

Bump `version` in the same pull request as the rule. Without the bump nothing
is published and the rule never leaves this repo.

Publishing alone ships nothing, either: consumers install from committed
lockfiles, so a new version reaches a workspace only when that workspace's
lockfile moves. After the release, update each consumer you are responsible
for.
