import { defineSageConfig } from "astro-sage";

export default defineSageConfig({
  site: {
    url: "https://astro-sage.pages.dev/",
    title: "AstroSage",
    description:
      "A readability-first Astro blog theme: serif type, warm paper, and a pinned table of contents.",
    author: "Chintak Sheth",
    profile: "https://chintak.sh",
    ogImage: "default-og.jpg",
    lang: "en",
    timezone: "UTC",
    dir: "ltr",
  },
  home: {
    title: "AstroSage",
    intro:
      "A quiet, warm theme for long-form technical writing. Serif type set for reading, math and code that look like they belong, and a table of contents that keeps its place.",
  },
  comments: { provider: "cloudflare-d1", admins: ["github:chintak"] },
  posts: { perPage: 8, perIndex: 6, scheduledPostMargin: 15 * 60 * 1000 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: false,
    editPost: {
      enabled: true,
      url: "https://github.com/chintak/astro-sage/edit/main/apps/demo/",
    },
    search: "pagefind",
  },
  socials: [
    { name: "github", url: "https://github.com/chintak/astro-sage" },
    { name: "x", url: "https://x.com/chintaksheth" },
  ],
  shareLinks: [
    { name: "x", url: "https://x.com/intent/post?url=" },
    { name: "mail", url: "mailto:?subject=See%20this%20post&body=" },
  ],
});
