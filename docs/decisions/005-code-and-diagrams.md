# 005: Code blocks and diagrams

**Status:** Accepted, 2026-10-16

## Code blocks
- **Style: "hairline."** No fill and a 1px `--border` frame, so code sits on the page paper but stays visibly grouped. Inline `code` uses the same hairline. We compared five treatments (card, hairline, whisper tint, margin rule, recessed) in a lab.
- **Syntax theme: Gruvbox** (light-soft / dark-medium), chosen after comparing Rosé Pine, Everforest, Solarized, Kanagawa and GitHub on the actual paper.
- **Contrast:** each theme's background is pinned to the page colour, so Expressive Code's automatic correction (`minSyntaxHighlightingColorContrast`, 5.5:1) targets the real surface. Setting `codeBackground: transparent` instead made it correct against black and *lighten* light-theme tokens. The block becomes transparent in CSS after rendering.
- **Diffs:** dedicated `--diff-ins` / `--diff-del` tokens in deeper green and red. A 0.25rem bar and the +/- indicator carry the strong colour. Line tints are per theme (light 13% / 11%, dark 9% / 10%) so tokens on tinted lines stay ≥ 4.5:1; stronger tints dropped them to 3.6–4.3. Playwright enforces this in both themes.

## Diagrams
Mermaid and Excalidraw are rendered **at build time to inline SVG**. Text stays real text (selectable and searchable), each diagram gets one render per palette (swapped with `[data-theme]`), and no diagram JavaScript ships.

| Source | Syntax |
|---|---|
| Mermaid code | ` ```mermaid title="…" [wide] ` |
| Excalidraw JSON pasted inline | ` ```excalidraw title="…" [wide] ` (scene or "Copy to clipboard as JSON") |
| Excalidraw share link | `![caption](https://excalidraw.com/#json=<id>,<key>)` |
| Excalidraw file in the repo | `![caption](./x.excalidraw)` or `./x.excalidraw.svg` |

- **Rendering needs a browser.** There is no faithful pure-Node renderer for either tool. Mermaid uses `mermaid-isomorphic`; Excalidraw runs `@excalidraw/utils` `exportToSvg` in the same headless Chromium (Playwright, or system Chrome as a fallback). Mermaid gets the site's JetBrains Mono so labels are measured with the real font.
- **Cache:** results are keyed by content hash in `<site>/.sage-cache/diagrams/`. Commit it. CI and Cloudflare builds then need neither a browser nor network. On a cache miss with no browser, the source is shown with a warning; set `SAGE_DIAGRAMS_STRICT=1` to fail the build instead.
- **Share links:** the scene is fetched from `json.excalidraw.com` and decrypted locally (AES-GCM, key from the URL fragment, zlib inflate), following Excalidraw's own format. It's cached per URL. Images embedded in shared scenes aren't fetched yet.
- **Viewer:** expand button or double-click opens a full-screen `<dialog>` with wheel/pinch/button zoom, drag to pan, a "Select text" mode, `0` to fit, `1` for 1:1, and Esc to close. Its script loads only on pages with diagrams.
- **Breakout sizes** (shared with images and `<Figure>`): `wide` spans the text column plus the TOC rail. `full` spans the viewport minus the page gutter, measured in container units on `<body>` (`cqw`, which excludes the scrollbar, unlike `vw`); captions centre under the figure. The rail fades out while either passes beneath it. `fullBleed` on `<Figure>` is kept as a deprecated alias of `size="full"`.
- **Playwright is an optional peer dependency.** Sites without diagrams never load it.
