---
title: "Choosing a reading face"
description: "Why AstroSage sets its body text in a variable serif with optical sizing, and how to swap it."
pubDatetime: 2026-10-16T09:00:00Z
tags: ["astrosage", "typography"]
series: "Building AstroSage"
---

AstroSage ships three variable serifs designed for reading on screens: **Source Serif 4**, **Literata** and **Newsreader**. All three support optical sizing, so the same family works for 14px captions and 48px titles.

## Switching faces

Set `typography.serif` in `sage.config.ts`:

```ts title="sage.config.ts"
export default defineSageConfig({
  typography: { serif: "literata" },
});
```

## A full-bleed image in plain Markdown

![Warm hills, edge to edge](./showcase/paper-hills.svg "full")

## Why serif?

For long-form reading, a well-made serif with a large x-height and moderate contrast reads as comfortably as a sans on modern screens, and it gives the page a bookish warmth.

Every element mentioned here is set in [[showcase|the showcase post]], including its [[showcase#Mathematics|maths]].
