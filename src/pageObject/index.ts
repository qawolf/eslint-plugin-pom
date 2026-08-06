import type { Rule } from "eslint";

/**
 * Page objects live under `src/pages/`. Nested directories are normal
 * (`src/pages/auth/sign-in-page.ts`); anything outside is a flow, a utility or
 * a lib file.
 */
const pagesDirectoryPrefix = "src/pages/";

const fileUriScheme = "file:///";

/**
 * Hosts disagree on the shape of `context.filename`, and none of them pass the
 * workspace path verbatim:
 *
 * - the editor lints `file:///src/pages/home-page.ts`, percent-encoded per path
 *   segment;
 * - the agent lints `/src/pages/home-page.ts`, with a leading slash;
 * - `RuleTester` defaults to `<input>` when a case omits `filename`.
 *
 * So a bare `startsWith(pagesDirectoryPrefix)` matches in no host at all, and
 * the rule silently reports nothing. Percent-decoding is deliberately skipped:
 * `encodeURIComponent` leaves letters, `.` and the `/` separators alone, so the
 * prefix and the extension survive encoding intact, and decoding would risk
 * throwing on a stray `%` mid-lint.
 */
function normalizeFilename(filename: string): string {
  const withoutScheme = filename.startsWith(fileUriScheme)
    ? filename.slice(fileUriScheme.length)
    : filename;

  return withoutScheme.replace(/^\/+/, "");
}

/**
 * True for a page-object source file. Scoping is by path rather than by what a
 * class extends: a page object extending *another* page object names no base
 * class, and following that chain would need type information.
 *
 * The trade-off is that a class in a pages file which is not a page object is
 * in scope too. In a directory reserved for page objects that is the more
 * useful default.
 */
export function isPageObjectFile(filename: string): boolean {
  const path = normalizeFilename(filename);
  return path.startsWith(pagesDirectoryPrefix) && path.endsWith(".ts");
}

/**
 * The class member enclosing this node -- a method, getter, or field. Undefined
 * when the node is not inside one, since both member types exist only in a
 * class body.
 *
 * `??=` keeps the *innermost* member: walking up from a node inside a class
 * nested in a method, the nested class's own method is what applies, not the
 * outer one holding it.
 */
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
