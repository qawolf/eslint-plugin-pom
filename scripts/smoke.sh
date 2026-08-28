#!/usr/bin/env bash
# Install the packed tarball into a throwaway project and lint a page object
# with it, against one major version of ESLint. The unit tests only ever run
# against the devDependency, so this is what covers the peer range.
#
# The config here is the one README.md tells people to write, so a README that
# lints nothing fails this.
#
# Usage: ./scripts/smoke.sh 9
set -euo pipefail

eslint_major=${1:?"Usage: smoke.sh <eslint-major>"}

repo=$(cd "$(dirname "$0")/.." && pwd)
workspace=$(mktemp -d)
trap 'rm -rf "$workspace"' EXIT

npm --prefix "$repo" run build >/dev/null
tarball=$(cd "$repo" && npm pack --silent)

cd "$workspace"
printf '{"name":"smoke","version":"1.0.0","private":true,"type":"module"}\n' >package.json
npm install --silent --no-audit --no-fund \
  "eslint@${eslint_major}" \
  "@typescript-eslint/parser@8" \
  "$repo/$tarball"
rm -f "$repo/$tarball"

# TypeScript the default parser cannot read, so a config missing the parser
# fails here rather than quietly passing.
page_object() {
  cat <<'FIXTURE'
import type { Page } from "playwright";

export class HomePage {
  constructor(private readonly page: Page) {}

  private get locators() {
    return { banner: this.page.getByRole("alert") } as const;
  }

  async check(): Promise<void> {
    expect(await this.locators.banner.isVisible()).toBe(true);
  }
}
FIXTURE
}

# ESLint 8 reads flat config only when asked; 9 and later default to it.
export ESLINT_USE_FLAT_CONFIG=true

echo "ESLint $(./node_modules/.bin/eslint --version)"

assert_reported() {
  local file=$1 output
  output=$(./node_modules/.bin/eslint "$file" || true)
  printf '%s\n' "$output"

  if printf '%s' "$output" | grep -q "Parsing error"; then
    echo "Error: $file failed to parse." >&2
    exit 1
  fi

  for expected in web-first-assertions assert-expect-pairing; do
    if ! printf '%s' "$output" | grep -q "$expected"; then
      echo "Error: expected $expected to be reported for $file." >&2
      exit 1
    fi
  done
}

echo "--- default page-object directory ---"
mkdir -p src/pages
page_object >src/pages/home-page.ts
cat >eslint.config.mjs <<'CONFIG'
import tsParser from "@typescript-eslint/parser";
import pomLint from "@qawolf/eslint-plugin-pom";

export default [
  { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
  pomLint.configs.recommended,
];
CONFIG
assert_reported src/pages/home-page.ts

echo "--- page objects moved, directory named in settings ---"
mkdir -p e2e/pages
page_object >e2e/pages/home-page.ts
rm -rf src
cat >eslint.config.mjs <<'CONFIG'
import tsParser from "@typescript-eslint/parser";
import pomLint from "@qawolf/eslint-plugin-pom";

export default [
  { files: ["**/*.ts"], languageOptions: { parser: tsParser } },
  { settings: { "@qawolf/pom-lint": { pagesDirectory: "e2e/pages" } } },
  pomLint.configs.recommended,
];
CONFIG
assert_reported e2e/pages/home-page.ts

echo "OK: rules fired under ESLint $eslint_major."
