/**
 * Client-side PDF text extraction via pdf.js — layout-aware.
 *
 * Old/designed resumes are frequently multi-column (sidebar layouts, Canva/Word
 * templates). Naive y-sorted extraction interleaves the columns line-by-line,
 * scrambling sections before the parser ever runs. This extractor:
 *
 *   1. Rebuilds visual lines from glyph runs (y-clustering, x-sorted, gap→space).
 *   2. Detects a column gutter per page (a vertical band no text crosses) and
 *      emits text in true reading order: full-width rows act as band breaks;
 *      within a band the whole left column is emitted before the right column.
 *   3. Reports "heading hints" — short lines set noticeably larger than the
 *      body font — which the parser uses to isolate unknown section headers.
 *
 * Everything is pure except the pdf.js loading, so the layout logic is unit-
 * testable with synthetic glyph runs. Lazy-loaded; nothing leaves the browser.
 */

export interface PdfTextItem {
  str: string;
  transform: number[]; // [a, b, c, d, e(x), f(y)]
  width?: number;
}

export interface PageText {
  text: string;
  headingLines: string[];
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

interface Row {
  y: number;
  runs: Run[];
}

const Y_TOLERANCE = 3;

function buildRows(items: PdfTextItem[]): Row[] {
  const rows: Row[] = [];
  for (const it of items) {
    if (typeof it.str !== "string" || it.str.trim().length === 0) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    // Font size is encoded in the text matrix (transform[3]/[0]).
    const size = Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || 10;
    // Some producers omit width; estimate from glyph count so the column
    // detector still sees a sane horizontal extent.
    const width = it.width && it.width > 0 ? it.width : it.str.length * size * 0.5;
    let row = rows.find((r) => Math.abs(r.y - y) <= Y_TOLERANCE);
    if (!row) {
      row = { y, runs: [] };
      rows.push(row);
    }
    row.runs.push({ x, end: x + width, str: it.str, size });
  }
  rows.sort((a, b) => b.y - a.y); // top to bottom
  for (const row of rows) row.runs.sort((a, b) => a.x - b.x);
  return rows;
}

/** Join a set of runs into one text line, inserting spaces across real gaps. */
function runsToLine(runs: Run[]): string {
  let line = "";
  let prev: Run | null = null;
  for (const run of runs) {
    if (prev !== null) {
      // A real word gap is a meaningful fraction of the font size. A relative
      // threshold avoids splitting tightly-kerned glyphs (which would break
      // emails/words) while still separating words.
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
}

/**
 * Find a vertical gutter no text crosses. Returns its x, or null when the page
 * reads as a single column. Full-width rows (e.g. the name header) are allowed
 * to cross — they become band separators rather than disqualifying the split.
 */
function detectGutter(rows: Row[]): number | null {
  const content = rows.filter((r) => r.runs.length > 0);
  if (content.length < 8) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  for (const r of content) {
    for (const run of r.runs) {
      minX = Math.min(minX, run.x);
      maxX = Math.max(maxX, run.end);
    }
  }
  const width = maxX - minX;
  if (width < 220) return null; // too narrow to be a 2-column page

  const from = minX + width * 0.22;
  const to = minX + width * 0.78;
  const maxCrossing = Math.max(1, Math.round(content.length * 0.12));
  const minSplit = Math.max(4, Math.round(content.length * 0.3));

  let best: { g: number; split: number; bandWidth: number } | null = null;
  let bandStart: number | null = null;
  let bandBestSplit = 0;

  for (let g = from; g <= to; g += 3) {
    let crossing = 0;
    let split = 0;
    for (const r of content) {
      const crosses = r.runs.some((run) => run.x < g - 2 && run.end > g + 2);
      if (crosses) {
        crossing++;
        continue;
      }
      const hasLeft = r.runs.some((run) => run.end <= g - 2);
      const hasRight = r.runs.some((run) => run.x >= g + 2);
      if (hasLeft && hasRight) split++;
      else if (hasLeft || hasRight) {
        // single-side row — fine either way
      }
    }
    const valid = crossing <= maxCrossing && split >= minSplit;
    if (valid) {
      if (bandStart === null) bandStart = g;
      bandBestSplit = Math.max(bandBestSplit, split);
    } else if (bandStart !== null) {
      const bandWidth = g - bandStart;
      if (!best || bandBestSplit > best.split || (bandBestSplit === best.split && bandWidth > best.bandWidth)) {
        best = { g: bandStart + bandWidth / 2, split: bandBestSplit, bandWidth };
      }
      bandStart = null;
      bandBestSplit = 0;
    }
  }
  if (bandStart !== null) {
    const bandWidth = to - bandStart;
    if (!best || bandBestSplit > best.split) {
      best = { g: bandStart + bandWidth / 2, split: bandBestSplit, bandWidth };
    }
  }
  return best ? best.g : null;
}

/** Median body font size, weighted by text length. */
function bodyFontSize(rows: Row[]): number {
  const samples: { size: number; weight: number }[] = [];
  for (const r of rows) {
    for (const run of r.runs) {
      const w = run.str.trim().length;
      if (w > 0) samples.push({ size: run.size, weight: w });
    }
  }
  if (samples.length === 0) return 10;
  samples.sort((a, b) => a.size - b.size);
  const total = samples.reduce((n, s) => n + s.weight, 0);
  let acc = 0;
  for (const s of samples) {
    acc += s.weight;
    if (acc >= total / 2) return s.size;
  }
  return samples[samples.length - 1].size;
}

function collectHeadingHints(lines: { text: string; maxSize: number }[], body: number): string[] {
  const hints: string[] = [];
  for (const { text, maxSize } of lines) {
    const t = text.trim();
    if (t.length < 2 || t.length > 60) continue;
    if (!/\p{L}/u.test(t)) continue;
    if (t.split(/\s+/).length > 6) continue;
    if (maxSize >= body * 1.15 && maxSize - body >= 0.8) hints.push(t);
  }
  return hints;
}

/**
 * Turn one page's glyph runs into text (in reading order) + heading hints.
 * Exported for unit tests.
 */
export function itemsToPageText(items: PdfTextItem[]): PageText {
  const rows = buildRows(items);
  if (rows.length === 0) return { text: "", headingLines: [] };

  const body = bodyFontSize(rows);
  const gutter = detectGutter(rows);

  const lineRecords: { text: string; maxSize: number }[] = [];
  const pushLine = (runs: Run[]) => {
    if (runs.length === 0) return;
    const text = runsToLine(runs);
    lineRecords.push({ text, maxSize: Math.max(...runs.map((r) => r.size)) });
  };

  if (gutter === null) {
    for (const row of rows) pushLine(row.runs);
  } else {
    // Band segmentation: rows crossing the gutter (typically the full-width
    // name header) separate bands; within a band, emit the entire left column
    // first, then the right column — true reading order for sidebar layouts.
    type Band = { left: Run[][]; right: Run[][] };
    const flushBand = (band: Band) => {
      for (const runs of band.left) pushLine(runs);
      for (const runs of band.right) pushLine(runs);
    };

    let band: Band = { left: [], right: [] };
    for (const row of rows) {
      const crosses = row.runs.some((run) => run.x < gutter - 2 && run.end > gutter + 2);
      if (crosses) {
        flushBand(band);
        band = { left: [], right: [] };
        pushLine(row.runs);
        continue;
      }
      const left = row.runs.filter((run) => run.end <= gutter);
      const right = row.runs.filter((run) => run.x > gutter);
      if (left.length) band.left.push(left);
      if (right.length) band.right.push(right);
    }
    flushBand(band);
  }

  return {
    text: lineRecords.map((l) => l.text).join("\n"),
    headingLines: collectHeadingHints(lineRecords, body),
  };
}

/** Extract text + heading hints from raw PDF bytes. */
export async function extractPdfPagesFromData(
  data: Uint8Array,
): Promise<PageText> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;

  try {
    const pages: string[] = [];
    const hints = new Set<string>();
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = itemsToPageText(content.items as PdfTextItem[]);
      pages.push(pageText.text);
      for (const h of pageText.headingLines) hints.add(h);
      page.cleanup();
    }
    return { text: pages.join("\n\n"), headingLines: [...hints] };
  } finally {
    await loadingTask.destroy();
  }
}

/** Extract text from raw PDF bytes (used by the ATS self-check round-trip). */
export async function extractPdfTextFromData(
  data: Uint8Array,
): Promise<string> {
  return (await extractPdfPagesFromData(data)).text;
}

export async function extractPdfDocument(file: File): Promise<PageText> {
  return extractPdfPagesFromData(new Uint8Array(await file.arrayBuffer()));
}

export async function extractPdfText(file: File): Promise<string> {
  return (await extractPdfDocument(file)).text;
}
