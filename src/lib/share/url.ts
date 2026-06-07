import { parseResumeJson, serializeResume } from "@/lib/persist/json";
import type { ResumeData } from "@/lib/resume/types";

const PARAM = "r";

function toBase64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64url(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function collectStream(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function gzip(text: string): Promise<Uint8Array> {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  const input = new Uint8Array(new TextEncoder().encode(text));
  // Write and read MUST be concurrent: writer.write() won't resolve until the
  // readable side drains it, so doing them sequentially deadlocks.
  const [result] = await Promise.all([
    collectStream(cs.readable),
    writer.write(input as unknown as Uint8Array<ArrayBuffer>).then(() => writer.close()),
  ]);
  return result;
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  const [out] = await Promise.all([
    collectStream(ds.readable),
    writer.write(new Uint8Array(bytes) as unknown as Uint8Array<ArrayBuffer>).then(() => writer.close()),
  ]);
  return new TextDecoder().decode(out);
}

/**
 * Encode a resume into a shareable URL. The photo (image field) is stripped
 * so the URL stays short enough for any browser or link shortener.
 */
export async function encodeResumeToUrl(resume: ResumeData): Promise<string> {
  const stripped: ResumeData = {
    ...resume,
    basics: { ...resume.basics, image: "" },
  };
  const json = JSON.stringify(serializeResume(stripped));
  const compressed = await gzip(json);
  const encoded = toBase64url(compressed);
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, encoded);
  url.hash = "";
  return url.toString();
}

/**
 * Try to decode a resume from the current URL's `?r=` parameter.
 * Returns null if the param is absent or the data is corrupt.
 */
export async function decodeResumeFromUrl(): Promise<ResumeData | null> {
  if (typeof window === "undefined") return null;
  const encoded = new URLSearchParams(window.location.search).get(PARAM);
  if (!encoded) return null;
  try {
    const json = await gunzip(fromBase64url(encoded));
    return parseResumeJson(json);
  } catch {
    return null;
  }
}

/** Remove the share param from the address bar without reloading. */
export function clearShareParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState({}, "", url.toString());
}
