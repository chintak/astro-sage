import type { ExpressiveCodeTheme } from "astro-expressive-code";

/**
 * Syntax themes for Expressive Code. Base themes are warm by nature; their
 * backgrounds are then pinned to the theme's own raised-surface colour so code
 * blocks sit on the same paper as callouts and the TOC.
 */
export const sageCodeThemes = ["gruvbox-light-soft", "gruvbox-dark-medium"];

const SURFACE = { light: "#f1e7d3", dark: "#262019" } as const;

export function customizeCodeTheme(theme: ExpressiveCodeTheme) {
  const surface = theme.type === "dark" ? SURFACE.dark : SURFACE.light;
  theme.bg = surface;
  theme.colors["editor.background"] = surface;
  theme.colors["editorGroupHeader.tabsBackground"] = surface;
  theme.colors["tab.activeBackground"] = surface;
  theme.colors["terminal.background"] = surface;
  return theme;
}
