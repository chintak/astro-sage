/**
 * Mounts a GitHub-backed comments widget (utterances or giscus). Both are
 * client-side embeds, so comments work on any static host. Loaded lazily by
 * Comments.astro; keeps the widget's theme in sync with the site's toggle.
 */
import type { CommentsConfig } from "../types/config";

type Embed = Extract<CommentsConfig, { provider: "utterances" | "giscus" }>;

const DEFAULT_THEME = {
  utterances: { light: "github-light", dark: "gruvbox-dark" },
  giscus: { light: "gruvbox_light", dark: "gruvbox_dark" },
} as const;

const ORIGIN = {
  utterances: "https://utteranc.es",
  giscus: "https://giscus.app",
} as const;

const mode = () =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

export function mount(root: HTMLElement, cfg: Embed) {
  const themes = { ...DEFAULT_THEME[cfg.provider], ...cfg.theme };
  const theme = () => themes[mode()];

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  const attrs: Record<string, string> =
    cfg.provider === "utterances"
      ? {
          repo: cfg.repo,
          "issue-term": cfg.issueTerm ?? "pathname",
          theme: theme(),
          ...(cfg.label ? { label: cfg.label } : {}),
        }
      : {
          "data-repo": cfg.repo,
          "data-repo-id": cfg.repoId,
          "data-category": cfg.category,
          "data-category-id": cfg.categoryId,
          "data-mapping": cfg.mapping ?? "pathname",
          "data-strict": "0",
          "data-reactions-enabled": cfg.reactions === false ? "0" : "1",
          "data-emit-metadata": "0",
          "data-input-position": cfg.inputPosition ?? "bottom",
          "data-theme": theme(),
          "data-lang": document.documentElement.lang || "en",
          "data-loading": "lazy",
        };
  for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v);
  script.src = `${ORIGIN[cfg.provider]}/client.js`;
  root.replaceChildren(script);

  // Follow the light/dark toggle without reloading the thread.
  new MutationObserver(() => {
    const frame = root.querySelector<HTMLIFrameElement>("iframe");
    if (!frame?.contentWindow) return;
    const message =
      cfg.provider === "utterances"
        ? { type: "set-theme", theme: theme() }
        : { giscus: { setConfig: { theme: theme() } } };
    frame.contentWindow.postMessage(message, ORIGIN[cfg.provider]);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}
