import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SHOWCASE = "/posts/showcase/";

test("showcase renders every content feature", async ({ page }) => {
  await page.goto(SHOWCASE);
  const article = page.locator("#article");

  // Math: rendered at build time, never as a code block.
  await expect(article.locator(".katex").first()).toBeVisible();
  await expect(article.locator(".math-display")).toHaveCount(4);
  await expect(article.locator("code.language-math")).toHaveCount(0);

  // Callouts from both syntaxes.
  for (const kind of ["note", "tip", "important", "warning", "caution"]) {
    await expect(
      article.locator(`.callout[data-callout="${kind}"]`)
    ).toHaveCount(1);
  }
  await expect(
    article.locator(".callout-title").filter({ hasText: "Mind the cache" })
  ).toBeVisible();

  // Expressive Code with copy buttons.
  await expect(article.locator(".expressive-code").first()).toBeVisible();
  await expect(
    article.locator(".expressive-code .copy button").first()
  ).toBeAttached();

  // Footnotes and figures.
  await expect(article.locator("section.footnotes li")).toHaveCount(2);
  // Column, wide and full <Figure>s plus a plain-Markdown "full" image.
  await expect(
    page.locator("#article > figure:not(.diagram) > figcaption")
  ).toHaveCount(4);
});

test("no horizontal page overflow", async ({ page }) => {
  await page.goto(SHOWCASE);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("TOC rail is pinned and tracks the current section", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "rail is desktop-only; mobile uses the inline TOC");
  await page.goto(SHOWCASE);
  const rail = page.locator(".toc-rail");
  await expect(rail).toBeVisible();
  await expect(page.locator(".toc-inline")).toBeHidden();

  await page.locator("#mathematics").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const top = document
      .getElementById("mathematics")!
      .getBoundingClientRect().top;
    window.scrollBy(0, top - 20);
  });
  await expect(rail.locator('a[aria-current="location"]')).toHaveText(
    "Mathematics"
  );
  const railTop = await rail.evaluate(el => el.getBoundingClientRect().top);
  expect(railTop).toBeGreaterThanOrEqual(0);
  expect(railTop).toBeLessThan(80);

  await page.evaluate(() => {
    const top = document
      .getElementById("callouts")!
      .getBoundingClientRect().top;
    window.scrollBy(0, top - 20);
  });
  await expect(rail.locator('a[aria-current="location"]')).toHaveText(
    "Callouts"
  );
});

test("inline TOC on narrow screens", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto(SHOWCASE);
  await expect(page.locator(".toc-rail")).toBeHidden();
  await page.locator(".toc-inline summary").click();
  await expect(page.locator(".toc-inline a").first()).toBeVisible();
});

test("theme toggle persists dark mode", async ({ page, isMobile }) => {
  await page.goto(SHOWCASE);
  await page.locator("#theme-btn").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  void isMobile;
});

