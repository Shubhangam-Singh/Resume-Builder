/**
 * Minimal ZIP reader: just enough to pull a few XML parts out of a .docx
 * (which is a ZIP archive) that mammoth doesn't read, such as page headers.
 * Uses the platform's DecompressionStream, so it adds no dependency.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Text of every entry whose name passes `want`, keyed by name. Damaged or
 * unsupported entries are skipped, never thrown — callers treat the result
 * as optional extra information.
 */
export async function readZipTextEntries(
  buffer: ArrayBuffer,
  want: (name: string) => boolean,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // The end-of-central-directory record sits in the last 64 KiB + 22 bytes.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return out;

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder("utf-8");

  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (view.getUint32(p, true) !== CENTRAL_SIGNATURE) break;
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const extraLength = view.getUint16(p + 30, true);
    const commentLength = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    p += 46 + nameLength + extraLength + commentLength;

    if (!want(name)) continue;
    try {
      if (view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) continue;
      const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
      const raw = bytes.subarray(start, start + compressedSize);
      if (method === 0) out.set(name, decoder.decode(raw));
      else if (method === 8) out.set(name, decoder.decode(await inflateRaw(raw)));
    } catch {
      // Skip an unreadable entry.
    }
  }
  return out;
}
