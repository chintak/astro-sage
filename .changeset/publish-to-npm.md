---
"astro-sage": patch
---

Publish to npm: add the theme to an existing site with `pnpm add astro-sage` instead of a git submodule. The package now ships its README, FEATURES.md, LICENSE and changelog, and leaves out test files. Generated OG images no longer fail under pnpm when the site doesn't list `sharp` itself: the theme resolves `sharp` and its fonts from its own dependencies.
