import { pagesDirectoryFrom, rulePrefix } from "./settings.js";

function settings(pagesDirectory: unknown) {
  return { [rulePrefix]: { pagesDirectory } };
}

describe("pagesDirectoryFrom", () => {
  it("defaults to src/pages/ when nothing is configured", () => {
    expect(pagesDirectoryFrom({})).toBe("src/pages/");
    expect(pagesDirectoryFrom({ [rulePrefix]: {} })).toBe("src/pages/");
  });

  it("ignores settings belonging to another plugin", () => {
    expect(
      pagesDirectoryFrom({ "some-other-plugin": { pagesDirectory: 7 } }),
    ).toBe("src/pages/");
  });

  it.each([
    ["e2e/pages", "no trailing slash"],
    ["e2e/pages/", "trailing slash"],
    ["./e2e/pages", "leading ./"],
    ["/e2e/pages/", "leading slash"],
  ])("normalizes %s (%s) to e2e/pages/", (configured) => {
    expect(pagesDirectoryFrom(settings(configured))).toBe("e2e/pages/");
  });

  it("throws rather than silently linting the default directory", () => {
    expect(() => pagesDirectoryFrom(settings(7))).toThrow("must be a string");
    expect(() => pagesDirectoryFrom(settings("   /  "))).toThrow("is empty");
    expect(() => pagesDirectoryFrom(settings(""))).toThrow("is empty");
  });
});
