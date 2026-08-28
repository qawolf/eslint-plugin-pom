import type { Rule } from "eslint";

/**
 * The name a config registers this plugin under. Deliberately not `@qawolf/pom`
 * -- that is a different, published package, and sharing the name would make a
 * rule id look like it ships from there.
 */
export const rulePrefix = "@qawolf/pom-lint";

const defaultPagesDirectory = "src/pages/";

/**
 * Where this workspace keeps its page objects, from
 * `settings["@qawolf/pom-lint"].pagesDirectory`. Shared rather than a per-rule
 * option because every rule gates on the same directory, and a workspace that
 * moved its page objects moved them for all of them.
 */
export function pagesDirectoryFrom(
  settings: Rule.RuleContext["settings"],
): string {
  const configured = configuredPagesDirectory(settings);
  if (configured === undefined) return defaultPagesDirectory;

  if (typeof configured !== "string")
    throw new Error(
      `settings["${rulePrefix}"].pagesDirectory must be a string, got ${typeof configured}.`,
    );

  const normalized = normalize(configured);
  if (!normalized)
    throw new Error(
      `settings["${rulePrefix}"].pagesDirectory is empty. Remove it to lint the default ${defaultPagesDirectory}, or name the directory your page objects live in.`,
    );

  return normalized;
}

function configuredPagesDirectory(
  settings: Rule.RuleContext["settings"],
): unknown {
  const scoped: unknown = settings[rulePrefix];
  if (typeof scoped !== "object" || scoped === null) return undefined;

  return "pagesDirectory" in scoped ? scoped.pagesDirectory : undefined;
}

/** Compared against a path segment, so it needs no leading `./` and one trailing `/`. */
function normalize(directory: string): string {
  const trimmed = directory
    .trim()
    .replace(/^\.?\/+/, "")
    .replace(/\/+$/, "");

  return trimmed ? `${trimmed}/` : "";
}
