import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import {
  concatBuffers,
  decodeSharePayload,
  parseShareUrl,
  splitBuffers,
} from "./excalidraw-share.ts";

const enc = new TextEncoder();

/** Mirrors Excalidraw's compressData() to produce a v2 share payload. */
async function encodeLikeExcalidraw(json: string) {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 128 },
    true,
    ["encrypt", "decrypt"]
  );
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const inner = concatBuffers(enc.encode("null"), enc.encode(json));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      deflateSync(inner)
    )
  );
  const meta = enc.encode(
    JSON.stringify({ version: 2, compression: "pako@1", encryption: "AES-GCM" })
  );
  return { payload: concatBuffers(meta, iv, encrypted), key: jwk.k! };
}

test("parses excalidraw.com share links", () => {
  assert.deepEqual(
    parseShareUrl("https://excalidraw.com/#json=abc123,K3y-_x"),
    {
      id: "abc123",
      key: "K3y-_x",
    }
  );
  assert.equal(parseShareUrl("https://example.com/#json=a,b"), undefined);
});

test("concat/split buffers round-trip", () => {
  const parts = [enc.encode("a"), enc.encode(""), enc.encode("hello")];
  assert.deepEqual(
    splitBuffers(concatBuffers(...parts)).map(b => new TextDecoder().decode(b)),
    ["a", "", "hello"]
  );
});

test("decodes a v2 (compressed, encrypted) share payload", async () => {
  const scene = JSON.stringify({ type: "excalidraw", elements: [{ id: "x" }] });
  const { payload, key } = await encodeLikeExcalidraw(scene);
  assert.equal(await decodeSharePayload(payload, key), scene);
});
