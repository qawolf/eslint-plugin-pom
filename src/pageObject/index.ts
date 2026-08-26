import type { Rule } from "eslint";

const pagesDirectoryPrefix = "src/pages/";

/**
 * No host passes the workspace path verbatim: the editor lints
 * `file:///src/pages/home-page.ts` percent-encoded per segment, the agent
 * `/src/pages/home-page.ts`, a plain `eslint` run an absolute path, and
 * `RuleTester` defaults to `<input>`.
 *
 * Matching a path segment rather than a prefix covers all of them, the `file://`
 * scheme included, and is why an absolute path works -- anchoring at the start
 * would silently never fire under plain ESLint. The leading `/` is what keeps
 * `my-src/pages/` and `notsrc/pages/` out.
 *
 * Not percent-decoded: `encodeURIComponent` leaves letters, `.` and `/` alone,
 * so the directory and extension survive encoding, and decoding could throw on
 * a stray `%` mid-lint.
 */
export function isPageObjectFile(filename: string): boolean {
  const path = filename.replaceAll("\\", "/");
  if (!path.endsWith(".ts")) return false;

  return (
    path.startsWith(pagesDirectoryPrefix) ||
    path.includes(`/${pagesDirectoryPrefix}`)
  );
}

/** `??=` keeps the innermost member, for a class nested inside a method. */
export function enclosingClassMember(node: Rule.Node): Rule.Node | undefined {
  let member: Rule.Node | undefined;
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (
      current.type === "MethodDefinition" ||
      current.type === "PropertyDefinition"
    )
      member ??= current;

    current = current.parent;
  }

  return member;
}

const pageObjectBases = new Set([
  "BasePageObject",
  "EntryPointPageObject",
  "SubPageObject",
]);

const pageObjectSuffixes = ["Component", "Modal", "Page"];

/** Page objects are named for what they are: a `Page`, `Component` or `Modal`. */
export function isPageObjectName(name: string): boolean {
  return pageObjectSuffixes.some((suffix) => name.endsWith(suffix));
}

/**
 * A class extending a page-object base, or named like one -- which covers a page
 * object extending another page object, where no base class is named. Keeps a
 * helper class that happens to sit under `src/pages/` out of scope.
 */
export function isPageObjectClass(node: Rule.Node | undefined): boolean {
  if (!node) return false;
  if (node.type !== "ClassDeclaration" && node.type !== "ClassExpression")
    return false;

  if (node.id && isPageObjectName(node.id.name)) return true;

  const { superClass } = node;
  if (superClass?.type !== "Identifier") return false;

  return (
    pageObjectBases.has(superClass.name) || isPageObjectName(superClass.name)
  );
}

/** The class this node sits in, innermost first. */
export function enclosingClass(node: Rule.Node): Rule.Node | undefined {
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (
      current.type === "ClassDeclaration" ||
      current.type === "ClassExpression"
    )
      return current;

    current = current.parent;
  }

  return undefined;
}

/** `selectors` and `dynamicSelectors` are the mobile spellings. */
const locatorHolderNames = new Set([
  "dynamicLocators",
  "dynamicSelectors",
  "locators",
  "selectors",
]);

export function isLocatorHolderName(name: string): boolean {
  return locatorHolderNames.has(name);
}

/**
 * Assignment widens `type` off the ESTree union, so a rule can test for a
 * TypeScript-only node such as `TSAsExpression` without a cast.
 */
export function nodeType(node: object): string {
  if (!("type" in node)) return "";
  const type: unknown = node.type;
  return typeof type === "string" ? type : "";
}

/** Nodes that assert something about a type without changing the value. */
const typeAssertionWrappers = new Set([
  "TSAsExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
]);

/**
 * The expression inside an `as` / `satisfies` / `!` / `<T>` wrapper, or undefined
 * when this is not one. Returns `unknown` because none of those node types are in
 * ESTree's union, so a typed return would need a cast at every call site.
 */
export function typeAssertionOperand(node: unknown): unknown {
  if (!isObject(node)) return undefined;
  if (!typeAssertionWrappers.has(nodeType(node))) return undefined;

  return "expression" in node ? node.expression : undefined;
}

/** The expression with every type-assertion wrapper peeled off. */
function withoutTypeAssertions(node: unknown): unknown {
  let current = node;

  for (
    let operand = typeAssertionOperand(current);
    operand !== undefined;
    operand = typeAssertionOperand(current)
  )
    current = operand;

  return current;
}

/**
 * True for `this.page`, including under any `!`, `as`, or `satisfies`. Those wrap
 * the expression in a node the rule would otherwise fail to match, so an inline
 * locator written `this.page!.getByRole(...)` would go unreported.
 *
 * `this.#page` and `this[page]` are not it: the first is a different, private
 * field that happens to be spelled `page`, and the second is a dynamic lookup
 * whose key is only known at runtime.
 */
export function isThisPageExpression(node: unknown): boolean {
  const current = withoutTypeAssertions(node);

  if (!isObject(current)) return false;
  if (nodeType(current) !== "MemberExpression") return false;
  if ("computed" in current && current.computed === true) return false;
  if (!("object" in current) || !("property" in current)) return false;

  const target = current.object;
  const property = current.property;
  if (!isObject(target) || !isObject(property)) return false;
  if (nodeType(property) !== "Identifier") return false;

  return (
    nodeType(target) === "ThisExpression" &&
    "name" in property &&
    property.name === "page"
  );
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/** A getter or a property, so a plain method of that name is not a holder. */
export function isLocatorHolder(member: Rule.Node | undefined): boolean {
  if (!member) return false;

  const isHolderShape =
    member.type === "PropertyDefinition" ||
    (member.type === "MethodDefinition" && member.kind === "get");
  if (!isHolderShape) return false;

  return (
    member.key.type === "Identifier" && locatorHolderNames.has(member.key.name)
  );
}
