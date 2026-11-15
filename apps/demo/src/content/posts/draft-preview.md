---
title: "Draft preview"
description: "A draft: visible with a Draft badge under astro dev, never part of a build."
pubDatetime: 2026-10-20T09:00:00Z
tags: ["draft-only"]
draft: true
---

This post has `draft: true`. Run `astro dev` to preview it, with a **Draft** badge on the page and on post cards. `astro build` leaves it out entirely: no page, list or tag entry, feed item, sitemap entry or OG image. The demo's tests check both.
