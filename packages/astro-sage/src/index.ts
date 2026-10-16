import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { AstroIntegration } from "astro";
import { envField, fontProviders } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { satteri } from "@astrojs/markdown-satteri";
import expressiveCode from "astro-expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLanguageLabel } from "./markdown/code-language";
import tailwindcss from "@tailwindcss/vite";
import {
  a11yPlugin,
  breakoutImagesPlugin,
  calloutsPlugin,
  katexPlugin,
} from "./markdown";
import { diagramsPlugin } from "./diagrams/plugin";
import {
  linkKindsPlugin,
  wikiLinkFingerprint,
  wikiLinksPlugin,
  type WikiLinkOptions,
} from "./markdown/links";
import { BLOG_PATH } from "./paths";
import {
  SYNTAX_CANDIDATES,
  customizeCodeTheme,
  sageCodeThemes,
  syntaxLabSelector,
} from "./markdown/code-themes";
import type { SageConfig } from "./types/config";

export type { SageConfig } from "./types/config";
export { defineSageConfig } from "./types/config";

const srcDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * System fallbacks, used if the self-hosted faces fail to load (blocked
 * requests, strict CSP, offline). Ordered by reading quality, then reach:
 * Apple's Iowan/Charter, Windows' Palatino Linotype, Android/Linux Noto and
 * DejaVu, then Georgia/Cambria. The generic family must stay last: Astro
 * derives a metric-matched fallback face from it to avoid layout shift.
 */
export const DEFAULT_SERIF_FALLBACKS = [
  "Iowan Old Style",
  "Charter",
  "Bitstream Charter",
  "Palatino Linotype",
  "Palatino",
  "Noto Serif",
  "Georgia",
  "Cambria",
  "DejaVu Serif",
  "serif",
];
export const DEFAULT_MONO_FALLBACKS = [
  "ui-monospace",
  "SF Mono",
  "Cascadia Mono",
  "Consolas",
  "Menlo",
  "Noto Sans Mono",
  "DejaVu Sans Mono",
  "Liberation Mono",
  "monospace",
];

/** Serif faces bundled with the theme. All are variable with optical sizing. */
export const SERIF_FACES = {
  "source-serif-4": "Source Serif 4",
  literata: "Literata",
  newsreader: "Newsreader",
} as const;
export type SerifFace = keyof typeof SERIF_FACES;

function fontsourceFile(pkg: string, file: string): URL {
  const root = dirname(
    require.resolve(`@fontsource-variable/${pkg}/package.json`)
  );
  return pathToFileURL(join(root, "files", file));
}

function serifFont(
  face: SerifFace,
  opticalSizing: boolean,
  fallbacks: string[]
) {
  const axes = opticalSizing ? "opsz" : "wght";
  return {
    name: SERIF_FACES[face],
    cssVariable: "--font-serif",
    // "optional": use the webfont only if it arrives almost immediately (it's
    // preloaded); otherwise keep the readable system fallback for this page
    // view with no swap, so there's no layout shift either way.
    display: "optional" as const,
    // Astro's synthetic fallback is always Times New Roman; we prefer the
    // readable stack in DEFAULT_SERIF_FALLBACKS.
    optimizedFallbacks: false,
    provider: fontProviders.local(),
    fallbacks,
    options: {
      variants: [
        {
          src: [fontsourceFile(face, `${face}-latin-${axes}-normal.woff2`)],
          weight: "200 900",
          style: "normal" as const,
        },
        {
          src: [fontsourceFile(face, `${face}-latin-${axes}-italic.woff2`)],
          weight: "200 900",
          style: "italic" as const,
        },
      ],
    },
  };
}

const monoFont = (fallbacks: string[]) => ({
  name: "JetBrains Mono",
  cssVariable: "--font-mono",
  display: "optional" as const,
  optimizedFallbacks: false,
  provider: fontProviders.local(),
  fallbacks,
  options: {
    variants: [
      {
        src: [
          fontsourceFile(
            "jetbrains-mono",
            "jetbrains-mono-latin-wght-normal.woff2"
          ),
        ],
        weight: "100 800",
        style: "normal" as const,
      },
      {
        src: [
          fontsourceFile(
            "jetbrains-mono",
            "jetbrains-mono-latin-wght-italic.woff2"
          ),
        ],
        weight: "100 800",
        style: "italic" as const,
      },
    ],
  },
});

const ROUTES: Array<[pattern: string, entry: string]> = [
  ["/", "routes/index.astro"],
  ["/404", "routes/404.astro"],
  ["/about", "routes/about.astro"],
  ["/archives", "routes/archives/index.astro"],
  ["/og.png", "routes/og.png.ts"],
  ["/posts/[...page]", "routes/posts/[...page].astro"],
  ["/posts/[...slug]", "routes/posts/[...slug]/index.astro"],
  ["/posts/[...slug]/index.png", "routes/posts/[...slug]/index.png.ts"],
  ["/robots.txt", "routes/robots.txt.ts"],
  ["/rss.xml", "routes/rss.xml.ts"],
  ["/search", "routes/search.astro"],
  ["/series", "routes/series/index.astro"],
  ["/series/[series]", "routes/series/[series].astro"],
  ["/tags", "routes/tags/index.astro"],
  ["/tags/[tag]/[...page]", "routes/tags/[tag]/[...page].astro"],
];

