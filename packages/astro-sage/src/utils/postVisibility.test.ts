import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isDraftBadgeVisible,
  isDraftVisible,
  isFeedVisible,
  isPostVisible,
} from "./postVisibility.ts";

const now = Date.parse("2026-11-15T12:00:00Z");
const margin = 15 * 60 * 1000;
const dev = { dev: true, scheduledPostMargin: margin, now };
const build = { dev: false, scheduledPostMargin: margin, now };

const past = new Date("2026-10-01T00:00:00Z");
const future = new Date("2027-01-01T00:00:00Z");
const published = { pubDatetime: past };
const draft = { pubDatetime: past, draft: true };
const scheduled = { pubDatetime: future };
const scheduledDraft = { pubDatetime: future, draft: true };

test("dev shows drafts, published and scheduled posts", () => {
  assert.equal(isPostVisible(published, dev), true);
  assert.equal(isPostVisible(draft, dev), true);
  assert.equal(isPostVisible(scheduled, dev), true);
  assert.equal(isPostVisible(scheduledDraft, dev), true);
});

test("builds never include drafts", () => {
  assert.equal(isPostVisible(published, build), true);
  assert.equal(isPostVisible(draft, build), false);
  assert.equal(isPostVisible(scheduledDraft, build), false);
  assert.equal(isDraftVisible(true, false), false);
  assert.equal(isDraftVisible(undefined, false), true);
});

test("scheduled posts: hidden in builds until due, minus the margin", () => {
  assert.equal(isPostVisible(scheduled, build), false);
  const soon = { pubDatetime: new Date(now + margin - 1000) };
  const later = { pubDatetime: new Date(now + margin + 1000) };
  assert.equal(isPostVisible(soon, build), true);
  assert.equal(isPostVisible(later, build), false);
  // ISO strings (raw frontmatter) behave like dates.
  assert.equal(
    isPostVisible({ pubDatetime: future.toISOString() }, build),
    false
  );
});

test("feeds never include drafts, even in dev", () => {
  assert.equal(isFeedVisible(draft, dev), false);
  assert.equal(isFeedVisible(scheduledDraft, dev), false);
  assert.equal(isFeedVisible(draft, build), false);
  assert.equal(isFeedVisible(published, dev), true);
  assert.equal(isFeedVisible(published, build), true);
  // Scheduled behaviour unchanged: in the dev feed, out of the build feed.
  assert.equal(isFeedVisible(scheduled, dev), true);
  assert.equal(isFeedVisible(scheduled, build), false);
});

test("the Draft badge shows for drafts in dev only", () => {
  assert.equal(isDraftBadgeVisible(true, true), true);
  assert.equal(isDraftBadgeVisible(true, false), false);
  assert.equal(isDraftBadgeVisible(false, true), false);
  assert.equal(isDraftBadgeVisible(undefined, true), false);
});
