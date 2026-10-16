import { definePlugin } from "astro-expressive-code";
import { h, select } from "astro-expressive-code/hast";

/** Display names for common fence languages; anything else shows as written. */
const NAMES: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  mts: "TypeScript",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  rs: "Rust",
  rust: "Rust",
  go: "Go",
  c: "C",
  cpp: "C++",
  "c++": "C++",
  cs: "C#",
  csharp: "C#",
  java: "Java",
  kt: "Kotlin",
  kotlin: "Kotlin",
  swift: "Swift",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  shell: "Shell",
  ps1: "PowerShell",
  powershell: "PowerShell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  jsonc: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  md: "Markdown",
  markdown: "Markdown",
  mdx: "MDX",
  astro: "Astro",
  diff: "Diff",
  dockerfile: "Dockerfile",
  graphql: "GraphQL",
  lua: "Lua",
  r: "R",
  latex: "LaTeX",
  tex: "LaTeX",
  hs: "Haskell",
  haskell: "Haskell",
};

/** Plain text has nothing to label. */
const SKIP = new Set(["", "text", "txt", "plaintext", "plain", "ansi"]);

export const languageName = (lang: string) => NAMES[lang.toLowerCase()] ?? lang;

/**
 * Shows the block's language on the top-right of its frame. Terminal frames
 * are skipped: the frame already says "shell".
 */
export function pluginLanguageLabel() {
  return definePlugin({
    name: "astro-sage-language-label",
    // Sits on the frame's top border, like a fieldset legend, so it never
    // covers code or the copy button. --code-label-bg matches the surface the
    // block sits on (the page, or a callout's tint).
    baseStyles: `
      .sage-lang {
        position: absolute;
        /* Above the titled frame's header, which draws the top border. */
        z-index: 2;
        inset-block-start: 0;
        inset-inline-end: 0.9rem;
        translate: 0 -50%;
        padding-inline: 0.4rem;
        background: var(--code-label-bg, var(--bg, transparent));
        font-family: var(--ec-uiFontFml);
        font-size: 0.68rem;
        letter-spacing: 0.04em;
        line-height: 1.2;
        color: var(--fg-muted, currentColor);
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
      }
    `,
    hooks: {
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        const lang = codeBlock.language;
        if (SKIP.has(lang) || codeBlock.props.frame === "terminal") return;
        const pre = select("pre", renderData.blockAst);
        if (!pre) return;
        pre.children.push(
          h("span", { class: "sage-lang", "aria-hidden": "true" }, [
            languageName(lang),
          ])
        );
      },
    },
  });
}
