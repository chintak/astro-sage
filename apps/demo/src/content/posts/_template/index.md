---
title: "Hidden underscore template"
description: "Test fixture: a post in an _-prefixed folder. It never loads."
pubDatetime: 2026-10-18T09:00:00Z
tags: ["underscore-hidden", "astrosage"]
---

This file lives in `posts/_template/`. Any folder or file under `src/content/posts/` whose name starts with `_` is ignored, in `astro dev` and `astro build` alike, whatever `draft` says. The demo's tests check it never appears.
