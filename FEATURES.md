# AstroSage features

A reference for agents and contributors: what the theme supports, how to switch each feature on, and where to find a working example. Keep it accurate. When a feature is added, changed or removed, update this file in the same PR (see [AGENTS.md](AGENTS.md)).

Working examples live in the demo site:

- [`apps/demo/src/content/posts/showcase/index.mdx`](apps/demo/src/content/posts/showcase/index.mdx) — every content feature, one section each (cited below as *Showcase › Section*).
- [`apps/demo/src/content/posts/colophon.md`](apps/demo/src/content/posts/colophon.md) — a plain-Markdown post; wiki-link target.
- [`apps/demo/src/content/posts/series-part-two.md`](apps/demo/src/content/posts/series-part-two.md) — part 2 of a series; scheduled (future `pubDatetime`).
- [`apps/demo/src/content/pages/about.md`](apps/demo/src/content/pages/about.md) — a page.
- [`apps/demo/sage.config.ts`](apps/demo/sage.config.ts), [`apps/demo/astro.config.ts`](apps/demo/astro.config.ts) — a full configuration (utterances comments). Live at [astro-sage.chintak.sh](https://astro-sage.chintak.sh).

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Astro 7, shipped as an integration (`astroSage(config)`) that injects every route |
| Language | TypeScript (published as source; Astro compiles it) |
| Markdown | Sätteri (`@astrojs/markdown-satteri`) with custom mdast/hast plugins; MDX via `@astrojs/mdx` |
| Styling | Tailwind CSS 4 plus plain CSS with design tokens (`src/styles/theme.css`) |
| Fonts | Astro Fonts API, self-hosted Fontsource: Newsreader / Source Serif 4 / Literata + JetBrains Mono |
| Code | Expressive Code (Gruvbox), line numbers and collapsible sections plugins |
| Math | KaTeX, rendered at build time |
| Diagrams | Mermaid (`mermaid-isomorphic`) and Excalidraw (`@excalidraw/utils`), rendered at build time in headless Chromium (Playwright) |
| OG images | Satori + sharp, at build time |
| Search | Pagefind |
| Comments (optional) | utterances (GitHub Issues) or giscus (GitHub Discussions), client-side embeds |
| Tests | Playwright + axe-core (desktop and mobile), oxlint, Prettier |
| Output | Fully static (SSG): `astro build` writes plain files to `dist/`; no adapter, server or database; any static host |
| Package manager | pnpm workspaces; Node ≥ 22.12 |

## Setup

Three files wire a site up (full versions in the [README](README.md#quick-start)):

```ts
// astro.config.ts
integrations: [astroSage(sageConfig)]
// src/content.config.ts
export const collections = defineSageCollections({ author: config.site.author });
// sage.config.ts
export default defineSageConfig({ site: { url, title, description, author } });
```

Package entry points: `astro-sage` (integration, `defineSageConfig`), `astro-sage/content` (`defineSageCollections`), `astro-sage/components/*`, `astro-sage/layouts/*`, `astro-sage/styles/*`, `astro-sage/markdown`.

Content goes in `src/content/posts/` (`.md`, `.mdx`, or a folder with `index.md(x)`; files and folders starting with `_` are skipped) and `src/content/pages/`. A site needs no `src/pages/`.

## Configuration (`sage.config.ts`)

Types: [`packages/astro-sage/src/types/config.ts`](packages/astro-sage/src/types/config.ts). Defaults: [`src/config.ts`](packages/astro-sage/src/config.ts).

| Key | Default | Notes |
|---|---|---|
| `site.url` / `title` / `description` / `author` | required | `url` is the canonical origin |
| `site.profile` | — | Author URL for structured data |
| `site.ogImage` | `"default-og.jpg"` | Fallback OG image in `public/` |
| `site.lang` / `timezone` / `dir` | `"en"` / `"UTC"` / `"ltr"` | |
| `site.googleVerification` | env `PUBLIC_GOOGLE_SITE_VERIFICATION` | |
| `typography.serif` | `"newsreader"` | or `"source-serif-4"`, `"literata"` |
| `typography.opticalSizing` | `false` | Ships the `opsz` axis (~70 KB more per style) |
| `typography.fallbacks` | `{ serif, mono }` system stacks | Used if web fonts fail; end each with a generic family |
| `home.title` / `home.intro` | `site.title` / — | Home page heading and intro (inline HTML allowed) |
| `posts.perPage` / `perIndex` | `4` / `4` | Listing and home page sizes |
| `posts.scheduledPostMargin` | 15 min (ms) | Future posts publish this long before `pubDatetime` |
| `features.lightAndDarkMode` | `true` | Theme toggle |
| `features.dynamicOgImage` | `true` | Per-post OG images and `/og.png` |
| `features.showArchives` | `true` | `/archives` and its nav link |
| `features.showBackButton` | `true` | On post pages |
| `features.editPost` | `{ enabled: false }` | `{ enabled: true, url }` adds an "Edit page" link |
| `features.search` | `"pagefind"` | `false` removes search |
| `socials` | `[]` | `{ name, url, linkTitle? }`; `name` is an icon in `src/assets/icons/socials/` |
| `shareLinks` | X, LinkedIn, Bluesky, Reddit, HN, email | `{ name, url }` with `{url}` / `{title}` placeholders |
| `citation.enabled` / `author` / `publication` | `true` / "Last, First" of post author / site host | "Cite this post" block |
| `comments` | `{ provider: false }` | `{ provider: "utterances", repo, issueTerm?, label?, theme? }` or `{ provider: "giscus", repo, repoId, category, categoryId, mapping?, reactions?, inputPosition?, theme? }`; `theme` is `{ light, dark }` |

Social icons available: bluesky, facebook, github, hackernews, linkedin, mail, pinterest, reddit, telegram, whatsapp, x.

## Frontmatter

Schema: [`packages/astro-sage/src/content.ts`](packages/astro-sage/src/content.ts).

| Field | Default | Effect |
|---|---|---|
| `title`, `description`, `pubDatetime` | required | `description` feeds lists, RSS and meta tags |
| `modDatetime` | — | Shows "Updated" |
| `author` | `site.author` | |
| `tags` | `["others"]` | Tag pages with counts |
| `series` | — | Series pages and "Part N of M" navigation |
| `featured` | — | Featured on the home page |
| `draft` | — | Never built |
| `ogImage` | generated | Image import or URL |
| `canonicalURL`, `timezone`, `hideEditPost` | — | |
| `toc` | `true` | Pinned table of contents |
| `math` | `true` | Load KaTeX CSS; set `false` on posts without math |
| `cite` | `true` | "Cite this post" block |
| `comments` | `true` | Comments (when a provider is configured) |
| `slug` | from path | Overrides the URL segment |

## Routes (injected)

`/`, `/posts/[...page]`, `/posts/<slug>/` (+ `index.png` OG image), `/tags`, `/tags/<tag>/`, `/series`, `/series/<name>`, `/archives`, `/search`, `/about`, `/404`, `/rss.xml`, `/robots.txt`, `/og.png`, sitemap. All prerendered. Post URLs mirror the folder path; a folder post (`my-post/index.mdx`) is named by its folder.

## Writing features

| Feature | Syntax | Example |
|---|---|---|
| Inline elements | `**bold**`, `<mark>`, `<kbd>`, `H~2~O`, `x^2^`, `<abbr title>`; smart quotes and dashes | Showcase › Inline elements |
| Old-style figures | automatic in prose | Showcase › Old-style figures |
| Quotes | `>`; nested `> >` | Showcase › Quotations |
| Callouts | `> [!NOTE]` (NOTE, TIP, IMPORTANT, WARNING, CAUTION) or `:::warning[Title]` … `:::` | Showcase › Callouts |
| Lists, task lists | `- [x]` renders a round checkbox; done items are struck through | Showcase › Lists |
| Definition lists | HTML `<dl>` | Showcase › Lists |
| Math | `$…$`, `$$…$$` (KaTeX at build time) | Showcase › Mathematics |
| Code | Fenced blocks; meta: `title="file.ts"`, `{1-2}`, `ins={4}`, `del={3}`, `"word"`, `collapse={1-4}`, `showLineNumbers`; `bash`/`sh` get a terminal frame; language shown on the frame | Showcase › Code |
| Diagrams | ` ```mermaid ` or ` ```excalidraw ` (JSON); `![cap](./x.excalidraw)` or an excalidraw.com share link; add `wide` / `full` | Showcase › Diagrams |
| Tables | GFM; wide tables scroll and are keyboard-focusable | Showcase › Tables |
| Figures | `![alt](./x.jpg "wide")` / `"full"`, or `<Figure src alt caption size="column\|wide\|full" />` in MDX | Showcase › Figures |
| Footnotes | `[^1]` | Showcase › Footnotes |
| Wiki-links | `[[slug]]`, `[[slug\|text]]`, `[[slug#Heading]]`, `[[#Heading]]`; match slug, path or title; drafts, scheduled and missing targets render as muted text and warn | Showcase › Inline elements; `colophon.md` |
| Link styles | automatic: external links get ↗ and `rel="noopener"`, internal links a plain underline | Showcase › Inline elements |

Diagrams need Chromium at build time (`pnpm add -D playwright && npx playwright install chromium`) unless `.sage-cache/diagrams/` is committed.

## Reader features

| Feature | Notes | Where |
|---|---|---|
| Typography | 18.5px serif body, column clamped to 66–71 characters, `text-wrap: pretty` | `src/styles/theme.css`, `prose.css` |
| Palette | Warm paper (light) and espresso (dark) tokens; WCAG-checked | `src/styles/theme.css` |
| Pinned TOC | Right rail ≥ 1280px with scroll-spy; collapsible block below; fades under wide figures | `components/TableOfContents.astro` |
| Series | Index, per-series pages, part navigation; series label links to its page | `series-part-two.md` |
| Tags | Mono chips with counts, at the top of posts | any post |
| Search | Pagefind at `/search` | — |
| Share sheet | Platforms from `shareLinks`, copy link, native share | bottom of any post |
| Quote sharing | Select text → toolbar: X, Bluesky, LinkedIn, email, copy, **share as image** (1200×630 card drawn in the browser), native share; links carry a text fragment | select text in any post |
| Citation | Folded "Cite this post" with text citation and BibTeX copy | bottom of any post |
| Comments | utterances or giscus (GitHub sign-in), lazy-loaded, follows light/dark; off by default; `comments: false` per post | README › Comments; any demo post |
| SEO | Canonical URLs, Open Graph + Twitter cards (image type matches the file), JSON-LD, sitemap, robots.txt | `layouts/Layout.astro` |
| RSS | `/rss.xml`: full post HTML (absolute links, MathML, inline diagrams; no scripts), tags as categories, `dc:creator`, self link; drafts and scheduled posts excluded; autodiscovery `<link>` and header button | `routes/rss.xml.ts`, `utils/feedContent.ts` |
| OG images | Drawn per post with Satori + sharp at build time and written as static PNGs (`/posts/<slug>/index.png`, site-wide `/og.png`); or `ogImage` in frontmatter; off with `features.dynamicOgImage: false` | `utils/ogImage.ts` |
| Accessibility | Skip link, focus styles, labelled controls, axe-clean in both themes | `apps/demo/tests/` |
| Performance | ~2.8 KB gzipped JS per article; fonts with metric-matched fallbacks | — |

## Customising

- Colours, fonts and measure are CSS custom properties in [`src/styles/theme.css`](packages/astro-sage/src/styles/theme.css). Override them in your own CSS.
- Components can be imported from `astro-sage/components/*` (e.g. `Figure.astro` in MDX).
- Code themes live in [`src/markdown/code-themes.ts`](packages/astro-sage/src/markdown/code-themes.ts).
- Design rationale: [`docs/decisions/`](docs/decisions/).
