/**
 * A deliberately tiny Markdown subset for comments: paragraphs, line breaks,
 * **bold**, *italic*, `code`, ```fenced code```, and http(s) links.
 * Everything is HTML-escaped first, so no user markup ever reaches the page.
 */
const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function inline(text: string): string {
  const codes: string[] = [];
  let s = escape(text).replace(/`([^`\n]+)`/g, (_, c) => {
    codes.push(`<code>${c}</code>`);
    return `\uE000${codes.length - 1}\uE000`;
  });
  s = s
    .replace(
      /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, href) =>
        `<a href="${href}" rel="nofollow ugc noopener noreferrer" target="_blank">${label}</a>`
    )
    .replace(
      /(^|[\s(])(https?:\/\/[^\s<)]+)/g,
      (_, pre, href) =>
        `${pre}<a href="${href}" rel="nofollow ugc noopener noreferrer" target="_blank">${href}</a>`
    )
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br>");
  return s.replace(/\uE000(\d+)\uE000/g, (_, i) => codes[Number(i)]);
}

export function renderComment(md: string): string {
  const out: string[] = [];
  const parts = md.replace(/\r\n?/g, "\n").split(/```[^\n]*\n?/);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      out.push(`<pre><code>${escape(part.replace(/\n$/, ""))}</code></pre>`);
      return;
    }
    for (const para of part.split(/\n{2,}/)) {
      const p = para.trim();
      if (p) out.push(`<p>${inline(p)}</p>`);
    }
  });
  return out.join("");
}
