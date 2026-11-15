import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  CONTROL,
  HIDDEN,
  HIDDEN_TAG,
  HIDDEN_TITLES,
  LISTS,
} from "./underscoreFixtures";

// Posts under an `_`-prefixed folder or file never build, whatever `draft`
// says. Runs against `dist`; `tests-dev/underscore.spec.ts` covers `astro dev`.
const DIST = join(import.meta.dirname, "..", "dist");

test.describe("_-prefixed posts are never built", () => {
  test.skip(({ isMobile }) => isMobile, "file checks, once is enough");

  test("no page or tag page in dist; the control post is built", () => {
    for (const { url } of HIDDEN)
      expect(existsSync(join(DIST, url)), url).toBe(false);
    expect(existsSync(join(DIST, "tags", HIDDEN_TAG))).toBe(false);
    expect(existsSync(join(DIST, CONTROL.url, "index.html"))).toBe(true);
  });

  test("no mention anywhere in dist", async () => {
    const entries = await readdir(DIST, {
      withFileTypes: true,
      recursive: true,
    });
    const files = entries
      .filter(e => e.isFile() && /\.(html|xml|txt|json)$/.test(e.name))
      .map(e => join(e.parentPath, e.name));
    expect(files.length).toBeGreaterThan(10);
    const leaks: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf8");
      if (
        HIDDEN_TITLES.some(t => text.includes(t)) ||
        text.includes(HIDDEN_TAG)
      )
        leaks.push(file);
    }
    expect(leaks).toEqual([]);
  });

  test("no served page, RSS item or sitemap entry", async ({ request }) => {
    for (const { url } of HIDDEN)
      expect((await request.get(url)).status(), url).toBe(404);
    expect((await request.get(`/tags/${HIDDEN_TAG}/`)).status()).toBe(404);
    const rss = await (await request.get("/rss.xml")).text();
    expect(rss).toContain(CONTROL.title);
    for (const title of HIDDEN_TITLES) expect(rss).not.toContain(title);
    const sitemap = await readFile(join(DIST, "sitemap-0.xml"), "utf8");
    expect(sitemap).toContain(CONTROL.url);
    for (const { url } of HIDDEN) expect(sitemap).not.toContain(url);
  });

  test("lists and tag pages leave them out", async ({ page }) => {
    for (const path of LISTS) {
      await page.goto(path);
      await expect(page.locator("main")).toContainText(CONTROL.title);
      for (const title of HIDDEN_TITLES)
        await expect(page.locator("main")).not.toContainText(title);
    }
    await page.goto("/tags/");
    await expect(page.locator("main")).not.toContainText(HIDDEN_TAG);
  });

  test("the search index leaves them out", async ({ page }) => {
    await page.goto("/search/");
    const titles = await page.evaluate(async () => {
      const path = "/pagefind/pagefind.js";
      const pagefind = await import(/* @vite-ignore */ path);
      const { results } = await pagefind.search("underscore");
      const data = await Promise.all(
        results.map((r: { data: () => Promise<{ meta: { title: string } }> }) =>
          r.data()
        )
      );
      return data.map(d => d.meta.title);
    });
    expect(titles).toContain(CONTROL.title);
    for (const title of HIDDEN_TITLES) expect(titles).not.toContain(title);
  });
});