const BUILD_ONLY_DEPS = [
  "playwright",
  "mermaid-isomorphic",
  "@excalidraw/utils",
  "astro-sage",
  "@tailwindcss/vite",
  "@tailwindcss/oxide",
  "tailwindcss",
  "satori",
  "sharp",
];

const COMMENT_ROUTES: Array<[pattern: string, entry: string]> = [
  ["/api/auth/[...all]", "routes/api/auth/[...all].ts"],
  ["/api/comments", "routes/api/comments/index.ts"],
  ["/api/comments/[id]", "routes/api/comments/[id].ts"],
];

/**
 * Astro only invalidates its content cache when the site's content.config
 * changes, but AstroSage's schema lives in this package. When the schema file
 * changes (e.g. a theme upgrade adds a frontmatter default), drop the cached
 * data store so entries are re-parsed with the new schema.
 */
function invalidateStaleContentCache(
  root: URL,
  cacheDir: URL,
  /** Anything else rendered output depends on (e.g. wiki-link targets). */
  extra = ""
) {
  const schema = readFileSync(join(srcDir, "content.ts"));
  const digest = createHash("sha256")
    .update(schema)
    .update(extra)
    .digest("hex")
    .slice(0, 16);
  const marker = new URL("astro-sage-schema", cacheDir);
  const previous = existsSync(marker)
    ? readFileSync(marker, "utf8")
    : undefined;
  if (previous === digest) return;
  for (const store of [
    new URL("data-store.json", cacheDir),
    new URL(".astro/data-store.json", root),
  ]) {
    rmSync(store, { force: true });
  }
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(marker, digest);
}

/**
 * AstroSage theme integration.
 *
 * ```ts
 * export default defineConfig({ integrations: [astroSage(sageConfig)] });
 * ```
 */
