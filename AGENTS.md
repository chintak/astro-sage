# AGENTS.md

AstroSage: a readability-first Astro blog theme, published to npm as `astro-sage`.

**Supported features, config and frontmatter: [FEATURES.md](FEATURES.md).** Keep it up to date: any PR that adds, removes or changes a feature, config key, frontmatter field or route updates FEATURES.md (and the showcase post) in the same PR.

## Stack

Astro 7 integration in TypeScript (shipped as source) · Sätteri markdown with custom mdast/hast plugins · MDX · Tailwind 4 + CSS tokens · Expressive Code · KaTeX, Mermaid, Excalidraw, Satori rendered at build time · Pagefind · optional utterances/giscus comments · Playwright + axe tests · pnpm workspaces, Node ≥ 22.12.

## Layout

```
packages/astro-sage/   the published package
  src/index.ts         integration: injected routes, markdown pipeline, fonts, Vite aliases (@sage → src)
  src/config.ts        resolved config + defaults; types in src/types/config.ts
  src/content.ts       collections + frontmatter schema
  src/markdown/        Sätteri plugins (callouts, KaTeX, links/wiki-links, code labels)
  src/routes/          injected pages and endpoints
  src/components/, layouts/, styles/, share/, diagrams/, comments/ (utterances/giscus embed)
apps/demo/             demo site; showcase post exercises every feature; Playwright tests in tests/
docs/decisions/        ADRs
.changeset/            pending release notes (Changesets)
```

## Conventions

- `pnpm lint && pnpm format:check && pnpm check && pnpm build && pnpm test` must pass before a PR. Run `pnpm build` before `pnpm test`: tests run against `apps/demo/dist`.
- New content features get a showcase section and a Playwright test.
- The theme is pure SSG and host-agnostic: no adapters, server routes, databases or host-specific APIs. Do work at build time; client JS must be small and lazy-loaded.
- Text and UI colours stay ≥ 4.5:1 in both themes (the axe tests enforce it). Use tokens from `src/styles/theme.css`, never raw colours.
- In MDX, mdast plugins must emit JSX nodes (see `jsx()` / `rawHtml()` in `src/markdown/index.ts`), not raw HTML.
- Commit `apps/demo/.sage-cache/diagrams/` so builds need no browser.
- Versioning is SemVer via Changesets: add one with `pnpm changeset` for any user-facing change to `astro-sage`. Releases are automated by `.github/workflows/release.yml`: merging to `main` opens a "Release astro-sage" PR; merging that publishes to npm (`npm publish`, trusted publishing, no token), tags `astro-sage@x.y.z` and creates the GitHub release. Re-run a release by hand with the workflow's `ref` input.
- The package ships `src/` as-is. Bundled build code (routes, `utils/ogImage.ts`) must resolve the theme's own dependencies from `packageDir` (the virtual config module), not `import.meta.url`: under pnpm a site can't see them. `scripts/pack-docs.mjs` copies README/FEATURES/LICENSE into the tarball.
