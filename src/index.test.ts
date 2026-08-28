import { rulePrefix, rules, ruleSeverities } from "./index.js";

it("keys severities by the id a config will see", () => {
  for (const name of Object.keys(rules))
    expect(ruleSeverities[`${rulePrefix}/${name}`]).toBeDefined();

  expect(Object.keys(ruleSeverities)).toEqual(
    Object.keys(rules).map((name) => `${rulePrefix}/${name}`),
  );
});
