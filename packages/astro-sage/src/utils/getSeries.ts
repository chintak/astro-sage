import type { CollectionEntry } from "astro:content";
import { slugifyStr } from "./slugify";

/** Posts in `series`, oldest first (reading order). */
export function getSeriesPosts(
  posts: CollectionEntry<"posts">[],
  series: string
): CollectionEntry<"posts">[] {
  return posts
    .filter(p => p.data.series === series)
    .sort(
      (a, b) => a.data.pubDatetime.valueOf() - b.data.pubDatetime.valueOf()
    );
}

/** All series with their posts, keyed by slug. */
export function getAllSeries(posts: CollectionEntry<"posts">[]) {
  const names = [
    ...new Set(posts.map(p => p.data.series).filter(Boolean)),
  ] as string[];
  return names
    .map(name => ({
      name,
      slug: slugifyStr(name),
      posts: getSeriesPosts(posts, name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
