import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import satori from "satori";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const fontDir = join(
  dirname(require.resolve("@fontsource/source-serif-4/package.json")),
  "files"
);

let fonts: Promise<Parameters<typeof satori>[1]["fonts"]> | undefined;
function loadFonts() {
  fonts ??= Promise.all(
    ([400, 600] as const).map(async weight => ({
      name: "Source Serif 4",
      data: await readFile(join(fontDir, `source-serif-4-latin-${weight}-normal.woff`)),
      weight,
      style: "normal" as const,
    }))
  );
  return fonts;
}

type OgOptions = {
  /** Small label above the title, e.g. the series or site name. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  footer: string;
};

/** Renders a 1200×630 warm-paper OG card to PNG. */
export async function renderOgImage({ eyebrow, title, subtitle, footer }: OgOptions) {
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f8f1e3",
          color: "#3a3126",
          fontFamily: "Source Serif 4",
          borderBottom: "16px solid #56704a",
        },
        children: [
          {
            type: "div",
            props: {
              style: { display: "flex", flexDirection: "column", gap: "20px" },
              children: [
                eyebrow && {
                  type: "div",
                  props: {
                    style: { fontSize: 28, color: "#9c4a24", letterSpacing: "0.06em", textTransform: "uppercase" },
                    children: eyebrow,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: { fontSize: title.length > 60 ? 60 : 72, fontWeight: 600, lineHeight: 1.1 },
                    children: title,
                  },
                },
                subtitle && {
                  type: "div",
                  props: {
                    style: { fontSize: 30, color: "#6b5f4f", lineHeight: 1.4 },
                    children: subtitle,
                  },
                },
              ].filter(Boolean),
            },
          },
          {
            type: "div",
            props: { style: { fontSize: 28, color: "#6b5f4f" }, children: footer },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts: await loadFonts() }
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