export default function astroSage(config: SageConfig): AstroIntegration {
  const face: SerifFace = config.typography?.serif ?? "newsreader";
  const virtualId = "virtual:astro-sage/user-config";

  return {
    name: "astro-sage",
    hooks: {
      "astro:config:setup": ({
        updateConfig,
        injectRoute,
        command,
        config: astroConfig,
      }) => {
        const wikiLinks: WikiLinkOptions = {
          root: astroConfig.root,
          postsDir: BLOG_PATH,
          base: astroConfig.base,
          trailingSlash: astroConfig.trailingSlash !== "never",
          // Same rule as postFilter: dev shows scheduled posts, builds don't.
          includeScheduled: command === "dev",
          scheduledPostMargin:
            config.posts?.scheduledPostMargin ?? 15 * 60 * 1000,
        };
        invalidateStaleContentCache(
          astroConfig.root,
          astroConfig.cacheDir,
          wikiLinkFingerprint(wikiLinks)
        );

        // Top-level public/ files, so layouts can link only icons that exist.
        const publicFiles = existsSync(astroConfig.publicDir)
          ? readdirSync(astroConfig.publicDir)
          : [];

        updateConfig({
          site: astroConfig.site ?? config.site.url,
          i18n: {
            locales: [config.site.lang ?? "en"],
            defaultLocale: config.site.lang ?? "en",
            routing: {
              prefixDefaultLocale: false,
              redirectToDefaultLocale: false,
              fallbackType: "redirect",
            },
          },
          markdown: {
            processor: satteri({
              features: {
                math: true,
                directive: true,
                superscript: true,
                subscript: true,
                smartPunctuation: true,
              },
              // Our plugins are typed against `satteri`; the processor re-exports its own copy.
              mdastPlugins: [
                // Mermaid / Excalidraw → inline SVG at build time, cached in
                // <site>/.sage-cache/diagrams (commit it; CI then needs no browser).
                diagramsPlugin({
                  cacheDir: fileURLToPath(
                    new URL(".sage-cache/diagrams/", astroConfig.root)
                  ),
                }),
                katexPlugin,
                calloutsPlugin,
                wikiLinksPlugin(wikiLinks),
              ] as never[],
              hastPlugins: [
                a11yPlugin,
                breakoutImagesPlugin,
                linkKindsPlugin({ site: astroConfig.site ?? config.site.url }),
              ] as never[],
            }),
          },
          fonts: [
            serifFont(
              face,
              config.typography?.opticalSizing ?? false,
              config.typography?.fallbacks?.serif ?? DEFAULT_SERIF_FALLBACKS
            ),
            monoFont(
              config.typography?.fallbacks?.mono ?? DEFAULT_MONO_FALLBACKS
            ),
          ],
          env: {
            schema: {
              PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
                access: "public",
                context: "client",
                optional: true,
              }),
            },
          },
          integrations: [
            expressiveCode({
              // SAGE_SYNTAX_LAB=1 bundles every candidate pair for side-by-side comparison.
              themes: process.env.SAGE_SYNTAX_LAB
                ? SYNTAX_CANDIDATES.flatMap(([, light, dark]) => [light, dark])
                : [...sageCodeThemes],
              customizeTheme: customizeCodeTheme,
              themeCssSelector: process.env.SAGE_SYNTAX_LAB
                ? syntaxLabSelector
                : theme =>
                    `[data-theme="${theme.type === "dark" ? "dark" : "light"}"]`,
              useDarkModeMediaQuery: false,
              plugins: [
                pluginLineNumbers(),
                pluginCollapsibleSections(),
                pluginLanguageLabel(),
              ],
              defaultProps: {
                showLineNumbers: false,
                overridesByLang: {
                  "bash,sh,shell,zsh,console": { frame: "terminal" },
                },
              },
              styleOverrides: {
                codeFontFamily: "var(--font-code)",
                uiFontFamily: "var(--font-ui)",
                codeFontSize: "0.875rem",
                codeLineHeight: "1.65",
                borderRadius: "0.375rem",
                // Hairline frame, no fill: code sits on the paper inside a 1px border.
                borderColor: "var(--border)",
                // "Hairline": no fill, a 1px frame; code sits on the page paper.
                // codeBackground stays the theme bg (= page colour) so contrast
                // correction is computed against the real paper; prose.css then
                // makes the block itself transparent.
                frames: {
                  shadowColor: "transparent",
                  frameBoxShadowCssValue: "none",
                  editorActiveTabIndicatorBottomColor: "var(--accent)",
                  editorBackground: "transparent",
                  editorActiveTabBackground: "transparent",
                  terminalBackground: "transparent",
                  terminalTitlebarBackground: "transparent",
                  terminalTitlebarBorderBottomColor: "var(--border)",
                  editorTabBarBackground: "transparent",
                  editorTabBarBorderBottomColor: "var(--border)",
                },
                textMarkers: {
                  markBackground:
                    "color-mix(in oklab, var(--mark) 30%, transparent)",
                  markBorderColor:
                    "color-mix(in oklab, var(--callout-warning) 60%, transparent)",
                  // Diff lines: strong colour in the bar and +/- indicator; tints kept light
                  // enough that tokens on them stay >= 4.5:1.
                  insBackground:
                    "color-mix(in oklab, var(--diff-ins) var(--diff-ins-tint), transparent)",
                  insBorderColor: "var(--diff-ins)",
                  insDiffIndicatorColor: "var(--diff-ins)",
                  delBackground:
                    "color-mix(in oklab, var(--diff-del) var(--diff-del-tint), transparent)",
                  delBorderColor: "var(--diff-del)",
                  delDiffIndicatorColor: "var(--diff-del)",
                  lineMarkerAccentWidth: "0.25rem",
                },
              },
            }),
            mdx(),
            sitemap({
              filter: page =>
                config.features?.showArchives !== false ||
                !page.endsWith("/archives/"),
            }),
          ],
          vite: {
            plugins: [
              tailwindcss(),
              {
                name: "astro-sage:user-config",
                resolveId: id =>
                  id === virtualId ? `\0${virtualId}` : undefined,
                load: id =>
                  id === `\0${virtualId}`
                    ? `export default ${JSON.stringify(config)};\nexport const publicFiles = ${JSON.stringify(publicFiles)};`
                    : undefined,
              },
            ],
            resolve: { alias: { "@sage": srcDir } },
            // Build-time tooling (Tailwind's native binary, fonts, Satori) must
            // never be pre-bundled into the Workers runtime.
            optimizeDeps: { exclude: BUILD_ONLY_DEPS },
            ssr: { optimizeDeps: { exclude: BUILD_ONLY_DEPS } },
          },
        });

        for (const [pattern, entry] of ROUTES) {
          injectRoute({ pattern, entrypoint: join(srcDir, entry) });
        }

        if (config.comments?.provider === "cloudflare-d1") {
          for (const [pattern, entry] of COMMENT_ROUTES) {
            injectRoute({ pattern, entrypoint: join(srcDir, entry) });
          }
        }
      },
      "astro:config:done": ({ config: astroConfig }) => {
        if (
          config.comments?.provider === "cloudflare-d1" &&
          astroConfig.adapter?.name !== "@astrojs/cloudflare"
        ) {
          throw new Error(
            'astro-sage: comments.provider "cloudflare-d1" needs the Cloudflare adapter. Add `adapter: cloudflare()` from "@astrojs/cloudflare" to astro.config, or set comments.provider to false.'
          );
        }
      },
    },
  };
}
