import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// `src/content/posts/draft-preview.md` has `draft: true`. These checks run
// against the production build (`dist`); `tests-dev/` covers `astro dev`.
const DIST = join(import.meta.dirname, "..", "dist");
const SLUG = "draft-preview";
const TITLE = "Draft preview";

async function textFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter(e => e.isFile() && /\.(html|xml|txt|json)$/.test(e.name))
    .filter(e => !e.parentPath.includes("pagefind"))
    .map(e => join(e.parentPath, e.name));
}

test.describe("drafts are never built", () => {
  test.skip(({ isMobile }) => isMobile, "file checks, once is enough");

  test("no page, OG image or tag page in dist", () => {
    expect(existsSync(join(DIST, "posts"))).toBe(true);
    expect(existsSync(join(DIST, "posts", SLUG))).toBe(false);
    expect(existsSync(join(DIST, "posts", SLUG, "index.png"))).toBe(false);
    expect(existsSync(join(DIST, "tags", "draft-only"))).toBe(false);
  });

  test("no mention or badge anywhere in dist", async () => {
    const files = await textFiles(DIST);
    expect(files.length).toBeGreaterThan(10);
    const leaks: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf8");
      if (
        text.includes(`/posts/${SLUG}`) ||
        text.includes(TITLE) ||
        text.includes("draft-only") ||
        text.includes("data-draft-badge")
      )
        leaks.push(file);
    }
    expect(leaks).toEqual([]);
  });

  test("no RSS item, sitemap entry or served page", async ({ request }) => {
    const rss = await (await request.get("/rss.xml")).text();
    expect(rss).toContain("<item>");
    expect(rss).not.toContain(SLUG);
    const sitemap = await readFile(join(DIST, "sitemap-0.xml"), "utf8");
    expect(sitemap).toContain("/posts/showcase/");
    expect(sitemap).not.toContain(SLUG);
    expect((await request.get(`/posts/${SLUG}/`)).status()).toBe(404);
    expect((await request.get("/tags/draft-only/")).status()).toBe(404);
  });

  test("lists and tag counts leave it out", async ({ page }) => {
    for (const path of ["/", "/posts/", "/archives/", "/tags/"]) {
      await page.goto(path);
      await expect(page.locator("main")).not.toContainText(TITLE);
      await expect(page.locator("[data-draft-badge]")).toHaveCount(0);
    }
  });
});
