import { inflateSync } from "node:zlib";

/**
 * Decoder for excalidraw.com share links (`https://excalidraw.com/#json=<id>,<key>`).
 *
 * The scene is stored encrypted on Excalidraw's backend; the key never leaves
 * the URL fragment. Format (excalidraw/packages/excalidraw/data/encode.ts):
 *   concatBuffers(encodingMetadata, iv, AES-GCM(deflate(concatBuffers(contentsMetadata, json))))
 * where concatBuffers = u32 version, then [u32 length, bytes]* (big-endian).
 */
const BACKEND = "https://json.excalidraw.com/api/v2/";

export function parseShareUrl(url: string) {
  const m =
    /^https?:\/\/(?:www\.)?excalidraw\.com\/?#json=([\w-]+),([\w-]+)$/.exec(
      url.trim()
    );
  return m ? { id: m[1], key: m[2] } : undefined;
}

export function splitBuffers(buf: Uint8Array): Uint8Array[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out: Uint8Array[] = [];
  let cursor = 4; // skip the concat-buffers version
  while (cursor < buf.byteLength) {
    const size = view.getUint32(cursor);
    cursor += 4;
    out.push(buf.slice(cursor, cursor + size));
    cursor += size;
  }
  return out;
}

export function concatBuffers(...bufs: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(
    4 + bufs.reduce((n, b) => n + 4 + b.byteLength, 0)
  );
  const view = new DataView(out.buffer);
  view.setUint32(0, 1);
  let cursor = 4;
  for (const b of bufs) {
    view.setUint32(cursor, b.byteLength);
    cursor += 4;
    out.set(b, cursor);
    cursor += b.byteLength;
  }
  return out;
}

async function importKey(key: string) {
  return crypto.subtle.importKey(
    "jwk",
    {
      alg: "A128GCM",
      ext: true,
      k: key,
      key_ops: ["encrypt", "decrypt"],
      kty: "oct",
    },
    { name: "AES-GCM", length: 128 },
    false,
    ["decrypt"]
  );
}

/** Decodes a downloaded share payload into the scene JSON string. */
export async function decodeSharePayload(
  payload: Uint8Array,
  key: string
): Promise<string> {
  const k = await importKey(key);
  try {
    const [encodingMeta, iv, encrypted] = splitBuffers(payload);
    const meta = JSON.parse(new TextDecoder().decode(encodingMeta));
    let data = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        k,
        new Uint8Array(encrypted)
      )
    );
    if (meta.compression) data = new Uint8Array(inflateSync(data));
    const [, contents] = splitBuffers(data);
    return new TextDecoder().decode(contents);
  } catch {
    // Legacy (v1) links: plain AES-GCM with an all-zero IV, no framing.
    const data = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(12) },
      k,
      new Uint8Array(payload)
    );
    return new TextDecoder().decode(data);
  }
}

export async function fetchShare(url: string): Promise<string> {
  const parsed = parseShareUrl(url);
  if (!parsed) throw new Error(`Not an excalidraw.com share link: ${url}`);
  const res = await fetch(BACKEND + parsed.id);
  if (!res.ok)
    throw new Error(`excalidraw.com returned ${res.status} for ${url}`);
  return decodeSharePayload(
    new Uint8Array(await res.arrayBuffer()),
    parsed.key
  );
}
