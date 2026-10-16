/**
 * Internal resolved configuration used throughout the codebase.
 *
 * Prefer editing your site's `sage.config.ts` instead of this file. This module exists to
 * apply defaults and expose a fully-resolved config shape (`ResolvedSageConfig`).
 */
import userConfig from "virtual:astro-sage/user-config";
import type { ResolvedSageConfig } from "./types/config";
import { PUBLIC_GOOGLE_SITE_VERIFICATION } from "astro:env/client";

const DEFAULT_OG_IMAGE = "default-og.jpg";

export const DEFAULT_SHARE_LINKS = [
  { name: "x", url: "https://x.com/intent/post?url={url}&text={title}" },
  {
    name: "linkedin",
    url: "https://www.linkedin.com/sharing/share-offsite/?url={url}",
  },
  {
    name: "bluesky",
    url: "https://bsky.app/intent/compose?text={title}%20{url}",
  },
  {
    name: "reddit",
    url: "https://www.reddit.com/submit?url={url}&title={title}",
  },
  {
    name: "hackernews",
    url: "https://news.ycombinator.com/submitlink?u={url}&t={title}",
  },
  { name: "mail", url: "mailto:?subject={title}&body={url}" },
];

const config: ResolvedSageConfig = {
  site: {
    ...userConfig.site,
    ogImage: userConfig.site.ogImage ?? DEFAULT_OG_IMAGE,
    lang: userConfig.site.lang ?? "en",
    timezone: userConfig.site.timezone ?? "UTC",
    dir: userConfig.site.dir ?? "ltr",
    googleVerification:
      userConfig.site.googleVerification || PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  citation: {
    ...userConfig.citation,
    enabled: userConfig.citation?.enabled ?? true,
  },
  typography: { serif: userConfig.typography?.serif ?? "newsreader" },
  home: userConfig.home ?? {},
  comments: userConfig.comments ?? { provider: false },
  posts: {
    perPage: userConfig.posts?.perPage ?? 4,
    perIndex: userConfig.posts?.perIndex ?? 4,
    scheduledPostMargin:
      userConfig.posts?.scheduledPostMargin ?? 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: userConfig.features?.lightAndDarkMode ?? true,
    dynamicOgImage: userConfig.features?.dynamicOgImage ?? true,
    showArchives: userConfig.features?.showArchives ?? true,
    showBackButton: userConfig.features?.showBackButton ?? true,
    editPost: userConfig.features?.editPost ?? { enabled: false },
    search: userConfig.features?.search ?? "pagefind",
  },
  socials: userConfig.socials ?? [],
  shareLinks: userConfig.shareLinks ?? DEFAULT_SHARE_LINKS,
};

export default config;
