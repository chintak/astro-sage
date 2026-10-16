import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import satori from "satori";
import type Sharp from "sharp";
import { packageDir } from "virtual:astro-sage/user-config";

// Resolve from the theme package, not from this (bundled) file: sharp stays
// external to Vite's build, and under pnpm only the theme can see it.
const require = createRequire(join(packageDir, "index.ts"));
const sharp = require("sharp") as typeof Sharp;
const fontFile = (pkg: string, file: string) =>
  join(dirname(require.resolve(`${pkg}/package.json`)), "files", file);

let fonts: Promise<Parameters<typeof satori>[1]["fonts"]> | undefined;
function loadFonts() {
  fonts ??= Promise.all([
    ...([400, 600] as const).map(async weight => ({
      name: "Newsreader",
      data: await readFile(
        fontFile(
          "@fontsource/newsreader",
          `newsreader-latin-${weight}-normal.woff`
        )
      ),
      weight,
      style: "normal" as const,
    })),
    readFile(
      fontFile(
        "@fontsource/jetbrains-mono",
        "jetbrains-mono-latin-400-normal.woff"
      )
    ).then(data => ({
      name: "JetBrains Mono",
      data,
      weight: 400 as const,
      style: "normal" as const,
    })),
  ]);
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
export async function renderOgImage({
  eyebrow,
  title,
  subtitle,
  footer,
}: OgOptions) {
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
          background: "#f8f2e6",
          color: "#2d2620",
          fontFamily: "Newsreader",
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
                    style: {
                      fontFamily: "JetBrains Mono",
                      fontSize: 24,
                      color: "#9c4a24",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    },
                    children: eyebrow,
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: title.length > 60 ? 60 : 72,
                      fontWeight: 600,
                      lineHeight: 1.1,
                      textWrap: "balance",
                    },
                    children: title,
                  },
                },
                subtitle && {
                  type: "div",
                  props: {
                    style: {
                      fontSize: 30,
                      color: "#675c4f",
                      lineHeight: 1.4,
                      textWrap: "balance",
                    },
                    children: subtitle,
                  },
                },
              ].filter(Boolean),
            },
          },
          {
            type: "div",
            props: {
              style: {
                fontFamily: "JetBrains Mono",
                fontSize: 24,
                color: "#675c4f",
              },
              children: footer,
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts: await loadFonts() }
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
