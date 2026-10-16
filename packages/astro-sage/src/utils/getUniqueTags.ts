import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { slugifyStr } from "./slugify";

type Tag = {
  tag: string;
  tagName: string;
  /** Number of published posts with this tag. */
  count: number;
};

/**
 * Builds a de-duplicated, sorted tag list from posts.
 *
 * - Drafts and scheduled posts are excluded via `postFilter()`
 * - `tag` is the slug used in URLs; `tagName` is the original label for display
 * - Uniqueness is based on the slug (so differently-cased labels collapse)
 * - `count` counts each post once per tag
 */
export function getUniqueTags(posts: CollectionEntry<"posts">[]) {
  const tags = new Map<string, Tag>();
  for (const post of posts.filter(postFilter)) {
    const seen = new Set<string>();
    for (const tagName of post.data.tags) {
      const tag = slugifyStr(tagName);
      if (seen.has(tag)) continue;
      seen.add(tag);
      const entry = tags.get(tag);
      if (entry) entry.count += 1;
      else tags.set(tag, { tag, tagName, count: 1 });
    }
  }
  return [...tags.values()].sort((a, b) => a.tag.localeCompare(b.tag));
}

let tagCounts: Promise<Map<string, number>> | undefined;

/** Published-post count per tag slug, computed once per build. */
export function getTagCounts() {
  if (import.meta.env.DEV) tagCounts = undefined; // reflect edits while developing
  tagCounts ??= import("astro:content")
    .then(({ getCollection }) => getCollection("posts"))
    .then(posts => new Map(getUniqueTags(posts).map(t => [t.tag, t.count])));
  return tagCounts;
}
