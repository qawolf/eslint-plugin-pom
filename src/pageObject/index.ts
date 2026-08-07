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

/** `selectors` and `dynamicSelectors` are the mobile spellings. */
const locatorHolderNames = new Set([
  "dynamicLocators",
  "dynamicSelectors",
  "locators",
  "selectors",
]);

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
