# Changesets

AstroSage follows [SemVer](https://semver.org). It isn't published to npm: releases are git tags (`astro-sage@x.y.z`) with GitHub releases, and sites pin a tag.

Each user-facing change to `packages/astro-sage` gets a changeset: run `pnpm changeset`, pick the bump, and describe the change for the changelog. While the version is `0.x`, a breaking change bumps the minor and anything else the patch.

To release: `pnpm version-packages` (applies pending changesets to `package.json` and `CHANGELOG.md`), merge that to `main`, then `pnpm release` (tags the version and pushes the tag).
