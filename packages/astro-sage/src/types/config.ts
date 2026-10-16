interface SiteConfig {
  /** Deployed URL of the site, e.g. "https://example.com" */
  url: string;
  /** Blog title shown in header and meta tags */
  title: string;
  /** Short description used in SEO meta and RSS feed */
  description: string;
  /** Default post author name */
  author: string;
  /** Author profile URL (used in structured data) */
  profile?: string;
  /** Fallback OG image filename in /public, e.g. "og.jpg" */
  ogImage?: string;
  /** HTML lang attribute, defaults to "en" */
  lang?: string;
  /** IANA timezone for post dates, e.g. "Asia/Bangkok" */
  timezone?: string;
  /** Text direction */
  dir?: "ltr" | "rtl" | "auto";
  /** Google Search Console verification meta tag value */
  googleVerification?: string;
}

interface PostsConfig {
  /** Posts per page on paginated listing pages */
  perPage?: number;
  /** Posts shown on the index/home page */
  perIndex?: number;
  /**
   * Scheduled posts within this window (ms) of their pubDatetime
   * are shown as published. Defaults to 15 minutes.
   */
  scheduledPostMargin?: number;
}

interface FeaturesConfig {
  /** Enable light/dark mode toggle. Defaults to true. */
  lightAndDarkMode?: boolean;
  /**
   * Generate dynamic OG images per post and provide `/og.png` when the static
   * `public/{site.ogImage}` file is absent. When false, that file is required
   * for the default layout OG image (build fails if missing).
   */
  dynamicOgImage?: boolean;
  /** Show the /archives page and link it in nav. Defaults to true. */
  showArchives?: boolean;
  /** Show back button on post detail pages. Defaults to true. */
  showBackButton?: boolean;
  /** "Edit page" link shown on post detail pages. */
  editPost?:
    | {
        enabled: true;
        /** Base URL for the edit link, e.g. GitHub edit URL */
        url: string;
      }
    | { enabled: false };
  /**
   * Search provider. "pagefind" ships in the base template.
   * Set to false to disable search entirely.
   */
  search?: "pagefind" | false;
}

interface SocialLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "github" → src/assets/icons/socials/github.svg
   */
  name: string;
  url: string;
  /**
   * Accessible label for the icon link (aria-label, title attribute).
   * Auto-generated if omitted: "{site.title} on GitHub", "Send an email to {site.title}", etc.
   * Override when the default wording doesn't fit.
   */
  linkTitle?: string;
}

interface ShareLink {
  /**
   * Must match an SVG filename in src/assets/icons/socials/.
   * e.g. "bluesky" → src/assets/icons/socials/bluesky.svg
   */
  name: string;
  /**
   * Share URL. Use `{url}` and `{title}` placeholders (both are encoded), e.g.
   * "https://news.ycombinator.com/submitlink?u={url}&t={title}". Without
   * placeholders, the encoded post URL is appended (legacy behaviour).
   */
  url: string;
  /** Accessible label; defaults to "Share on <Platform>". */
  linkTitle?: string;
}

interface TypographyConfig {
  /**
   * Reading serif for body and headings. Defaults to "newsreader".
   * All bundled faces are variable (optical sizing optional).
   */
  serif?: "source-serif-4" | "literata" | "newsreader";
  /**
   * Ship the optical-size axis (finer headings, sturdier small text).
   * Costs ~70 KB more font per style and ~5 points of mobile Lighthouse
   * performance on slow connections. Defaults to false.
   */
  opticalSizing?: boolean;
  /**
   * System font stacks used if the self-hosted faces can't load. End each
   * with a generic family (serif / monospace). Defaults: see
   * DEFAULT_SERIF_FALLBACKS / DEFAULT_MONO_FALLBACKS.
   */
  fallbacks?: { serif?: string[]; mono?: string[] };
}

interface HomeConfig {
  /** Heading on the home page. Defaults to site.title. */
  title?: string;
  /** Intro paragraph (plain text or inline HTML) on the home page. */
  intro?: string;
}

/** Light and dark theme names (or theme CSS URLs) for an embedded widget. */
interface EmbedTheme {
  light?: string;
  dark?: string;
}

/**
 * Comments. `false` (default) renders no comments UI and ships no JS.
 *
 * - `"utterances"`: GitHub Issues via utteranc.es. Static, host-agnostic; install
 *   the utterances GitHub app on `repo`. GitHub sign-in only.
 * - `"giscus"`: GitHub Discussions via giscus.app. Static, host-agnostic; get
 *   the ids from https://giscus.app. Reactions, replies, custom theme CSS.
 */
type CommentsConfig =
  | { provider: false }
  | {
      provider: "utterances";
      /** "owner/name" of a public repo with the utterances app installed. */
      repo: string;
      /** How posts map to issues. Defaults to "pathname". */
      issueTerm?: "pathname" | "url" | "title" | "og:title";
      /** Label added to new issues, e.g. "comments". */
      label?: string;
      /** utterances themes. Defaults: github-light / gruvbox-dark. */
      theme?: EmbedTheme;
    }
  | {
      provider: "giscus";
      /** "owner/name" of a public repo with Discussions and the giscus app. */
      repo: string;
      repoId: string;
      category: string;
      categoryId: string;
      /** How posts map to discussions. Defaults to "pathname". */
      mapping?: "pathname" | "url" | "title" | "og:title";
      /** Show reactions on the post. Defaults to true. */
      reactions?: boolean;
      /** Comment box above or below the thread. Defaults to "bottom". */
      inputPosition?: "top" | "bottom";
      /** giscus theme names or CSS URLs. Defaults: gruvbox_light / gruvbox_dark. */
      theme?: EmbedTheme;
    };

interface CitationConfig {
  /** Show the "Cite this post" block (text + BibTeX). Defaults to true. */
  enabled?: boolean;
  /** Name as it should appear in citations, e.g. "Sheth, Chintak". Defaults to "Last, First" of the post author. */
  author?: string;
  /** Publication / journal field. Defaults to the site hostname. */
  publication?: string;
}

export type { CommentsConfig, EmbedTheme };

export interface SageConfig {
  site: SiteConfig;
  citation?: CitationConfig;
  typography?: TypographyConfig;
  home?: HomeConfig;
  comments?: CommentsConfig;
  posts?: PostsConfig;
  features?: FeaturesConfig;
  /** Social profile links shown in header/footer */
  socials?: SocialLink[];
  /** Share links shown on post detail pages */
  shareLinks?: ShareLink[];
}

type ResolvedSiteConfig = Required<
  Pick<
    SiteConfig,
    | "url"
    | "title"
    | "description"
    | "author"
    | "lang"
    | "timezone"
    | "dir"
    | "ogImage"
  >
> &
  Pick<SiteConfig, "profile" | "googleVerification">;

export interface ResolvedSageConfig {
  site: ResolvedSiteConfig;
  citation: { enabled: boolean } & Omit<CitationConfig, "enabled">;
  typography: Required<Pick<TypographyConfig, "serif">> & TypographyConfig;
  home: HomeConfig;
  comments: CommentsConfig;
  posts: Required<PostsConfig>;
  features: Required<FeaturesConfig>;
  socials: SocialLink[];
  shareLinks: ShareLink[];
}

/**
 * Type helper for astro-paper.config.ts.
 * Provides full IntelliSense without any runtime overhead.
 */
export function defineSageConfig(config: SageConfig): SageConfig {
  return config;
}
