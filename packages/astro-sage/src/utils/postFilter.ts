import type { CollectionEntry } from "astro:content";
import config from "@sage/config";
import {
  isDraftBadgeVisible,
  isDraftVisible,
  isFeedVisible,
  isPostVisible,
} from "./postVisibility";

const env = () => ({
  dev: import.meta.env.DEV,
  scheduledPostMargin: config.posts.scheduledPostMargin,
});

/**
 * Whether a post is listed/rendered: pages, lists, tags, series, prev/next.
 *
 * - Drafts: shown in dev (`astro dev`), never built
 * - Scheduled posts: shown in dev; in builds once `pubDatetime` minus the
 *   configured margin has passed
 *
 * Rules live in `postVisibility.ts`.
 */
export function postFilter({ data }: CollectionEntry<"posts">) {
  return isPostVisible(data, env());
}

/** Feeds (RSS): like `postFilter`, but never drafts, even in dev. */
export function feedFilter({ data }: CollectionEntry<"posts">) {
  return isFeedVisible(data, env());
}

/** Drafts only in dev; ignores scheduling (for routes that never did). */
export function draftFilter({ data }: CollectionEntry<"posts">) {
  return isDraftVisible(data.draft, import.meta.env.DEV);
}

/** Whether to mark a post "Draft": a draft, in dev. Never in a build. */
export function showDraftBadge(draft: boolean | undefined) {
  return isDraftBadgeVisible(draft, import.meta.env.DEV);
}