for (const theme of ["light", "dark"] as const) {
  test(`no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript(t => localStorage.setItem("theme", t), theme);
    await page.goto(SHOWCASE);
    const results = await new AxeBuilder({ page })
      .exclude("#comments")
      .exclude(".expressive-code") // third-party syntax colours are checked separately
      .analyze();
    expect(results.violations.map(v => `${v.id}: ${v.nodes.length}`)).toEqual(
      []
    );
  });
}

test("series, tags, archives, search pages render", async ({ page }) => {
  for (const path of [
    "/",
    "/series/",
    "/series/building-astrosage/",
    "/tags/",
    "/archives/",
    "/search/",
    "/rss.xml",
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});

test("social and share icons render", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('footer a[title*="on Github"] svg')).toBeVisible();
  await page.goto(SHOWCASE);
  await expect(page.locator(".share a.share-btn svg").first()).toBeAttached();
});

for (const path of [SHOWCASE]) {
  test(`KaTeX is styled, not raw (${path})`, async ({ page }) => {
    await page.goto(path);
    // Without KaTeX CSS the MathML copy renders inline next to the HTML copy.
    const mathml = page.locator(".katex-mathml").first();
    await expect(mathml).toHaveCSS("position", "absolute");
    // Theme spacing must win over KaTeX's unlayered `.katex-display` margin.
    await expect(
      page.locator(".math-display .katex-display").first()
    ).toHaveCSS("margin-top", "0px");
  });
}

test("reading column stays within 66–71 characters on tablet and desktop", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "phones are narrower than 66 characters by design");
  await page.goto(SHOWCASE);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [768, 1024, 1280, 1400, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const chars = await page.evaluate(() => {
      const p = [
        ...document.querySelectorAll<HTMLElement>("#article > p"),
      ].find(el => el.innerText.length > 200)!;
      const cs = getComputedStyle(p);
      const ctx = document.createElement("canvas").getContext("2d")!;
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const cw = ctx.measureText("abcdefghijklmnopqrstuvwxyz").width / 26;
      return p.getBoundingClientRect().width / cw;
    });
    expect(Math.round(chars), `${width}px`).toBeGreaterThanOrEqual(66);
    expect(Math.round(chars), `${width}px`).toBeLessThanOrEqual(71);
  }
});

test("diagrams render as inline SVG with both palettes", async ({ page }) => {
  await page.goto(SHOWCASE);
  const diagrams = page.locator("#article .diagram");
  await expect(diagrams).toHaveCount(6);
  await expect(page.locator("#article .diagram-error")).toHaveCount(0);
  await expect(page.locator("#article .diagram-light svg")).toHaveCount(6);
  // Mermaid labels are real text (selectable/searchable) in the UI mono face.
  const font = await page
    .locator('#article [data-diagram="mermaid"] .diagram-light svg text')
    .first()
    .evaluate(el => getComputedStyle(el).fontFamily);
  expect(font).toContain("JetBrains Mono");
});

test("diagram viewer zooms and closes", async ({ page, isMobile }) => {
  await page.goto(SHOWCASE);
  const fig = page.locator("#article .diagram").first();
  await fig.scrollIntoViewIfNeeded();
  if (!isMobile) await fig.hover();
  await fig.locator(".diagram-expand").click();
  const viewer = page.locator("dialog.diagram-viewer");
  await expect(viewer).toBeVisible();
  const before = await viewer.locator("output").textContent();
  await viewer.getByRole("button", { name: "Zoom in" }).click();
  await expect(viewer.locator("output")).not.toHaveText(before ?? "");
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
});

test("wide diagrams break out and the TOC rail steps aside", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "rail is desktop-only");
  await page.goto(SHOWCASE);
  const wide = page.locator("#article .diagram.figure-wide").first();
  const col = await page
    .locator("#article > p")
    .first()
    .evaluate(el => el.getBoundingClientRect().width);
  const w = await wide.evaluate(el => el.getBoundingClientRect().width);
  expect(w).toBeGreaterThan(col + 100);
  await wide.evaluate(el =>
    window.scrollTo({
      top: el.getBoundingClientRect().top + scrollY - 200,
      behavior: "instant",
    })
  );
  await expect(page.locator(".toc-rail")).toHaveAttribute("data-obscured", "");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`diff lines keep tokens >= 4.5:1 (${theme})`, async ({ page }) => {
    await page.addInitScript(t => localStorage.setItem("theme", t), theme);
    await page.goto(SHOWCASE);
    const min = await page.evaluate(() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 1;
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      const rgb = (c: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const over = (fg: string, bg: string) => {
        const [r, g, b, a] = rgb(fg);
        const [R, G, B] = rgb(bg);
        const t = a / 255;
        return `rgb(${r * t + R * (1 - t)},${g * t + G * (1 - t)},${b * t + B * (1 - t)})`;
      };
      const lum = (c: string) => {
        const [r, g, b] = rgb(c)
          .slice(0, 3)
          .map(v => v / 255)
          .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const cr = (a: string, b: string) => {
        const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
        return (x + 0.05) / (y + 0.05);
      };
      const page = getComputedStyle(document.body).backgroundColor;
      let m = 99;
      for (const line of document.querySelectorAll<HTMLElement>(
        "#article .ec-line.ins, #article .ec-line.del"
      )) {
        const bg = over(getComputedStyle(line).backgroundColor, page);
        for (const sp of line.querySelectorAll<HTMLElement>(".code span"))
          if (sp.textContent?.trim())
            m = Math.min(m, cr(getComputedStyle(sp).color, bg));
      }
      return m;
    });
    expect(min).toBeGreaterThanOrEqual(4.5);
  });
}

for (const width of [375, 1024, 1440, 1920]) {
  test(`full-bleed figures keep a gutter on both edges at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(SHOWCASE);
    const result = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const gutter = parseFloat(
        getComputedStyle(document.querySelector(".app-layout")!).paddingLeft
      );
      return {
        vw,
        gutter,
        overflow: document.documentElement.scrollWidth - vw,
        figures: [
          ...document.querySelectorAll<HTMLElement>("#article .figure-full"),
        ].map(el => {
          const b = el.getBoundingClientRect();
          // Measure the caption's text, not its box, to check it's centred.
          const capEl = el.querySelector(":scope > figcaption");
          let capCentre: number | undefined;
          if (capEl) {
            const range = document.createRange();
            range.selectNodeContents(capEl);
            const r = range.getBoundingClientRect();
            capCentre = r.left + r.width / 2;
          }
          return {
            left: b.left,
            right: vw - b.right,
            capCentre,
            figCentre: b.left + b.width / 2,
          };
        }),
      };
    });
    expect(result.overflow).toBeLessThanOrEqual(0);
    expect(result.figures.length).toBeGreaterThanOrEqual(3);
    for (const f of result.figures) {
      expect(Math.abs(f.left - result.gutter)).toBeLessThanOrEqual(1);
      expect(Math.abs(f.right - result.gutter)).toBeLessThanOrEqual(1);
      // Captions centre under the figure, like wide figures.
      if (f.capCentre !== undefined)
        expect(Math.abs(f.capCentre - f.figCentre)).toBeLessThanOrEqual(2);
    }
  });
}

