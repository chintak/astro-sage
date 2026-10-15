import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/** Where posts live, relative to the site root. */
export const BLOG_PATH = "src/content/posts";

/**
 * Content collections AstroSage's routes read from. Re-export from your
 * site's `src/content.config.ts`:
 *
 * ```ts
 * import { defineSageCollections } from "astro-sage/content";
 * export const collections = defineSageCollections({ author: "Ada" });
 * ```
 */
export function defineSageCollections({ author }: { author: string }) {
  const posts = defineCollection({
    loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
    schema: ({ image }) =>
      z.object({
        author: z.string().default(author),
        pubDatetime: z.date(),
        modDatetime: z.date().optional().nullable(),
        title: z.string(),
        featured: z.boolean().optional(),
        draft: z.boolean().optional(),
        tags: z.array(z.string()).default(["others"]),
        /** Groups posts into an ordered series (ordered by pubDatetime). */
        series: z.string().optional(),
        ogImage: image().or(z.string()).optional(),
        description: z.string(),
        canonicalURL: z.string().optional(),
        hideEditPost: z.boolean().optional(),
        timezone: z.string().optional(),
        /** Show the table of contents rail. */
        toc: z.boolean().default(true),
        /** Load KaTeX styles. Set false on posts without math. */
        math: z.boolean().default(true),
        /** Show comments (when a comments provider is configured). */
        comments: z.boolean().default(true),
      }),
  });

  const pages = defineCollection({
    loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      ogImage: z.string().optional(),
      canonicalURL: z.string().optional(),
    }),
  });

  return { posts, pages };
}
