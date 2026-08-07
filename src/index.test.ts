import { rulePrefix, rules, ruleSeverities } from "./index.js";

// The published surface: a config registers `rules` under `rulePrefix`, so the
// ids in `ruleSeverities` have to be the ids that arrangement produces.
it("keys severities by the id a config will see", () => {
  for (const name of Object.keys(rules))
    expect(ruleSeverities[`${rulePrefix}/${name}`]).toBeDefined();

  expect(Object.keys(ruleSeverities)).toEqual(
    Object.keys(rules).map((name) => `${rulePrefix}/${name}`),
  );
});
