import type { Rule } from "eslint";

/**
 * A page object is recognised by what it extends, not by its path. Workspaces
 * do not agree on where page objects live -- an entry point often sits outside
 * the `pages` directory -- so a path check silently reports nothing on the
 * layouts it does not know about.
 *
 * Blind spot: a page object extending *another* page object names no base class
 * here, and following that chain would need type information.
 */
const pageObjectBaseClasses = new Set([
  "BasePageObject",
  "EntryPointPageObject",
  "SubPageObject",
]);

/** True when this class declaration is a page object. */
export function isPageObjectClass(node: Rule.Node): boolean {
  if (node.type !== "ClassDeclaration" && node.type !== "ClassExpression")
    return false;

  const { superClass } = node;
  return (
    superClass?.type === "Identifier" &&
    pageObjectBaseClasses.has(superClass.name)
  );
}

/** The page-object class enclosing this node, if it is inside one. */
export function enclosingPageObject(node: Rule.Node): Rule.Node | undefined {
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (current.type === "ClassBody" && isPageObjectClass(current.parent))
      return current.parent;

    current = current.parent;
  }

  return undefined;
}

/** The class member enclosing this node -- a method, getter, or field. */
export function enclosingClassMember(node: Rule.Node): Rule.Node | undefined {
  let member: Rule.Node | undefined;
  let current: Rule.Node | null = node.parent;

  while (current) {
    if (
      current.type === "MethodDefinition" ||
      current.type === "PropertyDefinition"
    )
      member ??= current;

    if (current.type === "ClassBody") return member;

    current = current.parent;
  }

  return member;
}

/** `selectors` and `dynamicSelectors` are the mobile spellings. */
const locatorHolderNames = new Set([
  "dynamicLocators",
  "dynamicSelectors",
  "locators",
  "selectors",
]);

/**
 * The convention documents a getter, but a plain property holds the same map.
 * A plain *method* of that name is neither.
 */
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
