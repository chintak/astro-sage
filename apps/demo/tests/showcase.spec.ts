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
  await expect(page.locator("#article > figure > figcaption")).toHaveCount(2);
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
