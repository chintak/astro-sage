# astro-sage

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
