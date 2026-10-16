/**
 * Select text in a post → a small toolbar to share it as a quote.
 * Links use a text fragment (#:~:text=…) so readers land on the passage.
 * The image button renders the quote as a PNG card in the browser.
 */
const MIN = 8;
const MAX = 600;

type Ctx = {
  root: HTMLElement;
  url: string;
  title: string;
  /** For the image card. */
  eyebrow?: string;
  footer?: string;
};

/** Text-fragment directive per the spec: encode, plus `-`, `,` and `&`. */
const enc = (s: string) =>
  encodeURIComponent(s)
    .replace(/-/g, "%2D")
    .replace(/,/g, "%2C")
    .replace(/&/g, "%26");

export function textFragment(quote: string) {
  const words = quote.replace(/\s+/g, " ").trim().split(" ");
  if (words.length <= 10) return `#:~:text=${enc(words.join(" "))}`;
  return `#:~:text=${enc(words.slice(0, 5).join(" "))},${enc(words.slice(-5).join(" "))}`;
}

const clip = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

export function shareTargets(quote: string, ctx: Ctx) {
  const link = ctx.url + textFragment(quote);
  const q = (n: number) => `“${clip(quote, n)}” — ${ctx.title}`;
  return {
    link,
    quote,
    text: q(MAX),
    x: `https://x.com/intent/post?text=${encodeURIComponent(q(200))}&url=${encodeURIComponent(link)}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${q(220)} ${link}`)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    mail: `mailto:?subject=${encodeURIComponent(ctx.title)}&body=${encodeURIComponent(`${q(MAX)}\n\n${link}`)}`,
  };
}

const ICON = {
  x: '<path d="M4 4l11.733 16h4.267l-11.733 -16z"/><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772"/>',
  bluesky:
    '<path d="M6.335 5.144c-1.654 -1.199 -4.335 -2.127 -4.335 .826c0 .59 .35 4.953 .556 5.661c.713 2.463 3.13 2.75 5.444 2.369c-4.045 .665 -4.889 3.208 -2.667 5.41c1.03 1.018 1.913 1.59 2.667 1.59c2 0 3.134 -2.769 3.5 -3.5c.333 -.667 .5 -1.167 .5 -1.5c0 .333 .167 .833 .5 1.5c.366 .731 1.5 3.5 3.5 3.5c.754 0 1.637 -.571 2.667 -1.59c2.222 -2.203 1.378 -4.746 -2.667 -5.41c2.314 .38 4.73 .094 5.444 -2.369c.206 -.708 .556 -5.072 .556 -5.661c0 -2.953 -2.68 -2.025 -4.335 -.826c-2.293 1.662 -4.76 5.048 -5.665 6.856c-.905 -1.808 -3.372 -5.194 -5.665 -6.856z"/>',
  linkedin:
    '<path d="M8 11v5"/><path d="M8 8v.01"/><path d="M12 16v-5"/><path d="M16 16v-3a2 2 0 1 0 -4 0"/><path d="M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z"/>',
  mail: '<path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z"/><path d="M3 7l9 6l9 -6"/>',
  copy: '<path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>',
  image:
    '<path d="M15 8h.01"/><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/>',
  share:
    '<path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M8.7 10.7l6.6 -3.4"/><path d="M8.7 13.3l6.6 3.4"/>',
};
const svg = (p: string) =>
  `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

export function init(ctx: Ctx) {
  const bar = document.createElement("div");
  bar.className = "quote-share";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Share selected text");
  bar.hidden = true;
  const native = typeof navigator.share === "function";
  bar.innerHTML = `
    <span class="qs-label">Share quote</span>
    <a data-t="x" target="_blank" rel="noopener noreferrer" aria-label="Share quote on X">${svg(ICON.x)}</a>
    <a data-t="bluesky" target="_blank" rel="noopener noreferrer" aria-label="Share quote on Bluesky">${svg(ICON.bluesky)}</a>
    <a data-t="linkedin" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">${svg(ICON.linkedin)}</a>
    <a data-t="mail" aria-label="Share quote via email">${svg(ICON.mail)}</a>
    <button type="button" data-t="copy" aria-label="Copy quote with link">${svg(ICON.copy)}</button>
    <button type="button" data-t="image" aria-label="Share quote as image">${svg(ICON.image)}</button>
    ${native ? `<button type="button" data-t="native" aria-label="Share via…">${svg(ICON.share)}</button>` : ""}
    <span class="qs-status" role="status" aria-live="polite"></span>`;
  document.body.append(bar);
  const status = bar.querySelector<HTMLElement>(".qs-status")!;
  let current: ReturnType<typeof shareTargets> | undefined;

  function hide() {
    bar.hidden = true;
    status.textContent = "";
  }

  function show(text: string, rect: DOMRect) {
    current = shareTargets(text, ctx);
    for (const a of bar.querySelectorAll<HTMLAnchorElement>("a[data-t]"))
      a.href = current[a.dataset.t as "x" | "bluesky" | "linkedin" | "mail"];
    bar.hidden = false;
    const w = bar.offsetWidth;
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - w / 2),
      document.documentElement.clientWidth - w - 8
    );
    const above = rect.top - bar.offsetHeight - 10;
    const top = above > 8 ? above : rect.bottom + 10;
    bar.style.left = `${left + window.scrollX}px`;
    bar.style.top = `${top + window.scrollY}px`;
  }

  function update() {
    const sel = document.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!sel || sel.isCollapsed || text.length < MIN || text.length > MAX * 4)
      return hide();
    const range = sel.getRangeAt(0);
    if (!ctx.root.contains(range.commonAncestorContainer)) return hide();
    show(text, range.getBoundingClientRect());
  }

  let t: number | undefined;
  document.addEventListener("selectionchange", () => {
    clearTimeout(t);
    t = window.setTimeout(update, 180);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") hide();
  });
  window.addEventListener("resize", () => !bar.hidden && update());

  // Keep the selection while clicking the toolbar.
  bar.addEventListener("mousedown", e => e.preventDefault());
  bar.addEventListener("click", async e => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-t]"
    );
    if (!b || !current) return;
    if (b.dataset.t === "copy") {
      try {
        await navigator.clipboard.writeText(`${current.text}\n${current.link}`);
        status.textContent = "Copied";
      } catch {
        status.textContent = "Copy failed";
      }
    } else if (b.dataset.t === "image") {
      status.textContent = "Rendering…";
      const { quoteCard } = await import("./quote-image");
      const blob = await quoteCard({
        quote: current.quote,
        title: ctx.title,
        eyebrow: ctx.eyebrow,
        footer: ctx.footer ?? new URL(ctx.url).hostname,
      });
      const file = new File([blob], "quote.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        status.textContent = "";
        await navigator
          .share({
            files: [file],
            title: ctx.title,
            text: current.text,
            url: current.link,
          })
          .catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "quote.png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        status.textContent = "Image saved";
      }
    } else if (b.dataset.t === "native") {
      navigator
        .share({ title: ctx.title, text: current.text, url: current.link })
        .catch(() => {});
    }
  });
}
