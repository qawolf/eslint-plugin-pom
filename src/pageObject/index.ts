import type { Rule } from "eslint";
import type {
  ClassDeclaration,
  ClassExpression,
  MethodDefinition,
  PropertyDefinition,
} from "estree";

const pagesDirectoryPrefix = "src/pages/";

export type ClassNode = ClassDeclaration | ClassExpression;

export type ClassMember = MethodDefinition | PropertyDefinition;

/**
 * `accessibility`, `declare` and `readonly` come from the TypeScript parser;
 * estree does not model them.
 */
export type TsClassMember = ClassMember & {
  accessibility?: "private" | "protected" | "public";
  declare?: boolean;
  readonly?: boolean;
};

/** `abstract` likewise. */
export type TsClass = ClassNode & { abstract?: boolean };

/**
 * The other way to recognise a page object: by its superclass rather than its
 * path. Path scoping (`isPageObjectFile`) is the tighter fit for a directory
 * reserved for page objects; the superclass is what a rule uses when it must
 * work on a file anywhere in the workspace, and it is what the flow-side
 * rules pair with. Blind spot: a page object extending *another* page object
 * names no base class here, and following that chain would need type
 * information.
 */
export const pageObjectBaseClasses = new Set([
  "BasePageObject",
  "EntryPointPageObject",
  "SubPageObject",
]);

export function isPageObjectClass(node: ClassNode): boolean {
  const { superClass } = node;
  return (
    superClass?.type === "Identifier" &&
    pageObjectBaseClasses.has(superClass.name)
  );
}

/**
 * The nearest enclosing class, when it is a page object by superclass. A
 * class nested inside a page-object method is judged on its own superclass,
 * not the outer one.
 */
export function enclosingPageObject(node: Rule.Node): ClassNode | undefined {
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (current.type === "ClassBody") {
      const declaration = current.parent;
      const isClass =
        declaration.type === "ClassDeclaration" ||
        declaration.type === "ClassExpression";

      return isClass && isPageObjectClass(declaration)
        ? declaration
        : undefined;
    }

    current = current.parent;
  }

  return undefined;
}

/**
 * The static name of a member key: `locators` or `"locators"`. A computed or
 * private key has no name here.
 */
export function memberName(member: ClassMember): string | undefined {
  if (member.computed) return undefined;

  const { key } = member;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;

  return undefined;
}

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

/** `selectors` and `dynamicSelectors` are the mobile spellings. */
export const locatorHolderNames = new Set([
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
export function isLocatorHolder(
  member: ClassMember | Rule.Node | undefined,
): boolean {
  if (!member) return false;

  const isHolderShape =
    member.type === "PropertyDefinition" ||
    (member.type === "MethodDefinition" && member.kind === "get");
  if (!isHolderShape) return false;

  const name = memberName(member);
  return name !== undefined && locatorHolderNames.has(name);
}
