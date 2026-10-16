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
  await expect(
    page.locator('a[title*="Share this post"] svg').first()
  ).toBeAttached();
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
      const col = document
        .querySelector("#article > p")!
        .getBoundingClientRect();
      return {
        vw,
        gutter,
        overflow: document.documentElement.scrollWidth - vw,
        figures: [
          ...document.querySelectorAll<HTMLElement>("#article .figure-full"),
        ].map(el => {
          const b = el.getBoundingClientRect();
          const cap = el
            .querySelector(":scope > figcaption")
            ?.getBoundingClientRect();
          return {
            left: b.left,
            right: vw - b.right,
            capLeft: cap?.left,
            colLeft: col.left,
          };
        }),
      };
    });
    expect(result.overflow).toBeLessThanOrEqual(0);
    expect(result.figures.length).toBeGreaterThanOrEqual(3);
    for (const f of result.figures) {
      expect(Math.abs(f.left - result.gutter)).toBeLessThanOrEqual(1);
      expect(Math.abs(f.right - result.gutter)).toBeLessThanOrEqual(1);
      if (f.capLeft !== undefined)
        expect(Math.abs(f.capLeft - f.colLeft)).toBeLessThanOrEqual(1);
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
  // Tags in a post footer carry counts too.
  await page.goto(SHOWCASE);
  await expect(
    page.locator(".post-footer a.tag .tag-count").first()
  ).toBeVisible();
});
