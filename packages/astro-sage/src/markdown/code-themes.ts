import type { ExpressiveCodeTheme } from "astro-expressive-code";

/**
 * Syntax themes for Expressive Code. Code blocks use the "hairline" style:
 * no fill, a 1px frame, sitting directly on the page paper. Each theme's
 * background is pinned to the page colour so Expressive Code's automatic
 * contrast correction (minSyntaxHighlightingColorContrast) targets the
 * background the tokens are actually drawn on.
 */
export const sageCodeThemes = [
  "gruvbox-light-soft",
  "gruvbox-dark-medium",
] as const;

/** Candidate pairs for the syntax lab (SAGE_SYNTAX_LAB=1). [id, light, dark, label] */
export const SYNTAX_CANDIDATES = [
  ["S1", "gruvbox-light-soft", "gruvbox-dark-medium", "Gruvbox"],
  ["S2", "rose-pine-dawn", "rose-pine", "Rosé Pine"],
  ["S3", "everforest-light", "everforest-dark", "Everforest"],
  ["S4", "solarized-light", "solarized-dark", "Solarized"],
  ["S5", "kanagawa-lotus", "kanagawa-wave", "Kanagawa"],
  ["S6", "github-light", "github-dark", "GitHub"],
] as const;

const PAGE = { light: "#f8f2e6", dark: "#1f1a15" } as const;

export function customizeCodeTheme(theme: ExpressiveCodeTheme) {
  const page = theme.type === "dark" ? PAGE.dark : PAGE.light;
  theme.bg = page;
  theme.colors["editor.background"] = page;
  theme.colors["editorGroupHeader.tabsBackground"] = page;
  theme.colors["tab.activeBackground"] = page;
  theme.colors["terminal.background"] = page;
  return theme;
}

/** Lab-only selector: a theme applies under [data-syntax=<id>][data-theme=<type>]. */
export function syntaxLabSelector(theme: ExpressiveCodeTheme) {
  const pair = SYNTAX_CANDIDATES.find(
    p => p[1] === theme.name || p[2] === theme.name
  );
  return `[data-syntax="${pair?.[0] ?? "S1"}"][data-theme="${theme.type}"]`;
}
