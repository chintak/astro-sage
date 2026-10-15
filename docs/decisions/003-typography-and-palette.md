# 003: Typography and palette

**Status:** Accepted, 2026-10-15

## Fonts
Body: **Source Serif 4** (variable, self-hosted via the Astro Fonts API with metric-matched fallbacks, so CLS = 0). **Literata** and **Newsreader** ship as alternatives through `typography.serif`. Code: **JetBrains Mono**.

Optical sizing (`opsz`) is **opt-in** (`typography.opticalSizing: true`). It noticeably improves large headings, but the opsz files are 110–132 KB per style against ~51 KB for weight-only. On Lighthouse's simulated slow 4G that cost about 5 performance points (95 → 90) on the showcase, because the body paragraph is the LCP element and waits for the font swap.

Source Serif 4 is the default because it has the largest x-height of the three at small sizes and the most neutral italic for long passages. Literata reads more bookish and Newsreader more editorial.

## Scale and rhythm
Body `clamp(1.0625rem, 0.95rem + 0.45vw, 1.25rem)`, line-height 1.65, measure 68ch, minor-third heading scale, `text-wrap: pretty`/`balance`, old-style figures in prose, tabular lining figures in tables. Hyphenation only below 30rem, limited to words of 10+ characters.

## Palette (WCAG, verified)
| Token | Light | Dark | Contrast on bg / raised |
|---|---|---|---|
| fg | `#3a3126` | `#e8dcc6` | 11.3 / 10.4 · 12.9 / 11.7 |
| fg-muted | `#6b5f4f` | `#ab9d86` | 5.5 / 5.1 · 6.6 / 6.0 |
| accent | `#9c4a24` | `#e4915f` | 5.5 / 5.0 · 7.1 / 6.5 |
| sage | `#4e6743` | `#a3b993` | 5.6 / 5.1 · 8.3 / 7.5 |

Every callout colour is ≥ 4.5:1 on both surfaces. Body text meets AAA (≥ 7:1). axe-core passes with no violations in both themes.
