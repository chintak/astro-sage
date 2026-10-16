# astro-sage

## 0.1.5

### Patch Changes

- 59b1d39: README: the intro no longer mentions the removed GitHub/X sign-in comments on Cloudflare. Comments are optional utterances or giscus widgets, and the site is fully static for any host.

## 0.1.4

### Patch Changes

- 48ce06a: Posts with a "Cite this post" block no longer show two horizontal rules with an empty band between them above it: the citation's own rule is now the post footer's only divider.

## 0.1.3

### Patch Changes

- d37d4f7: First release published from GitHub Actions through npm trusted publishing, with a provenance attestation linking the package to its source commit. `<Figure>` no longer triggers its own `fullBleed` deprecation warning in `astro check`.

## 0.1.2

### Patch Changes

- 25aac49: Publish to npm: add the theme to an existing site with `pnpm add astro-sage` instead of a git submodule. The package now ships its README, FEATURES.md, LICENSE and changelog, and leaves out test files. Generated OG images no longer fail under pnpm when the site doesn't list `sharp` itself: the theme resolves `sharp` and its fonts from its own dependencies.

## 0.1.1

### Patch Changes

- 4642130: - The header's Series link only appears when at least one published post belongs to a series.
  - Fixed missing prose spacing on the About page: the content is now the direct child of `.app-prose`, so paragraphs and lists get their margins and headings no longer overlap the text below them.
- 0108966: Home page: the RSS link is now an icon that matches the social links (same size, colour and hover), with an accessible "RSS feed" label instead of visible text.

## 0.1.0

First release: a readability-first Astro 7 blog theme, forked from AstroPaper and rebuilt as an installable integration. See [FEATURES.md](../../FEATURES.md) for everything it supports, including:

- Serif typography (Newsreader, Source Serif 4 or Literata) with JetBrains Mono UI, a 66–71 character column and readable fallbacks.
- Warm paper / espresso palette, WCAG-checked in both themes.
- Pinned, scroll-spying table of contents.
- Build-time KaTeX, Mermaid and Excalidraw; Expressive Code with language labels.
- Callouts, round task lists, breakout figures, wiki-links, internal/external link styles.
- Series, tags with counts, archives, Pagefind search, RSS, sitemap, generated OG images.
- Share sheet, quote sharing (text fragments and image cards), folded citations with BibTeX.
- Optional comments via utterances or giscus.
- Fully static output that runs on any host.
