import type { Rule } from "eslint";

const pagesDirectoryPrefix = "src/pages/";

const fileUriScheme = "file:///";

/**
 * The editor lints `file:///src/pages/home-page.ts`, the agent
 * `/src/pages/home-page.ts`, and `RuleTester` defaults to `<input>`. Not
 * decoded: `encodeURIComponent` leaves letters, `.` and `/` alone, so the prefix
 * and extension survive, and decoding can throw on a stray `%`.
 */
function normalizeFilename(filename: string): string {
  const withoutScheme = filename.startsWith(fileUriScheme)
    ? filename.slice(fileUriScheme.length)
    : filename;

  return withoutScheme.replace(/^\/+/, "");
}

export function isPageObjectFile(filename: string): boolean {
  const path = normalizeFilename(filename);
  return path.startsWith(pagesDirectoryPrefix) && path.endsWith(".ts");
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
