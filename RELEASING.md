# Releasing

`@qawolf/eslint-plugin-pom` uses **version-driven publishing**: a release
happens when the `version` in [`package.json`](package.json) is higher than
the version on npm. There is no separate "publish" button — merging a version
bump to `main` is the release.

## Cut a release

1. Open a PR that bumps the version:

   ```sh
   npm version patch   # or: minor | major
   ```

   `npm version` creates a commit and a local `vX.Y.Z` tag by default. Include
   the commit in your PR, but never push the tag — the workflow creates it on
   publish, and a tag that is already on the remote makes that step fail. (Pass
   `--no-git-tag-version` to skip the commit and tag and stage the bump
   yourself.) Stick to release versions: the version gate compares with
   `sort -V`, which does not order prerelease suffixes (`-rc.1`) the way semver
   does.

2. Get the PR reviewed and merged to `main`.

3. On merge, [`.github/workflows/release.yml`](.github/workflows/release.yml):
   - builds and tests the package,
   - runs [`scripts/publish.sh`](scripts/publish.sh), which publishes to npm
     only if `package.json`'s version is greater than the published version,
   - on publish, creates the `vX.Y.Z` git tag and a GitHub Release whose notes
     are auto-generated from the PRs merged since the previous tag.

If the version is unchanged, the workflow runs, finds nothing to publish, and
exits cleanly — merging non-release PRs to `main` is safe.

## Release notes

Notes come from GitHub's `--generate-notes`, which lists merged PRs since the
last tag. To improve them, write clear PR titles and use the
[GitHub release-notes categories](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
via labels if you want grouping.

## Publishing auth (no token)

Publishing uses **npm trusted publishing (OIDC)** — there is no `NPM_TOKEN`
secret. npm is configured to trust this repo's `release.yml` workflow, which
authenticates via GitHub's OIDC identity (`id-token: write`). This also attaches
build provenance automatically — but only while the repository is public, so a
visibility change silently drops provenance from later releases. The GitHub
Release step uses the built-in `GITHUB_TOKEN` (`contents: write`); no secret is
needed there either.

Trusted publishing cannot create a package that does not exist on npm yet
([npm/cli#8544](https://github.com/npm/cli/issues/8544)): the very first
npmjs publish of this package has to be a manual `npm publish` by someone with
npm org access, after which the trusted publisher can be configured and every
later release flows through the workflow.

If a run publishes but fails on the tag/Release step, re-running skips the
publish (version gate) and therefore the tag too — create the `vX.Y.Z` tag and
Release by hand in that case.

Provenance ties the tarball to this repository, so npm rejects the publish with
a 422 unless `package.json`'s `repository.url` matches
`https://github.com/qawolf/eslint-plugin-pom`. Keep that field pointing here.

If publishing ever needs to be re-authorized, manage the trusted publisher on
the package's npmjs settings page.