test("every tag shows its post count, matching its tag page", async ({
  page,
}) => {
  await page.goto("/tags/");
  const tags = await page.locator("a.tag").evaluateAll(els =>
    els.map(a => ({
      href: (a as HTMLAnchorElement).getAttribute("href")!,
      count: Number(a.querySelector(".tag-count [aria-hidden]")!.textContent),
      sr: a.querySelector(".tag-count .sr-only")!.textContent,
    }))
  );
  expect(tags.length).toBeGreaterThan(0);
  for (const t of tags) {
    expect(t.sr).toBe(`(${t.count} ${t.count === 1 ? "post" : "posts"})`);
    await page.goto(t.href);
    await expect(page.locator("#main-content li.post-card")).toHaveCount(
      t.count
    );
  }
  // A post's tags sit in its header (not the footer) and carry counts too.
  await page.goto(SHOWCASE);
  await expect(
    page.locator(".post-header .post-tags a.tag .tag-count").first()
  ).toBeVisible();
  await expect(page.locator(".post-footer a.tag")).toHaveCount(0);
});

test("readable system fallbacks when web fonts fail", async ({ page }) => {
  await page.route(/\/_astro\/fonts\/.*\.woff2$/, r => r.abort());
  await page.goto(SHOWCASE);
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const body = getComputedStyle(
      document.querySelector("#article p")!
    ).fontFamily;
    const ui = getComputedStyle(
      document.querySelector(".post-meta")!
    ).fontFamily;
    return {
      body,
      ui,
      failed: [...document.fonts]
        .filter(f => /Newsreader|JetBrains/.test(f.family))
        .every(f => f.status !== "loaded"),
    };
  });
  expect(result.failed).toBe(true);
  // The stacks name readable faces before the generic family (no synthetic Times).
  expect(result.body).toMatch(
    /Iowan Old Style.*Charter.*Palatino Linotype.*serif$/
  );
  expect(result.body).not.toContain("Times New Roman");
  expect(result.ui).toMatch(
    /ui-monospace.*Cascadia Mono.*Consolas.*monospace$/
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("series labels link to the series page", async ({ page }) => {
  await page.goto(SHOWCASE);
  await page.locator(".post-header a.series-link").click();
  await expect(page).toHaveURL(/\/series\/building-astrosage\/$/);
  await expect(page.locator("h1")).toHaveText("Building AstroSage");
  await page.goto("/");
  await expect(page.locator("a.card-series").first()).toHaveAttribute(
    "href",
    /\/series\/building-astrosage\/$/
  );
});

test("share sheet links to every platform with the canonical URL and title", async ({
  page,
}) => {
  await page.goto(SHOWCASE);
  const url = encodeURIComponent(
    "https://astro-sage.pages.dev/posts/showcase/"
  );
  const title = encodeURIComponent("AstroSage: every element, set in type");
  const expected = [
    `https://x.com/intent/post?url=${url}&text=${title}`,
    `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    `https://bsky.app/intent/compose?text=${title}%20${url}`,
    `https://www.reddit.com/submit?url=${url}&title=${title}`,
    `https://news.ycombinator.com/submitlink?u=${url}&t=${title}`,
    `mailto:?subject=${title}&body=${url}`,
  ];
  const hrefs = await page
    .locator(".share a.share-btn")
    .evaluateAll(els => els.map(a => a.getAttribute("href")));
  expect(hrefs).toEqual(expected);
  await expect(page.locator(".share [data-copy]")).toBeVisible();
});

test("citation block is folded and offers text and BibTeX", async ({
  page,
}) => {
  await page.goto(SHOWCASE);
  const cite = page.locator("details.citation");
  // Folded by default, and not a heading (so it stays out of the TOC).
  await expect(cite).not.toHaveAttribute("open");
  await expect(cite.locator(".citation-text")).toBeHidden();
  await expect(cite.locator("h2, h3")).toHaveCount(0);
  await expect(page.locator(".toc a", { hasText: /cite/i })).toHaveCount(0);
  await cite.locator("summary").click();
  await expect(cite.locator(".citation-text")).toContainText(
    "Sheth, Chintak. (Oct 2026). AstroSage: every element, set in type. astro-sage.pages.dev."
  );
  const bib = await cite.locator(".citation-bib code").textContent();
  expect(bib).toContain("@article{sheth2026showcase,");
  expect(bib).toContain(
    "url     = {https://astro-sage.pages.dev/posts/showcase/}"
  );
});

test("selecting text offers to share it as a quote", async ({ page }) => {
  await page.goto(SHOWCASE);
  await page.evaluate(() => {
    const p = document.querySelector("#article > p")!;
    const text = p.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, "Good typography is invisible.".length);
    const sel = document.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  });
  const bar = page.locator(".quote-share");
  await expect(bar).toBeVisible();
  const x = await bar.locator('a[data-t="x"]').getAttribute("href");
  const link =
    "https://astro-sage.pages.dev/posts/showcase/#:~:text=Good%20typography%20is%20invisible.";
  expect(x).toContain(
    encodeURIComponent(
      "“Good typography is invisible.” — AstroSage: every element, set in type"
    )
  );
  expect(x).toContain(encodeURIComponent(link));
  await page.keyboard.press("Escape");
  await expect(bar).toBeHidden();
});

