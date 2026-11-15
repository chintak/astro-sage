import { expect, test } from "@playwright/test";

// Under `astro dev` drafts render, marked "Draft"; feeds still leave them out.
const URL = "/posts/draft-preview/";
const TITLE = "Draft preview";

test("a draft's page renders with a Draft badge", async ({ page }) => {
  const res = await page.goto(URL);
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1.post-title")).toHaveText(TITLE);
  const badge = page.locator(".post-header [data-draft-badge]");
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText("Draft");
});

test("published posts carry no badge", async ({ page }) => {
  await page.goto("/posts/showcase/");
  await expect(page.locator("h1.post-title")).toBeVisible();
  await expect(page.locator("[data-draft-badge]")).toHaveCount(0);
});

test("the draft is listed with a Draft badge", async ({ page }) => {
  for (const path of ["/posts/", "/", "/tags/draft-only/"]) {
    await page.goto(path);
    const card = page.locator(".post-card", { hasText: TITLE });
    await expect(card).toHaveCount(1);
    await expect(card.locator("[data-draft-badge]")).toHaveText("Draft");
    // Only the draft is badged.
    await expect(page.locator("[data-draft-badge]")).toHaveCount(1);
  }
});

test("the badge text has >= 4.5:1 contrast in light and dark", async ({
  page,
}) => {
  await page.goto(URL);
  const badge = page.locator(".post-header [data-draft-badge]");
  await expect(badge).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(t => {
      document.documentElement.dataset.theme = t;
    }, theme);
    const ratio = await badge.evaluate(el => {
      const rgb = (c: string) => {
        const n = c.match(/[\d.]+/g)!.map(Number);
        // `color(srgb r g b)` is 0-1; `rgb(r, g, b)` is 0-255.
        return c.startsWith("color(")
          ? n.slice(0, 3)
          : n.slice(0, 3).map(v => v / 255);
      };
      const lum = (c: string) => {
        const [r, g, b] = rgb(c).map(v =>
          v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
        );
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      let bgEl: Element | null = el;
      let bg = "rgba(0, 0, 0, 0)";
      while (bgEl && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) {
        bg = getComputedStyle(bgEl).backgroundColor;
        bgEl = bgEl.parentElement;
      }
      const [a, b] = [lum(getComputedStyle(el).color), lum(bg)].sort(
        (x, y) => y - x
      );
      return (a + 0.05) / (b + 0.05);
    });
    expect(ratio, `${theme} theme`).toBeGreaterThanOrEqual(4.5);
  }
});

test("RSS still excludes the draft", async ({ request }) => {
  const rss = await (await request.get("/rss.xml")).text();
  expect(rss).toContain("<item>");
  expect(rss).not.toContain("draft-preview");
});
