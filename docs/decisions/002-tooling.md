# 002: Lint and format tooling

**Status:** Accepted, 2026-10-15

## Decision
- **Lint: oxlint.** It replaces ESLint + `@typescript-eslint` + `eslint-plugin-astro`, runs in milliseconds and needs zero config.
- **Format: keep Prettier** with `prettier-plugin-astro` 1.x. Neither Biome nor oxfmt formats `.astro` files as reliably as Prettier yet.
- **Types: `astro check`** (strict) on the demo app, which also covers the theme package through `tsconfig` includes.

## Consequences
oxlint doesn't lint the template part of `.astro` files. `astro check` covers types there, and Prettier covers formatting. Revisit Biome/oxfmt once either one formats `.astro` files properly.
