import { experimental_AstroContainer as AstroContainer } from "astro/container";
// Imported directly (not via loadRenderers) so Vite bundles it from the
// theme's own dependencies; sites needn't install @astrojs/mdx themselves.
import mdxServer from "@astrojs/mdx/server.js";
import { render, type CollectionEntry } from "astro:content";
import { ELEMENT_NODE, parse, render as print, walkSync } from "ultrahtml";
import type { Node } from "ultrahtml";

let container: AstroContainer | undefined;

/** Classes of elements that only make sense with the site's CSS and JS. */
const DROP_CLASSES = [
  "katex-html", // MathML (kept) is what feed readers can show
  "diagram-dark", // diagrams carry a light and a dark SVG; keep the light one
  "sage-lang", // code-block language label
  "copy", // code copy button
];
const DROP_TAGS = new Set(["script", "link", "button", "noscript", "template"]);

const hasClass = (node: Node, cls: string) =>
  String(node.attributes?.class ?? "")
    .split(/\s+/)
    .includes(cls);

/**
 * A post's full HTML for feeds: rendered with the Container API, then
 * cleaned of interactive and CSS-dependent markup, with every link and
 * image made absolute so it works inside a feed reader.
 */
export async function feedContent(
  post: CollectionEntry<"posts">,
  postUrl: URL
): Promise<string> {
  if (!container) {
    container = await AstroContainer.create();
    container.addServerRenderer({ name: "astro:jsx", renderer: mdxServer });
  }
  const { Content } = await render(post);
  const doc = parse(await container.renderToString(Content));

  const absolute = (value: string) => {
    if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("//"))
      return value;
    return new URL(value, postUrl).href;
  };

  const dropped: Array<[Node, Node]> = [];
  walkSync(doc, (node, parent) => {
    if (node.type !== ELEMENT_NODE) return;
    const insideSvg = parent?.name === "svg" || node.name === "svg";
    const drop =
      DROP_TAGS.has(node.name) ||
      (node.name === "style" && !insideSvg) ||
      DROP_CLASSES.some(c => hasClass(node, c));
    if (drop && parent) {
      // Removed after the walk: mutating siblings mid-walk skips nodes.
      dropped.push([node, parent]);
      return;
    }
    const attrs = node.attributes ?? {};
    for (const key of Object.keys(attrs)) {
      if (key.startsWith("data-astro")) delete attrs[key];
    }
    if (typeof attrs.href === "string") attrs.href = absolute(attrs.href);
    if (typeof attrs.src === "string") attrs.src = absolute(attrs.src);
    if (typeof attrs.srcset === "string")
      attrs.srcset = attrs.srcset
        .split(",")
        .map(part => {
          const [url, size] = part.trim().split(/\s+/);
          return [absolute(url), size].filter(Boolean).join(" ");
        })
        .join(", ");
  });

  for (const [node, parent] of dropped)
    parent.children = parent.children.filter((c: Node) => c !== node);

  return print(doc);
}
