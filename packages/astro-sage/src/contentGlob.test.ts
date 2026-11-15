import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";
import { contentGlob } from "./contentGlob.ts";

const ignored = [
  "_x.md",
  "_dir/index.md",
  "a/_dir/index.md",
  "_a/b/c.md",
  "a/b/_c.mdx",
  "_x.mdx",
  "a/_b/c/d.mdx",
];
// Distinct slugs, so no two fixtures share an entry id.
const loaded = [
  "post.md",
  "other.mdx",
  "a_b/index.md",
  "my_post.md",
  "a/b_/index.md",
  "a/b/c/index.md",
  "a/b/d.mdx",
  "x_/y_z/z_.mdx",
];
// Unchanged from the old pattern: dotfiles and non-markdown files never load.
const neverLoaded = [".hidden.md", ".dir/index.md", "notes.txt", "a/b.json"];

const root = mkdtempSync(join(tmpdir(), "sage-glob-"));
after(() => rmSync(root, { recursive: true, force: true }));

function write(base: string, files: string[]) {
  for (const file of files) {
    const path = join(root, base, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "---\ntitle: t\n---\nbody\n");
  }
}

/** Runs Astro's real glob loader over `base`, returning the loaded entries' paths. */
async function runLoader(base: string) {
  const entries = new Map<string, { id: string; filePath: string }>();
  const store = {
    keys: () => entries.keys(),
    get: (id: string) => entries.get(id),
    set: (entry: { id: string; filePath: string }) =>
      entries.set(entry.id, entry),
    delete: (id: string) => entries.delete(id),
    addModuleImport() {},
    addAssetImports() {},
  };
  const entryType = {
    getEntryInfo: ({ contents }: { contents: string }) => ({
      data: {},
      body: contents,
    }),
  };
  const watcher = Object.assign(new EventEmitter(), { add() {} });
  const noop = () => {};
  const rootUrl = pathToFileURL(root + "/");
  await contentGlob(`./${base}`).load({
    config: { root: rootUrl, srcDir: new URL("src/", rootUrl) },
    collection: "posts",
    logger: { warn: noop, info: noop, error: noop },
    watcher,
    parseData: async ({ data }: { data: unknown }) => data,
    store,
    generateDigest: (s: string) => String(s.length),
    entryTypes: new Map([
      [".md", entryType],
      [".mdx", entryType],
    ]),
  } as never);
  const paths = () =>
    [...entries.values()].map(e => e.filePath.slice(base.length + 1)).sort();
  /** Simulates `astro dev` seeing new files: the watcher path filters separately. */
  async function emitAdd(files: string[]) {
    for (const file of files) watcher.emit("add", join(root, base, file));
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return { paths, emitAdd };
}

test("initial scan skips any _-prefixed folder or file under the base", async () => {
  write("scan", [...ignored, ...loaded, ...neverLoaded]);
  const { paths } = await runLoader("scan");
  assert.deepEqual(paths(), [...loaded].sort());
});

test("dev watcher applies the same rule to added files", async () => {
  mkdirSync(join(root, "watch"), { recursive: true });
  const { paths, emitAdd } = await runLoader("watch");
  assert.deepEqual(paths(), []);
  write("watch", [...ignored, ...loaded, ...neverLoaded]);
  await emitAdd([...ignored, ...loaded, ...neverLoaded]);
  assert.deepEqual(paths(), [...loaded].sort());
});

test("a _-prefixed folder above the base does not hide the collection", async () => {
  write("_site/posts", ["post.md", "_draft.md"]);
  const { paths } = await runLoader("_site/posts");
  assert.deepEqual(paths(), ["post.md"]);
});
