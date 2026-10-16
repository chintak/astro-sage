import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { slug } from "github-slugger";
import { parse as parseYaml } from "yaml";
import type { HastPluginDefinition, MdastPluginDefinition } from "satteri";
import { rawHtml } from "./index";

// Sätteri's nodes are plain objects; keep the plugins loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

type Post = { url: string; title: string; draft: boolean; published: number };

/**
 * Index of posts by every name a wiki-link may use: slug, path relative to
 * the posts folder (with or without extension / `index`), and title. Built
 * from the files themselves because Markdown renders before collections load.
 * Mirrors `getPostUrl`: folder posts are named by their folder, `_` folders
 * are skipped, frontmatter `slug` overrides the name.
 */
function scanPosts(postsDir: string, base: string, trailingSlash: boolean) {
  const byKey = new Map<string, Post>();
  const walk = (dir: string): string[] => {
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return [];
    }
    return entries.flatMap(name => {
      if (name.startsWith("_") || name.startsWith(".")) return [];
      const full = join(dir, name);
      if (statSync(full).isDirectory()) return walk(full);
      return /\.mdx?$/.test(name) ? [full] : [];
    });
  };
  for (const file of walk(postsDir)) {
    const rel = relative(postsDir, file).split(sep).join("/");
    const parts = rel.split("/");
    const isIndex = /^index\.mdx?$/.test(parts.at(-1)!);
    const name = isIndex ? parts.at(-2)! : parts.at(-1)!.replace(/\.mdx?$/, "");
    const dirs = (isIndex ? parts.slice(0, -2) : parts.slice(0, -1)).map(d =>
      slug(d)
    );
    let fm: Record<string, unknown> = {};
    const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, "utf8"));
    try {
      fm = (m && parseYaml(m[1])) || {};
    } catch {
      /* unreadable frontmatter: fall back to the file name */
    }
    const own = String(fm.slug ?? slug(name))
      .split("/")
      .at(-1)!;
    const path = [...dirs, own].join("/");
    const post: Post = {
      url: `${base}posts/${path}${trailingSlash ? "/" : ""}`,
      title: String(fm.title ?? name),
      draft: fm.draft === true,
      published: fm.pubDatetime
        ? new Date(String(fm.pubDatetime)).getTime()
        : 0,
    };
    const relNoExt = rel.replace(/\.mdx?$/, "");
    for (const key of [
      path,
      own,
      relNoExt,
      relNoExt.replace(/\/index$/, ""),
      String(fm.title ?? ""),
    ])
      if (key) byKey.set(key.toLowerCase(), post);
  }
  return byKey;
}