test("a selection can be shared as an image card", async ({ page }) => {
  // Desktop path: without file sharing, the card downloads as a PNG.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined });
  });
  await page.goto(SHOWCASE);
  await page.evaluate(() => {
    const text = document.querySelector("#article > p")!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, "Good typography is invisible.".length);
    document.getSelection()!.removeAllRanges();
    document.getSelection()!.addRange(range);
  });
  const bar = page.locator(".quote-share");
  await expect(bar).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    bar.locator('button[data-t="image"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe("quote.png");
  const png = await readFile((await download.path())!);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  // 1200×630 at 2×.
  expect(png.readUInt32BE(16)).toBe(2400);
  expect(png.readUInt32BE(20)).toBe(1260);
  await expect(bar.locator(".qs-status")).toHaveText("Image saved");
});

test("code blocks show their language on the frame", async ({ page }) => {
  await page.goto(SHOWCASE);
  const label = (lang: string) =>
    page.locator(`pre[data-language="${lang}"] .sage-lang`);
  await expect(label("ts").first()).toHaveText("TypeScript");
  await expect(label("python")).toHaveText("Python");
  await expect(label("rust")).toHaveText("Rust");
  // Terminal frames already read as shell; no label.
  await expect(page.locator(".frame.is-terminal .sage-lang")).toHaveCount(0);
  // The label is decorative: it stays out of copied code and the a11y tree.
  await expect(label("python")).toHaveAttribute("aria-hidden", "true");
  const code = await page
    .locator('pre[data-language="python"]')
    .locator("xpath=..")
    .locator(".copy button")
    .getAttribute("data-code");
  expect(code).not.toContain("Python");
  // Nothing (e.g. a titled frame's header border) paints over any label.
  const covered = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".sage-lang")]
      .map(l => {
        l.scrollIntoView({ block: "center", behavior: "instant" });
        l.style.pointerEvents = "auto";
        const r = l.getBoundingClientRect();
        const hit = document.elementFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2
        );
        l.style.pointerEvents = "";
        return hit === l ? null : l.textContent;
      })
      .filter(Boolean)
  );
  expect(covered).toEqual([]);
});

