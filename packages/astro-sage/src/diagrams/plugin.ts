import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { MdastPluginDefinition } from "satteri";
import { rawHtml } from "../markdown";
import {
  type DiagramOptions,
  type Rendered,
  normalizeScene,
  prepareExcalidrawSvg,
  renderExcalidraw,
  renderMermaid,
  sceneFromShareLink,
} from "./render";
import { parseShareUrl } from "./excalidraw-share";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Node = any;

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!
  );

/**
 * Make the SVG fluid: drop fixed width/height (viewBox is kept) and cap it at its
 * natural width so small diagrams don't blow up to the full column.
 */
function fluid(svg: string) {
  const open = /<svg\b[^>]*>/.exec(svg)?.[0];
  if (!open) return svg;
  const width = /\swidth="([\d.]+)(px)?"/.exec(open)?.[1];
  let tag = open.replace(/\s(width|height)="[^"]*"/g, "");
  if (width && !/max-width/.test(tag)) {
    tag = /\sstyle="/.test(tag)
      ? tag.replace(/\sstyle="/, ` style="max-width: ${width}px; `)
      : tag.replace(/<svg/, `<svg style="max-width: ${width}px"`);
  }
  return svg.replace(open, tag);
}

function figure(
  kind: string,
  r: Rendered,
  caption?: string,
  invertInDark = false,
  wide = false
) {
  const label = caption || r.title || `${kind} diagram`;
  const desc = r.description
    ? `<p class="sr-only">${esc(r.description)}</p>`
    : "";
  const dark = invertInDark
    ? ""
    : `<div class="diagram-svg diagram-dark">${fluid(r.dark)}</div>`;
  return `<figure class="diagram${invertInDark ? " diagram-invert" : ""}${wide ? " full-bleed" : ""}" data-diagram="${kind}">
<div class="diagram-canvas" role="img" aria-label="${esc(label)}">
<div class="diagram-svg diagram-light">${fluid(r.light)}</div>${dark}
</div>${desc}
<button type="button" class="diagram-expand" aria-label="Open ${esc(label)} in viewer" title="Zoom (or double-click)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}
</figure>`;
}

function fallback(kind: string, source: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.warn(
    `[astro-sage] ${kind} diagram not rendered: ${msg.split("\n")[0]}`
  );
  if (process.env.SAGE_DIAGRAMS_STRICT) throw error;
  return `<figure class="diagram diagram-error"><pre><code>${esc(source)}</code></pre><figcaption>${kind} diagram could not be rendered at build time; showing source.</figcaption></figure>`;
}

/**
 * Renders diagrams at build time to inline SVG (selectable, searchable, no runtime JS):
 *
 *   ```mermaid                         ![Caption](./system.excalidraw)
 *   graph LR; A --> B                  ![Caption](./system.excalidraw.svg)
 *   ```
 *
 *   ```excalidraw                      ![Caption](https://excalidraw.com/#json=<id>,<key>)
 *   { …scene or clipboard JSON… }
 *   ```
 *
 * Full width: ```mermaid wide title="…"   or   ![Caption](./system.excalidraw "wide")
 */
export function diagramsPlugin(opts: DiagramOptions): MdastPluginDefinition {
  return {
    name: "astro-sage-diagrams",
    async code(node: Node, ctx: Node) {
      if (node.lang !== "mermaid" && node.lang !== "excalidraw") return;
      const mdx = ctx.sourceFormat === "mdx";
      const meta = node.meta ?? "";
      const caption = /title="([^"]+)"/.exec(meta)?.[1];
      const wide = /(^|\s)wide(\s|$)/.test(meta);
      let html: string;
      try {
        html =
          node.lang === "mermaid"
            ? figure(
                "mermaid",
                await renderMermaid(node.value, opts),
                caption,
                false,
                wide
              )
            : figure(
                "excalidraw",
                await renderExcalidraw(normalizeScene(node.value), opts),
                caption,
                false,
                wide
              );
      } catch (e) {
        html = fallback(
          node.lang === "mermaid" ? "Mermaid" : "Excalidraw",
          node.value,
          e
        );
      }
      ctx.replaceNode(node, rawHtml(html, mdx, false));
    },
    async paragraph(node: Node, ctx: Node) {
      // An image alone in a paragraph, pointing at an Excalidraw file.
      if (node.children.length !== 1 || node.children[0].type !== "image")
        return;
      const img = node.children[0];
      const share = parseShareUrl(img.url);
      if (!share && !/\.excalidraw(\.json|\.svg)?$/.test(img.url)) return;
      const mdx = ctx.sourceFormat === "mdx";
      const wide = img.title === "wide";
      let html: string;
      try {
        if (share) {
          const scene = await sceneFromShareLink(img.url, opts);
          html = figure(
            "excalidraw",
            await renderExcalidraw(scene, opts),
            img.alt,
            false,
            wide
          );
        } else {
          const text = await readFile(
            fileURLToPath(new URL(img.url, ctx.fileURL)),
            "utf8"
          );
          html = img.url.endsWith(".svg")
            ? figure(
                "excalidraw",
                prepareExcalidrawSvg(text),
                img.alt,
                true,
                wide
              )
            : figure(
                "excalidraw",
                await renderExcalidraw(normalizeScene(text), opts),
                img.alt,
                false,
                wide
              );
        }
      } catch (e) {
        html = fallback("Excalidraw", img.url, e);
      }
      ctx.replaceNode(node, rawHtml(html, mdx, false));
    },
  };
}
