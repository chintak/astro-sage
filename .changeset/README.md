# Changesets

AstroSage follows [SemVer](https://semver.org) and is published to npm as `astro-sage`. Each release is also a git tag (`astro-sage@x.y.z`) with a GitHub release.

Each user-facing change to `packages/astro-sage` gets a changeset: run `pnpm changeset`, pick the bump, and describe the change for the changelog. While the version is `0.x`, a breaking change bumps the minor and anything else the patch.

Releasing is automated by `.github/workflows/release.yml`. When changesets land on `main`, it opens (or updates) a "Release astro-sage" PR that runs `pnpm version-packages` (applies pending changesets to `package.json` and `CHANGELOG.md`). Merging that PR publishes the new version with `npm publish` through npm trusted publishing (no token, with provenance), pushes the `astro-sage@x.y.z` tag, creates a GitHub release from the changelog, and waits for the version to go live on npm. If a release only got partway, run the Release workflow by hand (Actions → Release → Run workflow) with the release commit's SHA: it skips whatever already exists.