test("wiki-links resolve to posts, headings and this page", async ({
  page,
}) => {
  await page.goto(SHOWCASE);
  const prose = page.locator("#article");
  // [[colophon]] → the post, titled from its frontmatter.
  const post = prose.locator('a[href="/posts/colophon/"]').first();
  await expect(post).toHaveText("Colophon");
  await expect(post).toHaveClass(/link-internal/);
  // [[colophon#Tools|the toolchain]] → a heading in another post.
  await expect(prose.locator('a[href="/posts/colophon/#tools"]')).toHaveText(
    "the toolchain"
  );
  // [[#Callouts]] → a heading on this page.
  await expect(
    prose.locator('p a[href="#callouts"]', { hasText: "Callouts" })
  ).toHaveCount(1);
  await expect(prose.locator(".wikilink-broken")).toHaveCount(0);
  // Wiki-links work in plain Markdown too, and the target exists.
  await page.goto("/posts/colophon/");
  const back = page.locator('#article a[href="/posts/showcase/"]');
  await expect(back).toHaveText("AstroSage: every element, set in type");
  await page.locator("#article a[href='/posts/showcase/']").click();
  await expect(page).toHaveURL(/\/posts\/showcase\/$/);
  await page.goto("/posts/colophon/#tools");
  await expect(page.locator("#tools")).toBeVisible();
});

test("internal and external links look different", async ({ page }) => {
  await page.goto(SHOWCASE);
  const ext = page.locator('#article a[href="https://docs.astro.build"]');
  const int = page.locator('#article a[href="/posts/colophon/"]').first();
  await expect(ext).toHaveClass(/link-external/);
  await expect(ext).toHaveAttribute("rel", /noopener/);
  await expect(int).toHaveClass(/link-internal/);
  const arrow = (l: typeof ext) =>
    l.evaluate(el => {
      const cs = getComputedStyle(el, "::after");
      return cs.content !== "none" && cs.content !== "normal" ? cs.width : null;
    });
  expect(await arrow(ext)).not.toBeNull();
  expect(await arrow(int)).toBeNull();
  // In-page anchors (footnotes, TOC) are neither.
  await expect(
    page.locator("#article a[data-footnote-ref]").first()
  ).not.toHaveClass(/link-(internal|external)/);
});

test("task-list checkboxes are round, filled when checked", async ({
  page,
}) => {
  await page.goto(SHOWCASE);
  const boxes = page.locator(".task-list-item input[type=checkbox]");
  const style = (i: number) =>
    boxes.nth(i).evaluate(el => {
      const cs = getComputedStyle(el);
      const sage = getComputedStyle(document.documentElement)
        .getPropertyValue("--sage")
        .trim();
      return {
        radius: cs.borderTopLeftRadius,
        appearance: cs.appearance,
        bg: cs.backgroundColor,
        sage,
      };
    });
  const done = await style(0);
  expect(done.appearance).toBe("none");
  expect(done.radius).toBe("50%");
  expect(done.bg).not.toBe("rgba(0, 0, 0, 0)");
  const open = await style(2);
  expect(open.bg).toBe("rgba(0, 0, 0, 0)");
  // Done items are struck through; open ones are not.
  const deco = (i: number) =>
    page
      .locator(".task-list-item")
      .nth(i)
      .evaluate(el => getComputedStyle(el).textDecorationLine);
  expect(await deco(0)).toBe("line-through");
  expect(await deco(2)).toBe("none");
});

test("social meta tags for share previews", async ({ page }) => {
  await page.goto(SHOWCASE);
  const meta = (sel: string) => page.locator(`meta[${sel}]`);
  await expect(meta('property="og:type"')).toHaveCount(1);
  await expect(meta('property="og:type"')).toHaveAttribute(
    "content",
    "article"
  );
  await expect(meta('property="og:image"')).toHaveAttribute(
    "content",
    "https://astro-sage.pages.dev/posts/showcase/index.png"
  );
  await expect(meta('property="og:image:width"')).toHaveAttribute(
    "content",
    "1200"
  );
  await expect(meta('name="twitter:card"')).toHaveAttribute(
    "content",
    "summary_large_image"
  );
  await expect(meta('name="twitter:image"')).toHaveAttribute(
    "content",
    "https://astro-sage.pages.dev/posts/showcase/index.png"
  );
  const res = await page.request.get("/posts/showcase/index.png");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});
