import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { fetchShare } from "./excalidraw-share";
import { mermaidThemes } from "./palette";

const require = createRequire(import.meta.url);

/*
 * Load heavy, optional build tools with Node's own loaders. Plain `import()`
 * here would go through Vite's config-time module runner, which is closed by
 * the time Markdown is rendered.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const nativeImport = new Function("s", "return import(s)") as <T>(
  s: string
) => Promise<T>;
const loadPlaywright = (): typeof import("playwright") => require("playwright");
const loadMermaid = () =>
  nativeImport<typeof import("mermaid-isomorphic")>(
    pathToFileURL(require.resolve("mermaid-isomorphic")).href
  );
/** Bump when render output changes so stale cache entries are ignored. */
const RENDER_VERSION = "4";

export type Rendered = {
  light: string;
  dark: string;
  title?: string;
  description?: string;
};

export type DiagramOptions = {
  /** Where rendered SVGs are cached. Commit this folder so CI never needs a browser. */
  cacheDir: string;
};

const hash = (...parts: string[]) =>
  createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 16);

async function cached(
  opts: DiagramOptions,
  key: string,
  render: () => Promise<Rendered>
): Promise<Rendered> {
  const file = join(opts.cacheDir, `${key}.json`);
  if (existsSync(file)) return JSON.parse(await readFile(file, "utf8"));
  const out = await render();
  await mkdir(opts.cacheDir, { recursive: true });
  await writeFile(file, JSON.stringify(out));
  return out;
}

/** Playwright launch options: its own Chromium if installed, else system Chrome. */
async function launchOptions() {
  const { chromium } = loadPlaywright();
  const own = chromium.executablePath();
  return existsSync(own) ? {} : { channel: "chrome" as const };
}

// ---------------------------------------------------------------- Mermaid

let mermaidRenderer:
  | ReturnType<typeof import("mermaid-isomorphic").createMermaidRenderer>
  | undefined;
let fontCss: string | undefined;

async function mermaidFontCss() {
  if (fontCss) return fontCss;
  const dir = join(
    dirname(
      require.resolve("@fontsource-variable/jetbrains-mono/package.json")
    ),
    "files"
  );
  const css = ["normal", "italic"]
    .map(
      style => `@font-face { font-family: "JetBrains Mono"; font-style: ${style};
  font-weight: 100 800; src: url("${pathToFileURL(join(dir, `jetbrains-mono-latin-wght-${style}.woff2`))}") format("woff2"); }`
    )
    .join("\n");
  // Machine-specific file:// paths: keep this out of the committed cache.
  const file = join(tmpdir(), "astro-sage-mermaid-fonts.css");
  await writeFile(file, css);
  return (fontCss = pathToFileURL(file).href);
}

export async function renderMermaid(source: string, opts: DiagramOptions) {
  const key = `mermaid-${hash(RENDER_VERSION, JSON.stringify(mermaidThemes), source)}`;
  return cached(opts, key, async () => {
    const { createMermaidRenderer } = await loadMermaid();
    mermaidRenderer ??= createMermaidRenderer({
      launchOptions: await launchOptions(),
    });
    const css = await mermaidFontCss();
    const render = async (mode: "light" | "dark") => {
      const [result] = await mermaidRenderer!([source], {
        css,
        prefix: `${key}-${mode}`,
        mermaidConfig: {
          // mermaid-isomorphic defaults this to Arial, overriding themeVariables.
          fontFamily: mermaidThemes[mode].fontFamily,
          theme: "base",
          themeVariables: mermaidThemes[mode],
          htmlLabels: false,
          flowchart: { htmlLabels: false, curve: "basis", padding: 12 },
          sequence: {
            mirrorActors: false,
            actorFontFamily: mermaidThemes[mode].fontFamily,
            noteFontFamily: mermaidThemes[mode].fontFamily,
            messageFontFamily: mermaidThemes[mode].fontFamily,
          },
        },
      });
      if (result.status === "rejected") throw result.reason;
      // Some elements (e.g. sequence-number badges) hard-code a font attribute.
      const svg = result.value.svg.replace(
        /font-family="[^"]*"/g,
        `font-family='${mermaidThemes[mode].fontFamily}'`
      );
      return { ...result.value, svg };
    };
    const light = await render("light");
    const dark = await render("dark");
    return {
      light: light.svg,
      dark: dark.svg,
      title: light.title,
      description: light.description,
    };
  });
}

