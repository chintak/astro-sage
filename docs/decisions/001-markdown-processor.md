# 001: Markdown processor (Sätteri over unified)

**Status:** Accepted, 2026-10-15

## Context
AstroPaper 6.1 used `unified()` with remark-toc, remark-collapse and rehype-callouts. Astro 7 makes Sätteri, a Rust Markdown/MDX processor, the default. It runs mdast/hast plugins written for Sätteri, but it can't run unified plugins.

## Options
1. Stay on `unified()` and port nothing.
2. Move to Sätteri and replace the plugins with native features or small local plugins.

## Spike results (all gates in the brief)
| Gate | Result |
|---|---|
| Heading IDs via github-slugger, `headings` from `render()` | ✅ Built in (`createHeadingIdsPlugin`) |
| KaTeX at build time, display math not a code block | ✅ ~40-line mdast plugin. It runs on mdast, before the highlighter, so `$$` never becomes `language-math`. In MDX it emits `<Fragment set:html>`. |
| Expressive Code | ✅ `astro-expressive-code` 0.44 detects `satteri()` and registers its hast plugin |
| Both callout syntaxes, same markup | ✅ ~80-line mdast plugin (container directives plus `> [!NOTE]`). MDX needs JSX nodes because custom node types can't be encoded there. |
| Footnotes, tables, task lists, smart quotes, sub/sup, MDX | ✅ Native features (`gfm`, `smartPunctuation`, `superscript`, `subscript`) |

## Decision
Use Sätteri. Remove remark-toc, remark-collapse, rehype-callouts, `@shikijs/transformers` and the custom file-name transformer.

## Consequences
- Faster builds. Showcase plus all routes build in under 2 s cold.
- Two small local plugins live in `packages/astro-sage/src/markdown/` and are covered by the Playwright suite.
- Third-party remark/rehype plugins can't be added without porting. If that becomes necessary, `unified()` is a one-line switch in the integration; the plugins would need unified equivalents (remark-math + rehype-katex, rehype-callouts).
- Not done: the brief's 50-post build-time benchmark against `unified()`. The site is too small today for the number to matter. Re-check if the post count grows past ~200.
