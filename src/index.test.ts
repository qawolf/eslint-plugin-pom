import { rulePrefix, rules, rulesById, ruleSeverities } from "./index.js";

// The published surface: a config registers `rules` under `rulePrefix`, so the
// ids in `ruleSeverities` have to be the ids that arrangement produces.
it("keys severities by the id a config will see", () => {
  for (const name of Object.keys(rules))
    expect(ruleSeverities[`${rulePrefix}/${name}`]).toBeDefined();

  expect(Object.keys(ruleSeverities)).toEqual(
    Object.keys(rules).map((name) => `${rulePrefix}/${name}`),
  );
});

// A host using `Linter.defineRules` registers `rulesById` and enables
// `ruleSeverities`. ESLint reports an enabled id it cannot find, so a mismatch
// is loud; what is silent is registering a rule nothing enables, which this
// keeps from happening by construction.
it("keys rulesById the same way as ruleSeverities", () => {
  expect(Object.keys(rulesById)).toEqual(Object.keys(ruleSeverities));

  for (const [name, module] of Object.entries(rules))
    expect(rulesById[`${rulePrefix}/${name}`]).toBe(module);
});
