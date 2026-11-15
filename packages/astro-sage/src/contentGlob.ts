import { glob } from "astro/loaders";

/**
 * Glob patterns for the posts and pages collections, relative to the
 * collection base. A file is ignored when any path segment under the base
 * (a folder or the file name) starts with `_`: `_template/index.md`,
 * `_drafts/2026/foo.md` and `notes/_scratch.md` never load, while
 * `my_post.md` and `a_b/index.md` do.
 *
 * Astro's glob loader passes the array to tinyglobby for the initial scan
 * and splits the `!` patterns into picomatch's `ignore` for the dev watcher,
 * so the rule holds in `astro dev` and `astro build` alike.
 */
export const CONTENT_GLOB_PATTERN: string[] = [
  "**/*.{md,mdx}",
  // `_x.md`, `a/b/_c.mdx`
  "!**/_*",
  // `_dir/index.md`, `a/_dir/b/c.md`
  "!**/_*/**",
];

/** The glob loader both collections use; `base` is relative to the site root. */
export function contentGlob(base: string) {
  return glob({ pattern: CONTENT_GLOB_PATTERN, base });
}
