import { existsSync, readdirSync } from "node:fs";
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
import tailwindcss from "@tailwindcss/vite";
import { a11yPlugin, calloutsPlugin, katexPlugin } from "./markdown";
import { customizeCodeTheme, sageCodeThemes } from "./markdown/code-themes";
import type { SageConfig } from "./types/config";

export type { SageConfig } from "./types/config";
export { defineSageConfig } from "./types/config";

const srcDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

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

function serifFont(face: SerifFace, opticalSizing: boolean) {
  const axes = opticalSizing ? "opsz" : "wght";
  return {
    name: SERIF_FACES[face],
    cssVariable: "--font-serif",
    provider: fontProviders.local(),
    fallbacks: ["Georgia", "serif"],
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

const monoFont = {
  name: "JetBrains Mono",
  cssVariable: "--font-mono",
  provider: fontProviders.local(),
  fallbacks: ["ui-monospace", "monospace"],
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
};

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
 * AstroSage theme integration.
 *
 * ```ts
 * export default defineConfig({ integrations: [astroSage(sageConfig)] });
 * ```
 */
export default function astroSage(config: SageConfig): AstroIntegration {
  const face: SerifFace = config.typography?.serif ?? "source-serif-4";
  const virtualId = "virtual:astro-sage/user-config";

  return {
    name: "astro-sage",
    hooks: {
      "astro:config:setup": ({
        updateConfig,
        injectRoute,
        config: astroConfig,
      }) => {
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
              mdastPlugins: [katexPlugin, calloutsPlugin] as never[],
              hastPlugins: [a11yPlugin] as never[],
            }),
          },
          fonts: [
            serifFont(face, config.typography?.opticalSizing ?? false),
            monoFont,
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
              themes: [...sageCodeThemes],
              customizeTheme: customizeCodeTheme,
              themeCssSelector: theme =>
                `[data-theme="${theme.type === "dark" ? "dark" : "light"}"]`,
              useDarkModeMediaQuery: false,
              plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
              defaultProps: {
                showLineNumbers: false,
                overridesByLang: {
                  "bash,sh,shell,zsh,console": { frame: "terminal" },
                },
              },
              styleOverrides: {
                codeFontFamily: "var(--font-mono)",
                uiFontFamily: "var(--font-serif)",
                codeFontSize: "0.875rem",
                codeLineHeight: "1.65",
                borderRadius: "0.375rem",
                borderColor: "var(--border)",
                frames: {
                  shadowColor: "transparent",
                  frameBoxShadowCssValue: "none",
                  editorActiveTabIndicatorBottomColor: "var(--accent)",
                  terminalTitlebarBackground: "var(--bg-raised)",
                  terminalTitlebarBorderBottomColor: "var(--border)",
                  editorTabBarBackground: "var(--bg-raised)",
                  editorTabBarBorderBottomColor: "var(--border)",
                },
                textMarkers: {
                  markBackground:
                    "color-mix(in oklab, var(--mark) 30%, transparent)",
                  markBorderColor:
                    "color-mix(in oklab, var(--callout-warning) 60%, transparent)",
                  insBackground:
                    "color-mix(in oklab, var(--callout-tip) 11%, transparent)",
                  insBorderColor: "var(--callout-tip)",
                  insDiffIndicatorColor: "var(--callout-tip)",
                  delBackground:
                    "color-mix(in oklab, var(--callout-caution) 10%, transparent)",
                  delBorderColor: "var(--callout-caution)",
                  delDiffIndicatorColor: "var(--callout-caution)",
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
