/**
 * Client-side PDF text extraction via pdf.js, reconstructing real line breaks
 * from glyph positions (mirrors the reference C# `ExtractPageTextWithLineBreaks`).
 * Newlines are essential — the parser's section/entry logic depends on them.
 *
 * Lazy-loaded so the heavy pdf.js bundle is only fetched when a user imports.
 */

interface PdfTextItem {
  str: string;
  transform: number[]; // [a, b, c, d, e(x), f(y)]
  width?: number;
}

let workerConfigured = false;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    // Served from public/ (copied at build time) — no external request.
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjs;
}

interface Run {
  x: number;
  end: number;
  str: string;
  size: number;
}

/** Group glyph runs into visual lines by y-position; add spaces across x-gaps. */
function itemsToText(items: PdfTextItem[]): string {
  const Y_TOLERANCE = 3;
  const rows: { y: number; runs: Run[] }[] = [];

  for (const it of items) {
    if (typeof it.str !== "string" || it.str.length === 0) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    // Font size is encoded in the text matrix (transform[3]/[0]).
    const size = Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || 10;
    let row = rows.find((r) => Math.abs(r.y - y) <= Y_TOLERANCE);
    if (!row) {
      row = { y, runs: [] };
      rows.push(row);
    }
    row.runs.push({ x, end: x + (it.width ?? 0), str: it.str, size });
  }

  rows.sort((a, b) => b.y - a.y); // top to bottom

  return rows
    .map((row) => {
      const runs = row.runs.sort((a, b) => a.x - b.x);
      let line = "";
      let prev: Run | null = null;
      for (const run of runs) {
        if (prev !== null) {
          // A real word gap is a meaningful fraction of the font size. A
          // relative threshold avoids splitting tightly-kerned glyphs (which
          // would otherwise break emails/words) while still separating words.
          const gap = run.x - prev.end;
          const threshold = Math.max(1, prev.size * 0.2);
          if (gap > threshold && !line.endsWith(" ") && !run.str.startsWith(" ")) {
            line += " ";
          }
        }
        line += run.str;
        prev = run;
      }
      return line;
    })
    .join("\n");
}

/** Extract text from raw PDF bytes (used by the ATS self-check round-trip). */
export async function extractPdfTextFromData(
  data: Uint8Array,
): Promise<string> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(itemsToText(content.items as PdfTextItem[]));
      page.cleanup();
    }
    return pages.join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

export async function extractPdfText(file: File): Promise<string> {
  return extractPdfTextFromData(new Uint8Array(await file.arrayBuffer()));
}
