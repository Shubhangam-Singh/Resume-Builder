/**
 * Client-side DOCX text extraction via mammoth. Lazy-loaded so the bundle is
 * only fetched when a user imports a .docx file.
 *
 * Uses mammoth's HTML output rather than raw text: raw text drops list
 * bullets (Word numbering isn't text), which made every bullet look like a
 * plain paragraph. See html-text.ts.
 */
import { htmlToResumeText, type HtmlText } from "./html-text";

type MammothInput = Parameters<typeof import("mammoth").convertToHtml>[0];

/**
 * mammoth's browser build reads `arrayBuffer`, its Node build reads `buffer`
 * (tests run there); both accept an ArrayBuffer, so pass it under each key.
 */
function mammothInput(arrayBuffer: ArrayBuffer): MammothInput {
  return { arrayBuffer, buffer: arrayBuffer } as unknown as MammothInput;
}

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/**
 * Paragraph text of one WordprocessingML part (a header or footer): runs'
 * <w:t> text, tabs as field separators, line breaks as new lines. Field codes
 * (<w:instrText>, e.g. PAGE) are skipped; their result is ordinary text.
 * Exported for unit tests.
 */
export function wordPartLines(xml: string): string[] {
  const lines: string[] = [];
  for (const para of xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) ?? []) {
    let line = "";
    for (const m of para.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(tab|br|cr)\b[^>]*\/>/g)) {
      if (m[2] === "tab") line += " | ";
      else if (m[2]) line += "\n";
      else line += m[1].replace(/&(amp|lt|gt|quot|apos);/g, (_, e: string) => XML_ENTITIES[e]);
    }
    for (const l of line.split("\n")) {
      const t = l.replace(/\s+/g, " ").replace(/^(?:\s*\|\s*)+|(?:\s*\|\s*)+$/g, "").trim();
      if (t) lines.push(t);
    }
  }
  return lines;
}

const CONTACT_LINE = /@|https?:\/\/|www\.|linkedin|github|\+?\d[\d\s().-]{7,}\d/i;

/**
 * Word page headers and footers, which mammoth ignores. Résumés often put the
 * name and contact block in the page header, so its lines go first; from
 * footers only contact lines are kept (the rest is page furniture). Lines
 * already in the body, and repeats across first/even/default headers, are
 * dropped.
 */
async function headerFooterLines(arrayBuffer: ArrayBuffer, bodyText: string): Promise<string[]> {
  const { readZipTextEntries } = await import("./zip");
  const parts = await readZipTextEntries(arrayBuffer, (n) => /^word\/(?:header|footer)\d*\.xml$/.test(n));
  const body = new Set(bodyText.split("\n").map((l) => l.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  const names = [...parts.keys()].sort((a, b) => Number(a.includes("footer")) - Number(b.includes("footer")) || a.localeCompare(b));
  for (const name of names) {
    const footer = name.includes("footer");
    for (const line of wordPartLines(parts.get(name)!)) {
      const key = line.toLowerCase();
      if (!/\p{L}/u.test(line) || seen.has(key) || body.has(key)) continue;
      if (footer && !CONTACT_LINE.test(line)) continue;
      seen.add(key);
      out.push(line);
    }
  }
  return out;
}

/** Text, heading hints (Word Heading styles) and link targets from a .docx. */
export async function extractDocxDocument(arrayBuffer: ArrayBuffer): Promise<HtmlText> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml(mammothInput(arrayBuffer));
  const doc = htmlToResumeText(result.value ?? "");
  // Page headers are a bonus: an archive we can't read changes nothing.
  const extra = await headerFooterLines(arrayBuffer, doc.text).catch(() => [] as string[]);
  return extra.length ? { ...doc, text: `${extra.join("\n")}\n${doc.text}` } : doc;
}

export async function extractDocxFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  return (await extractDocxDocument(arrayBuffer)).text;
}

export async function extractDocxText(file: File): Promise<string> {
  return extractDocxFromArrayBuffer(await file.arrayBuffer());
}
