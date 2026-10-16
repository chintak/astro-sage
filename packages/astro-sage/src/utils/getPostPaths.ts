import { getRelativeLocaleUrl } from "astro:i18n";
import { BLOG_PATH } from "@sage/content";
import { slugifyStr } from "./slugify";
import config from "@sage/config";

function getPostPathSegments(filePath: string | undefined): string[] {
  const parts =
    filePath
      ?.replace(BLOG_PATH, "")
      .split("/")
      .filter(path => path !== "") ?? [];
  // A folder post (`my-post/index.md`) is named by its folder, which the
  // collection id already carries; drop it so the URL isn't doubled.
  const dirs = /^index\.mdx?$/.test(parts.at(-1) ?? "")
    ? parts.slice(0, -2)
    : parts.slice(0, -1);
  return dirs
    .filter(path => !path.startsWith("_"))
    .map(segment => slugifyStr(segment));
}

function getIdSlug(id: string): string {
  const postId = id.split("/");
  return postId.length > 0 ? String(postId[postId.length - 1]) : id;
}

function getPostSlugPath(id: string, filePath: string | undefined): string {
  const pathSegments = getPostPathSegments(filePath);
  const slug = getIdSlug(id);
  return pathSegments.length > 0
    ? [...pathSegments, slug].join("/")
    : String(slug);
}

/**
 * Returns the slug-only path for use as a route param in `getStaticPaths`.
 * No base prefix, no locale — Astro handles those at a higher level.
 * e.g. `/examples/my-post`
 */
export function getPostSlug(id: string, filePath: string | undefined): string {
  return `/${getPostSlugPath(id, filePath)}`;
}

/**
 * Returns a fully navigable URL for use in `<a href>` and RSS links.
 * Applies both locale routing and the configured Astro base via
 * `getRelativeLocaleUrl`.
 * e.g. `/posts/my-post` or `/en/posts/my-post`
 */
export function getPostUrl(
  id: string,
  filePath: string | undefined,
  locale: string | undefined = config.site.lang
): string {
  return getRelativeLocaleUrl(locale, `posts/${getPostSlugPath(id, filePath)}`);
}