const WIKI = /\[\[([^[\]\n|#]*)(?:#([^[\]\n|]*))?(?:\|([^[\]\n]*))?\]\]/g;

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    c => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[c]};`
  );

export type WikiLinkOptions = {
  root: URL;
  postsDir: string;
  base: string;
  trailingSlash: boolean;
  /** Treat future-dated posts as published (dev), as `postFilter` does. */
  includeScheduled: boolean;
  scheduledPostMargin: number;
};

function postIndex(opts: WikiLinkOptions) {
  const postsDir = join(fileURLToPath(opts.root), opts.postsDir);
  const base = opts.base.endsWith("/") ? opts.base : `${opts.base}/`;
  // Re-scan at most once a second, so new posts resolve during `astro dev`.
  let index: Map<string, Post> | undefined;
  let scannedAt = 0;
  const posts = () => {
    if (!index || Date.now() - scannedAt > 1000) {
      index = scanPosts(postsDir, base, opts.trailingSlash);
      scannedAt = Date.now();
    }
    return index;
  };
  const find = (target: string) => {
    const t = target
      .trim()
      .replace(/\.mdx?$/, "")
      .toLowerCase();
    return posts().get(t) ?? posts().get(slug(t));
  };
  /** Why a post can't be linked right now, if it can't. */
  const unavailable = (post: Post | undefined) =>
    !post
      ? "matches no post"
      : post.draft
        ? "points to a draft"
        : !opts.includeScheduled &&
            post.published - opts.scheduledPostMargin > Date.now()
          ? "points to a post scheduled for later"
          : undefined;
  return { posts, find, unavailable };
}

/**
 * A digest of everything a wiki-link can resolve to (names, URLs, titles,
 * whether each is live). Astro caches rendered posts until their own file
 * changes; the integration clears that cache when this changes, so links
 * update when another post is published, renamed or retitled.
 */
export function wikiLinkFingerprint(opts: WikiLinkOptions) {
  const { posts, unavailable } = postIndex(opts);
  return [...posts()]
    .map(([k, p]) => `${k}=${p.url}|${p.title}|${unavailable(p) ?? "live"}`)
    .sort()
    .join("\n");
}

/**
 * Obsidian-style wiki-links between posts:
 *
 *   [[showcase]]                  → the post's title, linked
 *   [[showcase|the showcase]]     → custom text
 *   [[showcase#Callouts]]         → a heading in another post
 *   [[#Callouts]]                 → a heading in this post
 *
 * Targets match a post's slug, path or title, ignoring case. Unknown targets,
 * drafts and (in builds) scheduled posts render as plain text marked
 * `.wikilink-broken`, with a warning.
 */
export function wikiLinksPlugin(opts: WikiLinkOptions): MdastPluginDefinition {
  const { find, unavailable } = postIndex(opts);

  return {
    name: "astro-sage-wikilinks",
    text(node: Node, ctx: Node) {
      const value: string = node.value;
      if (!value.includes("[[")) return;
      const parent = ctx.parent(node);
      if (parent?.type === "link" || parent?.type === "linkReference") return;
      const mdx = ctx.sourceFormat === "mdx";
      const out: Node[] = [];
      let last = 0;
      for (const m of value.matchAll(WIKI)) {
        const [whole, rawTarget, rawHeading, rawLabel] = m;
        const target = rawTarget.trim();
        const heading = rawHeading?.trim();
        const label = rawLabel?.trim();
        if (!target && !heading) continue;
        if (m.index > last)
          out.push({ type: "text", value: value.slice(last, m.index) });
        last = m.index + whole.length;

        const hash = heading ? `#${slug(heading)}` : "";
        if (!target) {
          out.push(link(hash, label || heading!));
          continue;
        }
        const post = find(target);
        const why = unavailable(post);
        if (!post || why) {
          const file = ctx.fileURL ? fileURLToPath(ctx.fileURL) : "a post";
          console.warn(
            `[astro-sage] ${relative(process.cwd(), file)}: wiki-link [[${target}]] ${why}; rendering it as text.`
          );
          const text = label || target;
          out.push(
            rawHtml(
              `<span class="wikilink-broken" title="${esc(`No published post “${target}”`)}">${esc(text)}</span>`,
              mdx,
              true
            )
          );
          continue;
        }
        const text =
          label || (heading ? `${post.title} › ${heading}` : post.title);
        out.push(link(post.url + hash, text));
      }
      if (!out.length) return;
      if (last < value.length)
        out.push({ type: "text", value: value.slice(last) });
      ctx.insertBefore(node, out);
      ctx.removeNode(node);
    },
  } as MdastPluginDefinition;
}

const link = (url: string, text: string): Node => ({
  type: "link",
  url,
  children: [{ type: "text", value: text }],
});

/**
 * Marks prose links by destination so they can look different:
 * `.link-internal` (this site) or `.link-external` (another site, which also
 * gets rel="noopener"). In-page anchors (#…), footnotes and mailto: are left
 * as they are.
 */
export function linkKindsPlugin(opts: { site: string }): HastPluginDefinition {
  const host = new URL(opts.site).host;
  return {
    name: "astro-sage-link-kinds",
    element: {
      filter: ["a"],
      visit(node: Node, ctx: Node) {
        const href = String(node.properties?.href ?? "");
        if (!href || href.startsWith("#")) return;
        if (node.properties?.dataFootnoteRef !== undefined) return;
        let kind: "internal" | "external" | undefined;
        if (/^https?:\/\//i.test(href)) {
          kind = new URL(href).host === host ? "internal" : "external";
        } else if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) {
          kind = href.startsWith("//") ? "external" : undefined; // mailto:, tel:
        } else {
          kind = "internal"; // /path, ./path, ../path
        }
        if (!kind) return;
        const classes = [node.properties?.className ?? []]
          .flat()
          .filter(Boolean);
        ctx.setProperty(node, "className", [...classes, `link-${kind}`]);
        if (kind === "external") {
          const rel = new Set(
            [node.properties?.rel ?? []].flat().filter(Boolean)
          );
          rel.add("noopener");
          ctx.setProperty(node, "rel", [...rel]);
        }
      },
    },
  };
}
