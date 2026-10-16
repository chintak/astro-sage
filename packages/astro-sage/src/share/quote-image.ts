/**
 * "Share as image": draws a quote card (in the style of the post's OG card)
 * on a canvas in the reader's browser, using the page's own fonts. Nothing is
 * rendered at build time or on the server.
 */
const W = 1200;
const H = 630;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function quoteCard(opts: {
  quote: string;
  title: string;
  eyebrow?: string;
  footer: string;
}): Promise<Blob> {
  const root = getComputedStyle(document.documentElement);
  const serif = getComputedStyle(
    document.querySelector("#article") ?? document.body
  ).fontFamily;
  const mono = root.getPropertyValue("--font-ui").trim() || "monospace";
  // Light palette regardless of the reader's theme: cards live on other sites.
  const paper = "#f8f2e6";
  const ink = "#2d2620";
  const accent = "#9c4a24";
  const muted = "#675c4f";
  const sage = "#56704a";

  const quote =
    opts.quote.length > 280
      ? `${opts.quote.slice(0, 279).trimEnd()}…`
      : opts.quote;
  const size =
    quote.length <= 80
      ? 60
      : quote.length <= 140
        ? 50
        : quote.length <= 220
          ? 42
          : 36;
  await Promise.all([
    document.fonts.load(`italic 400 ${size}px ${serif}`),
    document.fonts.load(`600 30px ${serif}`),
    document.fonts.load(`22px ${mono}`),
  ]).catch(() => {});

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = sage;
  ctx.fillRect(0, H - 16, W, 16);
  ctx.textBaseline = "top";

  const x = 80;
  if (opts.eyebrow) {
    ctx.font = `22px ${mono}`;
    ctx.fillStyle = accent;
    ctx.fillText(opts.eyebrow.toUpperCase(), x, 64);
  }

  ctx.font = `italic 400 ${size}px ${serif}`;
  const lines = wrap(ctx, `“${quote}”`, W - 2 * x - 42);
  const lh = size * 1.25;
  const block = lines.length * lh;
  const top = Math.max(120, (H - 16 - block) / 2 - 30);
  ctx.fillStyle = accent;
  ctx.fillRect(x, top, 6, block);
  ctx.fillStyle = ink;
  lines.forEach((l, i) => ctx.fillText(l, x + 42, top + i * lh));

  ctx.font = `600 30px ${serif}`;
  ctx.fillText(opts.title, x, H - 16 - 64 - 30 - 10 - 22, W - 2 * x);
  ctx.font = `22px ${mono}`;
  ctx.fillStyle = muted;
  ctx.fillText(opts.footer, x, H - 16 - 64 - 22, W - 2 * x);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error("canvas"))),
      "image/png"
    )
  );
}
