// prepack: copy the repo's README.md, FEATURES.md and LICENSE into the
// package so npm shows them, with repo-relative links made absolute (npm can't
// resolve them).
// postpack (`--clean`) removes the copies again.
import { readFile, rm, writeFile } from "node:fs/promises";

const DOCS = ["README.md", "FEATURES.md", "LICENSE"];
const root = new URL("../../../", import.meta.url);
const pkgDir = new URL("../", import.meta.url);

if (process.argv.includes("--clean")) {
  await Promise.all(DOCS.map(f => rm(new URL(f, pkgDir), { force: true })));
} else {
  const { version } = JSON.parse(
    await readFile(new URL("package.json", pkgDir), "utf8")
  );
  const ref = `astro-sage@${version}`;
  const repo = "https://github.com/chintak/astro-sage";
  const absolute = (path, image) => {
    if (/^(?:[a-z]+:|#|\.\/|\/)/i.test(path)) return path;
    if (image)
      return `https://raw.githubusercontent.com/chintak/astro-sage/${ref}/${path}`;
    return `${repo}/${path.endsWith("/") ? "tree" : "blob"}/${ref}/${path}`;
  };
  for (const file of DOCS) {
    let fenced = false;
    const out = (await readFile(new URL(file, root), "utf8"))
      .split("\n")
      .map(line => {
        if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
        if (fenced) return line;
        return line.replace(
          /(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g,
          (_, bang, text, path, title) =>
            `${bang}[${text}](${absolute(path, bang === "!")}${title})`
        );
      })
      .join("\n");
    await writeFile(new URL(file, pkgDir), out);
  }
}
