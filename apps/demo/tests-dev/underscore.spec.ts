import { expect, test } from "@playwright/test";
import {
  CONTROL,
  HIDDEN,
  HIDDEN_TAG,
  HIDDEN_TITLES,
  LISTS,
} from "../tests/underscoreFixtures";

// Unlike drafts, `_`-prefixed posts stay hidden under `astro dev` too. The
// sitemap and search index only exist in a build: `tests/underscore.spec.ts`.

test("their URLs 404; the control post renders", async ({ request }) => {
  for (const { url } of HIDDEN)
    expect((await request.get(url)).status(), url).toBe(404);
  expect((await request.get(`/tags/${HIDDEN_TAG}/`)).status()).toBe(404);
  expect((await request.get(CONTROL.url)).status()).toBe(200);
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

test("RSS leaves them out", async ({ request }) => {
  const rss = await (await request.get("/rss.xml")).text();
  expect(rss).toContain(CONTROL.title);
  for (const title of HIDDEN_TITLES) expect(rss).not.toContain(title);
});
