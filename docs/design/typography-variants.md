# Typography & layout iteration: five directions

**Ask:** revisit font family and size, question whether serif should be used for everything, and tighten the left/right margins.

## What the current theme gets wrong (measured at 1440px)

| | Body | Column | Chars/line | Side margin |
|---|---|---|---|---|
| **AstroSage v1** | Source Serif 4, 20px / 1.65 | **576px** | **~52** | **276px** each side |
| Anthropic Research | Serif 17px / 1.55, sans headings | 640px | ~69 | 400px (no rail) |
| Distill | System sans 17px / 1.7 | 704px | ~82 | 368px (margin notes) |
| Lil'Log (PaperMod) | System sans 16px / 1.6 | 720px | ~88 | 351px |
| Bartosz Ciechanowski | IBM Plex Sans 19px / 1.6 | 800px | ~83 | 320px |
| Maggie Appleton | Canela Text serif 22px / 2.0 | 792px | ~71 | 324px |

The column is `68ch`, but `ch` resolves against the 16px grid container while the prose renders at 20px. So the measure collapses to ~52 characters: big type in a narrow column, with a wide empty frame around it. Every reference uses a 640–800px column.

**Serif everywhere:** it works for long-form body text, but it makes UI chrome (nav, dates, TOC, tags, captions) feel heavy and bookish at small sizes. Most references pair families: serif body with sans headings/UI (Anthropic), or sans body with mono details (engineering blogs).

## Shared fixes in every variant
- Measure is a token in `rem` (`--measure`), so it no longer depends on font size. Target 66–78 characters.
- Body text 16.5–19.5px depending on the face's x-height, not one size for every face.
- Tighter frame: the page width follows the content (`measure + gap + rail`), gutters `clamp(1rem, 4vw, 2rem)`, and the TOC rail sits 2.5–4rem from the text instead of ~5rem.
- Families split into tokens: `--font-body`, `--font-heading`, `--font-ui`, `--font-code`.

## The five directions

| # | Name | Body | Headings | UI (nav, meta, TOC) | Size / leading | Measure | Palette | Inspired by |
|---|---|---|---|---|---|---|---|---|
| 1 | **Refined Serif** | Source Serif 4 | Source Serif 4, 600 | Source Serif 4, small caps | 18px / 1.65 | 42rem (~72ch) | Current sepia | Control: v1 with the measure fixed |
| 2 | **Research Paper** | Source Serif 4 | Inter, 650, tight tracking | Inter | 17.5px / 1.6 | 40rem (~70ch) | Lighter cream `#faf7f0`, near-black ink, clay accent | Anthropic Research |
| 3 | **Technical Sans** | IBM Plex Sans | IBM Plex Sans, 600 | IBM Plex Sans | 17.5px / 1.7 | 42rem (~76ch) | Neutral warm paper `#f7f3eb` | Distill, Ciechanowski |
| 4 | **Literary Long-form** | Newsreader | Newsreader display, 400, large | Inter, small caps | 19.5px / 1.75 | 40rem (~66ch) | Deeper sepia `#f3ebdb` | Maggie Appleton |
| 5 | **Engineer's Notebook** | Inter | Inter, 700 | JetBrains Mono (meta, TOC, eyebrows) | 16.5px / 1.65 | 43rem (~80ch) | Current sepia, sage accent | Lil'Log / PaperMod |

| 6 | **Mix** (chosen elements) | Newsreader | Newsreader, 600 | JetBrains Mono, uppercase labels | 17.5px / 1.7 | 35rem (~68ch) | Neutral warm paper `#f7f3eb` | Body from #4, UI from #5, size from #2, palette from #3 |

### Rationale
1. **Refined Serif:** keeps the bookish identity and fixes the measure and frame. Lowest-risk change.
2. **Research Paper:** serif for reading, sans for structure. Headings and UI scan faster, and the page feels contemporary rather than antique. This is the most common pairing among the references.
3. **Technical Sans:** a humanist sans is more legible than a serif at small sizes and on low-DPI screens, and sits naturally next to code and math. Feels like documentation, in a good way.
4. **Literary Long-form:** leans into essay reading: a larger, airier serif and display-weight headings. Best for narrative posts, weakest for dense code-heavy notes.
5. **Engineer's Notebook:** a dense, efficient sans with mono details for an "engineering log" voice. Closest to PaperMod and Lil'Log, and fits the most text per screen.

Compare them live at `/lab/` in the demo (the switcher sits at the top; light and dark both work).

### Note on variant 6
Newsreader's x-height is small, so at 17.5px it reads like ~16px in Source Serif, and ~68 characters needs a 35rem (560px) column. At 1440px that leaves ~292px side margins, about the same as v1. Options: 18.5px at 37rem (~68ch, ~276px margins) or keep 17.5px at 38rem (~74ch, ~268px margins).

## Outcome (2026-10-15)
Shipped variant 6 with these adjustments: body **18.5px**, column clamped to **66–71 characters** (`clamp(66 chars, 44vw, 71 chars)`, in units of the body face), and a slightly warmer light palette (`#f8f2e6`) paired with an **espresso** dark palette (`#1f1a15`). The other dark candidates were warm charcoal, ink & ember, dusk sepia and moss night. Details: [decision 003](../decisions/003-typography-and-palette.md).
