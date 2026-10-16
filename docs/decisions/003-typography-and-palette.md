# 003: Typography and palette

**Status:** Accepted, revised 2026-10-15 (supersedes the Source Serif 4 version)

Chosen after comparing six directions in a design lab; see [`docs/design/typography-variants.md`](../design/typography-variants.md).

## Fonts (roles are CSS tokens: `--font-body`, `--font-heading`, `--font-ui`, `--font-code`)
- **Body and headings:** Newsreader (variable, self-hosted through the Astro Fonts API with metric-matched fallbacks, so CLS = 0). Headings are semibold. `typography.serif` still offers Source Serif 4 and Literata.
- **UI** (site header/footer, nav, dates, TOC, labels, captions, callout titles): JetBrains Mono, with uppercase tracked labels. It gives the page a technical voice without touching the reading text.
- **Code:** JetBrains Mono.
- **Fallbacks** (used if the webfonts can't load, e.g. blocked, strict CSP or offline): serif `Iowan Old Style, Charter, Bitstream Charter, Palatino Linotype, Palatino, Noto Serif, Georgia, Cambria, DejaVu Serif, serif`; mono `ui-monospace, SF Mono, Cascadia Mono, Consolas, Menlo, Noto Sans Mono, DejaVu Sans Mono, Liberation Mono, monospace`. They're ordered by reading quality, then by how many platforms ship them, and are configurable via `typography.fallbacks`. The faces load with `font-display: optional` and Astro's synthetic fallback is off: Astro always adjusts Times New Roman, which would otherwise be what readers see on failure. The preloaded webfont nearly always arrives in time, and when it doesn't, the readable fallback stays for that page view with no swap, so CLS stays 0 either way. A Playwright test blocks the webfonts and checks the stacks.
- **Optical sizing** is opt-in (`typography.opticalSizing: true`). The opsz files cost roughly 2× the weight-only files.

## Size and measure
- Body text is **18.5px**, line-height 1.7. Newsreader has a small x-height, so 18.5px reads like about 17px in Source Serif or Inter.
- The column is defined in **characters of the body face**, not px, rem or %: `--measure: clamp(66ch*, 44vw, 71ch*)`, where `--char = --text-body × 0.487` (Newsreader's average character width). It stays at **66 characters** up to ~1350px, grows with the viewport, and caps at **71 characters** (640px) from ~1450px up. Because it's tied to `--text-body`, changing the body size keeps the same character counts. A Playwright test enforces 66–71 from 768px to 2560px. Pure `%` was rejected: 44vw is 50 characters at 1024px and 126 at 2560px. v1 used `68ch` on the 16px container, which collapsed to about 52 characters at 20px.
- The page width follows the content (`measure + rail-gap + rail`), with gutters of `clamp(1rem, 4vw, 2rem)`. The TOC rail shows from 70rem (1120px) up.

## Palette (WCAG verified)
| Token | Light ("a tad warmer") | Dark ("espresso") |
|---|---|---|
| bg / bg-raised | `#f8f2e6` / `#f0e7d6` | `#1f1a15` / `#2a231c` |
| fg | `#2d2620` (13.4:1) | `#ecdfcb` (13.1:1) |
| fg-muted | `#675c4f` (≥ 5.3:1) | `#b0a08a` (≥ 6.1:1) |
| accent | `#9c4a24` | `#e8956a` |
| sage | `#4e6743` | `#adc29b` |

- Every token and callout colour is ≥ 4.5:1 on both surfaces, and body text meets AAA (≥ 7:1). axe-core reports no violations in either theme.
- Code blocks use `--bg-raised` for their background, so they follow the palette.
