# AstroSage — Engineering Brief

> **Historical:** this is the original brief. Its comments plan (Better Auth, D1, Cloudflare Workers, §4.2) was dropped: AstroSage is now fully static and host-agnostic, with optional utterances/giscus comments. See [ADR 004](decisions/004-comments.md) and the README.

> A readability-first Astro blog theme. Forked from [AstroPaper](https://github.com/satnaing/astro-paper) v6.1 (MIT), rebuilt for long-form technical writing: serif typography, warm sepia palette, pinned section-aware TOC, KaTeX, Expressive Code, and optional GitHub/X sign-in comments.

Owner: Chintak Sheth · First consumer: chintak.sh · Hosting target: Cloudflare Workers **free tier**

---

## 0. How to work

You are a staff frontend engineer. Treat this as a product, not a reskin.

- **Spike before you commit.** Anything marked _Spike_ gets a time-boxed proof (≤ 1 hour equivalent) with a written verdict in `docs/decisions/NNN-*.md` (context → options → decision → consequences). Do not leave a decision implicit in the code.
- **The showcase post is the test suite.** `src/data/blog/showcase.mdx` exercises every feature. After each change, build, open it in a real browser at 375 / 768 / 1280 / 1600 px, in light and dark, and look. Fix what you see. Repeat until nothing is off.
- **Delete aggressively.** Every dependency must earn its place. If the platform (CSS, `Intl`, Astro built-ins) does it, remove the library.
- **Zero client JS by default.** Every byte of JS shipped needs a reason. Target: article pages ≤ 5 KB JS (TOC scroll-spy + theme toggle) when comments are off.
- Small, reviewable commits. Conventional commit messages.

## 1. Product goals (in priority order)

1. **Reading comfort.** A 3,000-word post with math and code should feel like a well-set book.
2. **Warmth.** Inviting, paper-like, never sterile white or pure black.
3. **Speed.** Lighthouse 100/100/100/100 on the showcase post (mobile). LCP < 1.0 s on a cold static load.
4. **Low maintenance.** Few dependencies, current majors, boring infrastructure.
5. **Extensible.** Usable as the theme for other subdomains in a pnpm monorepo.

Non-goals: i18n beyond English, CMS integration, paid infrastructure, a full component library.

## 2. Stack: keep / change / remove

Baseline (AstroPaper 6.1): Astro 7, `unified()` Markdown processor + remark-toc/remark-collapse/rehype-callouts, Shiki + `@shikijs/transformers`, Tailwind 4 + `@tailwindcss/typography`, Pagefind, Satori OG images, dayjs, lodash.kebabcase, slugify, ESLint + Prettier, npm.

| Area | Decision | Rationale |
|---|---|---|
| Framework | **Keep** Astro 7 (latest minor). Static output by default; on-demand rendering only for auth/comment endpoints. | Prerendered HTML is the right default for a blog. |
| Markdown processor | **Spike → prefer Sätteri** (Astro 7 default, Rust-based). Fall back to `unified()` only if a gate below fails. | Much faster builds, and GFM, smart punctuation, directives and math are native. Unified plugins don't run on it, so check feature parity. |
| Code blocks | **Replace** Shiki config + `@shikijs/transformers` + custom fileName transformer → **Expressive Code** (`astro-expressive-code`, plus `@expressive-code/plugin-line-numbers` and `plugin-collapsible-sections`). | Titles, frames, copy button, line markers, diff and word highlights in one tool with good a11y. Ships custom warm light/dark themes derived from the palette tokens. |
| Math | **Add** KaTeX, rendered at **build time** (no client JS). Self-host `katex.min.css` and only the woff2 fonts. | MathJax-quality output without a runtime cost. |
| Callouts | **Replace** rehype-callouts → Sätteri native container directives (`:::note`) plus GitHub alert syntax (`> [!NOTE]`). Support both. | One less plugin; GitHub syntax keeps posts portable. |
| TOC | **Remove** remark-toc + remark-collapse (inline TOC). **Add** a `<TableOfContents>` component built from Astro's `headings` → right rail. | Data already comes from `render()`; no plugin needed. |
| Styling | **Keep Tailwind 4** for layout/chrome utilities. **Remove `@tailwindcss/typography`**; write a hand-tuned `prose.css` using design tokens in `@layer` blocks. | The typography plugin fights a custom type scale. Prose is the product, so it should be authored by hand. |
| Fonts | **Keep** the Astro Fonts API (`fonts:` config) with self-hosted, subset woff2 and `font-display: swap`, plus metric-adjusted fallbacks. | No third-party font requests at runtime, and no layout shift. |
| Dates | **Remove dayjs** → `Intl.DateTimeFormat` / `Temporal` where available. | Platform does it. |
| Slugs | **Remove lodash.kebabcase + slugify** → single `github-slugger` (same algorithm as heading IDs). | One slug algorithm everywhere, so links don't break. |
| Search | **Keep Pagefind**, style its UI with tokens. Build step moves to an Astro integration hook instead of `cp -r dist/pagefind public/`. | Best static search; the current copy step is a hack. |
| OG images | **Keep Satori**, restyle to the new palette and fonts. | Works well. |
| Lint/format | **Spike:** oxlint + Biome/oxfmt vs ESLint + Prettier. Adopt the faster tools only if `.astro` files format correctly; otherwise keep Prettier for `.astro` and use oxlint for linting. | 10–50× faster lint; don't regress on `.astro` formatting. |
| Package manager | **pnpm 10**, Node 24 LTS (`engines` ≥ 22.12). | Workspace-ready for the monorepo. |
| Type-check | Keep `astro check` and TS 6, `strict`. | — |
| Tests | **Add** Playwright smoke tests (showcase renders; TOC highlights; math/code/callout DOM present; dark mode toggle; auth flow mocked) plus `@axe-core/playwright`. Lighthouse CI budget on the showcase post. | The theme's quirks are visual, so verify them in a real browser. |

### Sätteri spike gates (all must pass to adopt)
1. Heading IDs match `github-slugger` output, and `render()` still returns `headings` for the TOC.
2. KaTeX renders inline `$…$` and display `$$…$$` at build time (via `satteri-katex` or a small mdast plugin you write). Display math must **not** come out as a code block; this is a known pitfall with plugin ordering.
3. Expressive Code works, including titles, line markers, diff, collapsible sections and copy.
4. Both callout syntaxes render to the same markup.
5. Footnotes, tables, task lists, smart quotes, `<mark>`, `<sup>`/`<sub>`, and MDX components in `.mdx`.
6. Build time is measured against `unified()` on 50 duplicated showcase posts, and the numbers are recorded in the decision doc.

If any gate fails and can't be fixed within the time-box with a small local plugin, use `unified()` and write down what would let you switch later.

## 3. Design system

### 3.1 Typography
- **Body:** a variable serif designed for screen reading with optical sizing. Candidates: **Source Serif 4** (default), **Literata**, **Newsreader**. Put all three in the showcase via a dev-only switcher, compare them at 375 px and 1600 px, choose one, and record why.
- **Headings:** same family, at heavier weight and higher `opsz`. No second display face unless it clearly beats one family.
- **UI/meta** (nav, dates, tags, TOC): the same serif at a smaller size, or small caps (`font-variant-caps: all-small-caps`). No sans unless the TOC reads poorly.
- **Code:** a monospace with clear disambiguation (0/O, 1/l/I): **JetBrains Mono** or **Iosevka**, sized so its x-height matches the serif (`font-size-adjust`).
- **Scale & rhythm:** body `clamp(1.0625rem, 0.95rem + 0.45vw, 1.25rem)`; `line-height` 1.6–1.7 for body and 1.2 for headings; measure **62–70ch**; modular scale ≈ 1.2 (minor third). Use `text-wrap: pretty` on paragraphs, `text-wrap: balance` on headings, `hanging-punctuation: first`, `font-variant-numeric: oldstyle-nums proportional-nums` in prose and `lining-nums tabular-nums` in tables/code.
- `hyphens: auto` only below 480 px.

### 3.2 Color: warm sepia
All colors are CSS custom properties in `src/styles/tokens.css`, set for `:root` and `[data-theme="dark"]`. **No hex values outside the token file.**

Starting point (tune by eye in the showcase, then verify contrast):

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f8f1e3` (warm paper) | `#1d1913` (warm ink) |
| `--bg-raised` (code, callouts, TOC) | `#f1e7d3` | `#262019` |
| `--fg` (body) | `#3a3126` (brown-black, never `#000`) | `#e6dac4` |
| `--fg-muted` (meta) | `#6e6252` | `#a89a83` |
| `--accent` (links, active TOC) | `#a4502a` (burnt sienna) | `#e08a5b` |
| `--accent-2` (sage, the "Sage") | `#5d7350` | `#9fb58e` |
| `--border` | `#e3d6bd` | `#3a3127` |
| `--selection` | `#f2d9a8` | `#5a4630` |

Requirements: body text ≥ 7:1 contrast (AAA), muted text and links ≥ 4.5:1, and focus rings visible on both themes. Respect `prefers-color-scheme`, keep the manual toggle, avoid FOUC (inline script in `<head>`, < 500 bytes). Callout colors (note/tip/important/warning/caution) are warm-shifted variants that stay distinguishable for color-blind readers; each has an icon and a label, so color is never the only signal. Expressive Code themes are generated from these tokens.

### 3.3 Layout
- **Article grid (≥ 1280 px):** `[gutter] [article 62–70ch] [gap] [TOC rail ~16rem] [gutter]`. The article column stays optically centered.
- **TOC:** right rail, `position: sticky; top: var(--header-h) + 2rem`. The rail is **pinned** while content scrolls. The TOC does not scroll with the page; if it's taller than the viewport it gets its own quiet `overflow-y: auto` with a fade mask. Scroll-spy uses `IntersectionObserver` (no scroll listeners) to highlight the section being read, with `aria-current="location"` and an accent bar. It shows h2–h3 and dims h3 until its parent is active. Clicking smooth-scrolls (respecting `prefers-reduced-motion`) and updates the URL hash without a jump. With JS disabled it degrades to a plain list of anchors.
- **Below 1280 px:** the TOC collapses into a `<details>` "On this page" block under the title. No floating buttons.
- Header is minimal: site name, Posts, Tags, Series, Archives, Search, theme toggle, sign-in. On mobile it collapses into a `<details>` menu with no JS.
- Pages: home (intro + recent), post, tags, tag, **series** (new: `series` frontmatter, series index, and an in-post "Part N of M" nav), archives, search, about, 404, RSS, sitemap.

## 4. Features

### 4.1 Content model
Content collection `blog` with this frontmatter schema (zod): `title`, `description`, `pubDatetime`, `modDatetime?`, `tags[]`, `series?`, `draft`, `featured`, `math?` (to skip KaTeX CSS when false), `toc?` (default true), `comments?` (default true), `ogImage?`, `canonicalURL?`. Both `.md` and `.mdx` are supported.

### 4.2 Comments with GitHub / X sign-in (optional feature, off by default)
- **Auth:** [Better Auth](https://www.better-auth.com/) with **only** the `github` and `twitter` (X) social providers. No email/password, which means no password-hashing CPU and fits the Workers free-tier 10 ms CPU limit. Secrets come from `astro:env` server secrets.
- **Storage:** Cloudflare **D1** via **Drizzle ORM** (schema + migrations in repo). Tables: Better Auth's own tables plus `comment(id, post_slug, user_id, parent_id NULL, body_md, body_html, created_at, edited_at, deleted_at)`.
- **Runtime:** `@astrojs/cloudflare` adapter. Posts stay **prerendered**. Only `/api/auth/*` and `/api/comments/*` run on demand. The comments UI is a **server island** (`server:defer`) or a tiny client island that loads when scrolled into view (`client:visible`). It must not affect LCP or the JS budget for readers who never scroll that far.
- **Behaviour:** read for everyone; post, edit and delete your own comments when signed in; one level of replies. Comment Markdown is a safe subset (paragraphs, emphasis, code, links with `rel="nofollow ugc noopener"`), rendered server-side and sanitized. Add per-user rate limiting (D1 counter or a Durable Object), a max length, and an admin role (by GitHub user id in config) that can soft-delete. Include CSRF protection (Better Auth defaults plus `Origin` checks). Sign-in and sign-out are always reachable from the header and the comment box.
- **Theme portability:** comments live behind a `CommentsProvider` interface. The theme ships a `cloudflare-d1` provider and a `none` provider (the default). A site without Cloudflare can still use the theme as pure static.
- **Local dev:** `wrangler`/Miniflare D1 locally; README documents creating the GitHub OAuth app and the X developer app and setting callback URLs.

### 4.3 Everything else from AstroPaper that's worth keeping
Pagefind search, RSS, sitemap, OG images, reading time, prev/next post, edit-on-GitHub link, back-to-top, copy-link on headings (hover anchor `#`), image captions via `<figure>`, responsive images through `astro:assets`.

## 5. The showcase post

`src/data/blog/showcase.mdx` ("AstroSage: every element, set in type") must include at least:
- Every heading level (h2–h4), long enough to scroll so the TOC spy can be checked
- Paragraphs with links, bold, italic, `inline code`, `<mark>`, `<kbd>`, sub/superscript, abbreviations, smart quotes, en and em dashes, footnotes
- Blockquote with attribution, plus a nested blockquote
- All five callout types in **both** syntaxes, one of them with code and math inside
- Ordered, unordered, nested and task lists; a definition list
- A wide table (horizontal scroll inside the column, not the page) and a numeric table (tabular figures)
- Inline math, display math, a multi-line `align` environment, a matrix, and an equation wide enough to overflow (it must scroll, not break the layout)
- Code: TS, Python, Rust, Bash, diff; with a title, line numbers, highlighted lines, inserted and deleted lines, a word highlight, a collapsed section, a terminal frame, and one very long line
- Images: one with a caption, one full-bleed, one in dark/light variants
- An MDX component example
- Series membership (with a second short post in the same series so series nav shows)
- The comments section

## 6. Acceptance criteria (the theme is done when all of these hold)

- [ ] `pnpm build` has no warnings. `astro check` and lint are clean. Playwright and axe pass.
- [ ] Lighthouse mobile on the showcase scores 100 in every category; CLS = 0; no render-blocking third-party requests.
- [ ] JS on article pages ≤ 5 KB gz with comments off; the comments island loads only when visible.
- [ ] The showcase looks right at 375 / 768 / 1280 / 1600 px in light and dark: no overflow, no clipped math or code, the TOC stays pinned and highlights the right section while scrolling up and down, and the active item is visible.
- [ ] Contrast targets in §3.2 are verified (automated where possible).
- [ ] GitHub and X sign-in work end-to-end locally (or are mocked in tests if credentials aren't available, with clear notes on what's left to verify). A signed-in user can comment, reply, edit and delete. Signed-out users can read.
- [ ] Decision docs exist for: Markdown processor, lint/format tooling, font choice, comments architecture.
- [ ] README: features, screenshots (light/dark), configuration, comments setup, deploying to Cloudflare Workers (free tier), upgrading from AstroPaper.
- [ ] LICENSE keeps AstroPaper's MIT notice plus the new copyright.

## 7. Repo shape (so the theme can be consumed from a monorepo)

```
astro-sage/
├─ packages/astro-sage/     # the theme: Astro integration + layouts, components, styles, utils
│  └─ src/{components,layouts,styles,utils,comments}/
├─ apps/demo/               # demo site: showcase post, example config; what Playwright/Lighthouse run against
├─ docs/decisions/
└─ pnpm-workspace.yaml
```

Sites consume it with `astroSage({ ...config })` in `astro.config.ts` and override pieces through slots/props, not by forking files.