// ------------------------------------------------------------- Excalidraw

let excalidrawPage: Promise<import("playwright").Page> | undefined;

async function getExcalidrawPage() {
  excalidrawPage ??= (async () => {
    const { chromium } = loadPlaywright();
    const browser = await chromium.launch(await launchOptions());
    const page = await browser.newPage();
    // The package's exports hide package.json; its entry lives in dist/prod.
    const dist = dirname(require.resolve("@excalidraw/utils"));
    await page.route("http://sage.local/**", route => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/")
        return route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><body></body>",
        });
      return route.fulfill({ path: join(dist, pathname) });
    });
    await page.goto("http://sage.local/");
    await page.evaluate(`window.EXCALIDRAW_ASSET_PATH = "http://sage.local/";`);
    process.once("beforeExit", () => void browser.close());
    return page;
  })();
  return excalidrawPage;
}

/** Renders a `.excalidraw` scene (JSON) to SVG for both palettes. */
export async function renderExcalidraw(scene: string, opts: DiagramOptions) {
  const key = `excalidraw-${hash(RENDER_VERSION, scene)}`;
  return cached(opts, key, async () => {
    const page = await getExcalidrawPage();
    // Passed as a string: a function would be rewritten by Vite's SSR transform
    // (import() → __vite_ssr_dynamic_import__), which doesn't exist in the browser.
    const render = (dark: boolean) =>
      page.evaluate<string>(`(async () => {
        const data = JSON.parse(${JSON.stringify(scene)});
        const { exportToSvg } = await import("http://sage.local/index.js");
        const svg = await exportToSvg({
          data: {
            elements: (data.elements ?? []).filter(e => !e.isDeleted),
            appState: {
              ...(data.appState ?? {}),
              viewBackgroundColor: "transparent",
              exportBackground: false,
              exportPadding: 16,
              exportWithDarkMode: ${dark},
              exportEmbedScene: false,
            },
            files: data.files ?? {},
          },
        });
        return svg.outerHTML;
      })()`);
    return { light: await render(false), dark: await render(true) };
  });
}

/** Cleans an exported `.excalidraw.svg` file (already SVG; no browser needed). */
export function prepareExcalidrawSvg(svg: string): Rendered {
  // Drop the opaque background so diagrams sit on the page paper.
  const light = svg.replace(/<rect[^>]*fill="#ffffff"[^>]*\/>/, "");
  return { light, dark: light };
}

/**
 * Accepts a saved scene (`{ type: "excalidraw", elements, ... }`) or Excalidraw's
 * "Copy to clipboard as JSON" payload (`{ type: "excalidraw/clipboard", ... }`).
 */
export function normalizeScene(text: string): string {
  const data = JSON.parse(text);
  if (!Array.isArray(data.elements))
    throw new Error("Excalidraw JSON has no elements");
  return JSON.stringify({
    type: "excalidraw",
    version: 2,
    elements: data.elements,
    appState: data.appState ?? {},
    files: data.files ?? {},
  });
}

/** Fetches + decrypts an excalidraw.com share link once; later builds read the cache. */
export async function sceneFromShareLink(url: string, opts: DiagramOptions) {
  const file = join(opts.cacheDir, `share-${hash(url)}.json`);
  if (existsSync(file)) return readFile(file, "utf8");
  const scene = normalizeScene(await fetchShare(url));
  await mkdir(opts.cacheDir, { recursive: true });
  await writeFile(file, scene);
  return scene;
}
