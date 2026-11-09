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
  /** pdf.js font resource id — differs between e.g. the bold and regular face. */
  fontName?: string;
}

/** How a short line is set: size relative to the body text, and weight. */
export interface LineStyle {
  text: string;
  /** Largest glyph size on the line ÷ the page's body size, to 0.05. */
  size: number;
  bold: boolean;
}

export interface PageText {
  text: string;
  headingLines: string[];
  /** Style of each short line (≤ 8 words), for heading-style learning. */
  lineStyles: LineStyle[];
  /** Body font size (points) and letter count — to rescale across pages. */
  body?: { size: number; letters: number; points: number[] };
}

/** A whole document: text, heading hints, and the link targets it contains. */
export interface PdfExtraction extends PageText {
  /** URLs of link annotations ("GitHub" printed, github.com/… behind it). */
  links: string[];
  /** Pages exist but carry no text layer — a scan or an exported image. */
  scanned: boolean;
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
  font: string;
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
    row.runs.push({ x, end: x + width, str: it.str, size, font: it.fontName ?? "" });
  }
  rows.sort((a, b) => b.y - a.y); // top to bottom
  for (const row of rows) row.runs.sort((a, b) => a.x - b.x);
  return rows;
}

/** A gap this wide inside a row separates two fields (a right-aligned date). */
const wideGap = (size: number) => Math.max(18, size * 2.5);

/**
 * Join a set of runs into one text line, inserting spaces across real gaps.
 * A wide gap — a right-aligned date, a name with contact details beside it —
 * becomes " | " so the parser can tell the two fields apart.
 */
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
      if (gap > wideGap(prev.size)) {
        line = `${line.trimEnd()} | `;
      } else if (gap > threshold && !line.endsWith(" ") && !run.str.startsWith(" ")) {
        line += " ";
      }
    }
    line += line.endsWith(" | ") ? run.str.trimStart() : run.str;
    prev = run;
  }
  return line;
}

/** Split a row's runs at wide gaps: [title runs], [date runs]. */
function segmentRuns(runs: Run[]): Run[][] {
  const segments: Run[][] = [];
  for (const run of runs) {
    const last = segments[segments.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && run.x - prev.end <= wideGap(prev.size)) last.push(run);
    else segments.push([run]);
  }
  return segments;
}

/** One emitted line, with the layout facts the wrap-joiner needs. */
interface Line {
  /** Which column it came from; wraps only re-join within one column. */
  column: string;
  y: number;
  runs: Run[];
  /** Text continued from the next line (a wrapped title), set by joining. */
  joined: string;
  /** Index of the last run of the box the joined text continues. */
  joinAt: number;
}

const lineText = (l: Line) => {
  if (!l.joined) return runsToLine(l.runs);
  const head = joinWrapped(runsToLine(l.runs.slice(0, l.joinAt + 1)), l.joined);
  const rest = l.runs.slice(l.joinAt + 1);
  // The box boundary is a field boundary: keep the right-hand field apart.
  return rest.length ? `${head} | ${runsToLine(rest)}` : head;
};

/** "Orbit Com-" + "merce" → "Orbit Commerce"; otherwise join with a space. */
function joinWrapped(a: string, b: string): string {
  return /\p{L}-$/u.test(a) && /^\p{Ll}/u.test(b) ? `${a.slice(0, -1)}${b}` : `${a} ${b}`;
}

const BULLET_START = /^[\s]*[•●▪◦‣\-–*·-]/u;

/**
 * Starts a line that continues the bullet above it (a hanging-indent wrap).
 * U+2063 INVISIBLE SEPARATOR, built from its code: normalizeText joins such
 * lines to the previous one, so it never reaches the parser.
 */
export const CONTINUATION_MARK = String.fromCharCode(0x2063);

/**
 * Re-join a field wrapped inside its box: a title beside a right-aligned date
 * ("Senior Product Designer — Lumen" | "Mar 2020 – Present" / "Health"), or a
 * word hyphenated across lines ("Orbit Com-" / "merce"). The next line must
 * be a short fragment starting at the same left edge, in the same font and
 * size, one line-height below — and its first word must not have fitted in
 * the box above, which is exactly why the layout engine broke the line there.
 */
function joinWrappedLines(lines: Line[]): Line[] {
  const out: Line[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    const at = prev ? joinPoint(prev, line) : null;
    if (prev && at !== null) {
      const text = runsToLine(line.runs);
      prev.joined = prev.joined ? joinWrapped(prev.joined, text) : text;
      prev.joinAt = at;
      prev.y = line.y; // a further wrapped line is measured from this one
      continue;
    }
    out.push({ ...line });
  }
  return out;
}

/**
 * Where line `b` continues line `a`: the index of the last run of the box it
 * wraps from, or null when it's a line of its own.
 */
function joinPoint(a: Line, b: Line): number | null {
  if (a.column !== b.column || a.column === "cross") return null;
  const text = runsToLine(b.runs);
  // A wrapped fragment: one field, a few words, not a sentence or a bullet.
  if (BULLET_START.test(text) || segmentRuns(b.runs).length !== 1) return null;
  if (text.split(/\s+/).length > 3 || /[.!?]$/.test(text)) return null;
  const first = b.runs[0];
  if (Math.abs(first.x - a.runs[0].x) > 2) return null;
  const dy = a.y - b.y;
  if (dy < first.size * 0.8 || dy > first.size * 1.75) return null;

  const hyphenAfter = (s: string) => /\p{L}-$/u.test(s.trimEnd()) && /^\p{Ll}/u.test(text);
  // A line already extended by a wrap can't be measured again (its runs are
  // gone); only an explicit hyphen continues it.
  if (a.joined) return hyphenAfter(a.joined) ? a.joinAt : null;

  // The box ends where a right-aligned field starts: a wide gap, or a gap
  // wider than a word space where the size changes too (dates and meta lines
  // are set smaller). Justified word spacing never changes size mid-line.
  const isBoundary = (i: number) => {
    const r = a.runs[i];
    const n = a.runs[i + 1];
    const gap = n.x - r.end;
    return gap > wideGap(r.size) || (gap > r.size * 0.6 && Math.abs(n.size - r.size) > 0.3);
  };
  let k = 0;
  while (k < a.runs.length - 1 && !isBoundary(k)) k++;
  const last = a.runs[k];
  if (Math.abs(first.size - last.size) > 0.3) return null;
  if (last.font && first.font && last.font !== first.font) return null;

  const hyphenated = hyphenAfter(last.str);
  const field = a.runs[k + 1];
  if (!field) return hyphenated ? k : null;

  // Beside a right-aligned field: the wrapped part sits under the title box,
  // and its first word would have run into that field.
  if (b.runs[b.runs.length - 1].end > field.x) return null;
  const firstWord = text.split(/\s+/)[0];
  const firstWordWidth = (first.end - first.x) * (firstWord.length / Math.max(1, first.str.trim().length));
  const wouldOverflow = last.end + first.size * 0.25 + firstWordWidth > field.x - wideGap(first.size);
  return hyphenated || wouldOverflow ? k : null;
}

/** Fraction of `starts` covered by the three largest clusters (4pt wide). */
function startAlignment(starts: number[]): number {
  if (starts.length === 0) return 0;
  const sorted = [...starts].sort((a, b) => a - b);
  const clusters: number[] = [];
  let size = 1;
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] - sorted[i - 1] <= 4) size++;
    else {
      clusters.push(size);
      size = 1;
    }
  }
  clusters.sort((a, b) => b - a);
  return clusters.slice(0, 3).reduce((n, c) => n + c, 0) / starts.length;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/**
 * Find a vertical gutter no text crosses. Returns its x, or null when the page
 * reads as a single column. Full-width rows (e.g. the name header) are allowed
 * to cross — they become band separators rather than disqualifying the split.
 *
 * The two columns' baselines rarely line up (different font sizes and line
 * heights), so each side is counted on its own rows. To keep right-aligned
 * dates on a one-column page from passing for a column, the right side must
 * read like one: lines starting at a common left edge and filling a good part
 * of its width, carrying a real share of the page's text.
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
  const minSide = Math.max(3, Math.round(content.length * 0.2));
  const chars = (runs: Run[]) => runs.reduce((n, run) => n + run.str.trim().length, 0);

  const isValid = (g: number): number | null => {
    let crossing = 0;
    let leftRows = 0;
    let leftChars = 0;
    let rightChars = 0;
    const rightStarts: number[] = [];
    const rightWidths: number[] = [];
    const crossingYs: number[] = [];
    const rightYs: number[] = [];
    for (const r of content) {
      if (r.runs.some((run) => run.x < g - 2 && run.end > g + 2)) {
        crossing++;
        crossingYs.push(r.y);
        continue;
      }
      const left = r.runs.filter((run) => run.end <= g - 2);
      const right = r.runs.filter((run) => run.x >= g + 2);
      if (left.length) {
        leftRows++;
        leftChars += chars(left);
      }
      if (right.length) {
        rightStarts.push(right[0].x);
        rightWidths.push(right[right.length - 1].end - right[0].x);
        rightChars += chars(right);
        rightYs.push(r.y);
      }
    }
    // Full-width rows may sit above (name header) or below (footer) the
    // columns, never between right-side rows: a summary or bullet running
    // through the "right column" means it was right-aligned metadata.
    const top = Math.max(...rightYs);
    const bottom = Math.min(...rightYs);
    const interleaved = crossingYs.filter((y) => y < top && y > bottom).length;
    const total = leftChars + rightChars;
    const ok =
      crossing <= maxCrossing &&
      interleaved <= Math.max(1, Math.round(content.length * 0.03)) &&
      leftRows >= minSide &&
      rightStarts.length >= minSide &&
      total > 0 &&
      Math.min(leftChars, rightChars) / total >= 0.12 &&
      startAlignment(rightStarts) >= 0.7 &&
      median(rightWidths) >= (maxX - g) * 0.3;
    return ok ? Math.min(leftRows, rightStarts.length) : null;
  };

  let best: { g: number; balance: number; bandWidth: number } | null = null;
  let bandStart: number | null = null;
  let bandBalance = 0;
  const closeBand = (end: number) => {
    if (bandStart === null) return;
    const bandWidth = end - bandStart;
    if (
      !best ||
      bandBalance > best.balance ||
      (bandBalance === best.balance && bandWidth > best.bandWidth)
    ) {
      best = { g: bandStart + bandWidth / 2, balance: bandBalance, bandWidth };
    }
    bandStart = null;
    bandBalance = 0;
  };

  for (let g = from; g <= to; g += 3) {
    const balance = isValid(g);
    if (balance !== null) {
      if (bandStart === null) bandStart = g;
      bandBalance = Math.max(bandBalance, balance);
    } else {
      closeBand(g);
    }
  }
  closeBand(to);
  const found = best as { g: number } | null;
  return found ? found.g : null;
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

/** Large-font lines, largest first — the name is almost always the biggest. */
function collectHeadingHints(lines: { text: string; maxSize: number }[], body: number): string[] {
  const hints: { text: string; size: number }[] = [];
  for (const { text, maxSize } of lines) {
    const t = text.trim();
    if (t.length < 2 || t.length > 60) continue;
    if (!/\p{L}/u.test(t)) continue;
    if (t.split(/\s+/).length > 6) continue;
    if (maxSize >= body * 1.15 && maxSize - body >= 0.8) hints.push({ text: t, size: maxSize });
  }
  return hints.sort((a, b) => b.size - a.size).map((h) => h.text);
}

/**
 * Turn one page's glyph runs into text (in reading order) + heading hints.
 * Exported for unit tests.
 */
export function itemsToPageText(items: PdfTextItem[], boldFonts: ReadonlySet<string> = new Set()): PageText {
  const rows = buildRows(items);
  if (rows.length === 0) return { text: "", headingLines: [], lineStyles: [] };

  const body = bodyFontSize(rows);
  const gutter = detectGutter(rows);

  const lines: Line[] = [];
  const pushLine = (runs: Run[], column: string, y: number) => {
    if (runs.length > 0) lines.push({ column, y, runs, joined: "", joinAt: -1 });
  };

  if (gutter === null) {
    for (const row of rows) pushLine(row.runs, "page", row.y);
  } else {
    // Band segmentation: rows crossing the gutter (typically the full-width
    // name header) separate bands; within a band, emit the entire left column
    // first, then the right column — true reading order for sidebar layouts.
    type Band = { left: Row[]; right: Row[] };
    const flushBand = (band: Band) => {
      for (const row of band.left) pushLine(row.runs, "left", row.y);
      for (const row of band.right) pushLine(row.runs, "right", row.y);
    };

    let band: Band = { left: [], right: [] };
    for (const row of rows) {
      const crosses = row.runs.some((run) => run.x < gutter - 2 && run.end > gutter + 2);
      if (crosses) {
        flushBand(band);
        band = { left: [], right: [] };
        pushLine(row.runs, "cross", row.y);
        continue;
      }
      const left = row.runs.filter((run) => run.end <= gutter);
      const right = row.runs.filter((run) => run.x > gutter);
      if (left.length) band.left.push({ y: row.y, runs: left });
      if (right.length) band.right.push({ y: row.y, runs: right });
    }
    flushBand(band);
  }

  // A bullet's wrapped lines hang at its text indent, right of the marker; a
  // new paragraph or heading starts back at the marker's edge or further
  // left. Such lines are marked so normalization joins them to the bullet —
  // even when they start with a capital or a verb ("…contribution." /
  // "Sandboxed LLM-generated code…" is one bullet, not two).
  let bulletX: number | null = null;
  let prev: Line | null = null;
  const lineRecords = joinWrappedLines(lines).map((l) => {
    const text = lineText(l);
    const x = l.runs[0].x;
    const size = l.runs[0].size;
    const dy = prev ? prev.y - l.y : 0;
    let continues = false;
    if (BULLET_START.test(text)) {
      bulletX = x;
    } else if (
      bulletX !== null &&
      prev !== null &&
      prev.column === l.column &&
      x > bulletX + 1.5 &&
      x <= bulletX + size * 4 &&
      dy > size * 0.8 &&
      dy < size * 1.9
    ) {
      continues = true;
    } else {
      bulletX = null;
    }
    prev = l;
    return {
      text: continues ? `${CONTINUATION_MARK}${text}` : text,
      maxSize: Math.max(...l.runs.map((r) => r.size)),
      bold: isBoldLine(l.runs, boldFonts),
    };
  });

  const lineStyles: LineStyle[] = [];
  const points: number[] = [];
  for (const l of lineRecords) {
    const t = l.text.trim();
    if (!t || t.length > 60 || t.split(/\s+/).length > 8) continue;
    lineStyles.push({ text: t, size: Math.round((l.maxSize / body) * 20) / 20, bold: l.bold });
    points.push(l.maxSize);
  }
  const letters = lineRecords.reduce((n, l) => n + l.text.replace(/\s+/g, "").length, 0);

  return {
    text: lineRecords.map((l) => l.text).join("\n"),
    headingLines: collectHeadingHints(lineRecords, body),
    lineStyles,
    body: { size: body, letters, points },
  };
}

/** Most of the line's letters are set in a bold face. */
function isBoldLine(runs: Run[], boldFonts: ReadonlySet<string>): boolean {
  if (boldFonts.size === 0) return false;
  let bold = 0;
  let total = 0;
  for (const r of runs) {
    const n = r.str.replace(/\s+/g, "").length;
    total += n;
    if (boldFonts.has(r.font)) bold += n;
  }
  return total > 0 && bold / total >= 0.6;
}

const lineKey = (line: string) => line.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
const EDGE_LINES = 3;

/**
 * Running headers and footers — "Jane Doe · jane@doe.dev" atop every page,
 * "Jane Doe — Résumé — Page 2" at the bottom — repeat in the same place on
 * several pages. Page 1's header is the real one and stays; every other copy,
 * and any repeated footer, goes, so it can't land inside a section.
 * Exported for unit tests.
 */
export function stripRunningHeadersFooters(pages: string[]): string[] {
  if (pages.length < 2) return pages;
  const split = pages.map((p) => p.split("\n"));
  const edges = (lines: string[]) => {
    const idx = lines.flatMap((l, i) => (l.trim() ? [i] : []));
    return { top: idx.slice(0, EDGE_LINES), bottom: idx.slice(-EDGE_LINES) };
  };
  const pageEdges = split.map(edges);

  const seen = (region: "top" | "bottom") => {
    const pagesWith = new Map<string, Set<number>>();
    split.forEach((lines, p) => {
      for (const i of pageEdges[p][region]) {
        const k = lineKey(lines[i]);
        if (k.length < 3) continue;
        if (!pagesWith.has(k)) pagesWith.set(k, new Set());
        pagesWith.get(k)!.add(p);
      }
    });
    return new Set([...pagesWith].filter(([, ps]) => ps.size >= 2).map(([k]) => k));
  };
  const runningTop = seen("top");
  const runningBottom = seen("bottom");

  return split.map((lines, p) => {
    const drop = new Set<number>();
    for (const i of pageEdges[p].top) if (p > 0 && runningTop.has(lineKey(lines[i]))) drop.add(i);
    for (const i of pageEdges[p].bottom) if (runningBottom.has(lineKey(lines[i]))) drop.add(i);
    return lines.filter((_, i) => !drop.has(i)).join("\n");
  });
}

/**
 * The slice of pdf.js's document proxy the extractor needs. Typed structurally
 * so Node tests can hand in a document opened with pdf.js's legacy build.
 */
export interface PdfDocumentLike {
  numPages: number;
  getPage(pageNumber: number): Promise<{
    getTextContent(): Promise<{ items: unknown[] }>;
    getAnnotations?(): Promise<unknown[]>;
    /** Loads the page's fonts into `commonObjs` (needed to see their names). */
    getOperatorList?(): Promise<unknown>;
    commonObjs?: { has(id: string): boolean; get(id: string): unknown };
    cleanup(): void;
  }>;
}

const BOLD_NAME = /bold|black|heavy|semibold|demibold|demi\b|extrabold|ultrabold/i;

/**
 * The font ids on a page whose face is bold. pdf.js only reports a font's
 * real name ("ABCDEF+Calibri-Bold") once the page's operators are loaded; if
 * that fails the page simply has no bold information.
 */
async function boldFontIds(
  page: Awaited<ReturnType<PdfDocumentLike["getPage"]>>,
  items: PdfTextItem[],
): Promise<Set<string>> {
  const bold = new Set<string>();
  if (!page.getOperatorList || !page.commonObjs) return bold;
  try {
    await page.getOperatorList();
    for (const id of new Set(items.map((i) => i.fontName).filter((f): f is string => !!f))) {
      if (!page.commonObjs.has(id)) continue;
      const font = page.commonObjs.get(id) as { name?: string; bold?: boolean; black?: boolean } | null;
      if (font && (font.bold || font.black || BOLD_NAME.test(font.name ?? ""))) bold.add(id);
    }
  } catch {
    // Style is a bonus signal; never fail an import over it.
  }
  return bold;
}

/** Web/mail targets of a page's link annotations. */
function annotationLinks(annotations: unknown[]): string[] {
  const links: string[] = [];
  for (const a of annotations as { subtype?: string; url?: string; unsafeUrl?: string }[]) {
    const url = a.subtype === "Link" ? a.url ?? a.unsafeUrl : undefined;
    if (!url) continue;
    if (/^(?:https?:|mailto:)/i.test(url)) links.push(url);
    // Word sometimes stores "github.com/alex" or "www.site.dev" without a scheme.
    else if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#]\S*)?$/i.test(url)) links.push(`https://${url}`);
  }
  return links;
}

/** Extract text, heading hints and links from an already-opened pdf.js document. */
export async function extractPagesFromDocument(
  doc: PdfDocumentLike,
): Promise<PdfExtraction> {
  const pages: string[] = [];
  const hints = new Set<string>();
  const links = new Set<string>();
  const pageTexts: PageText[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as PdfTextItem[];
    const pageText = itemsToPageText(items, await boldFontIds(page, items));
    pages.push(pageText.text);
    pageTexts.push(pageText);
    for (const h of pageText.headingLines) hints.add(h);
    // Links are a bonus: a damaged annotation must never fail the import.
    const annotations = await page.getAnnotations?.().catch(() => []);
    for (const l of annotationLinks(annotations ?? [])) links.add(l);
    page.cleanup();
  }
  // Sizes relative to ONE body size for the whole document — a short last
  // page has a different median, and the same heading must compare equal.
  const main = pageTexts.reduce<PageText | null>(
    (best, p) => (p.body && (!best?.body || p.body.letters > best.body.letters) ? p : best),
    null,
  );
  const docBody = main?.body?.size ?? 10;
  const lineStyles: LineStyle[] = pageTexts.flatMap((p) =>
    p.lineStyles.map((s, i) => ({ ...s, size: Math.round(((p.body?.points[i] ?? docBody) / docBody) * 20) / 20 })),
  );
  const text = stripRunningHeadersFooters(pages).join("\n\n");
  // Under a few letters per page: there is no text layer to read.
  const letters = text.replace(/[^\p{L}\p{N}]/gu, "").length;
  const scanned = doc.numPages > 0 && letters < 20 * doc.numPages;
  return { text, headingLines: [...hints], links: [...links], lineStyles, scanned };
}

/** Extract text, heading hints and links from raw PDF bytes. */
export async function extractPdfPagesFromData(
  data: Uint8Array,
): Promise<PdfExtraction> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ data });
  try {
    return await extractPagesFromDocument(await loadingTask.promise);
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

export async function extractPdfDocument(file: File): Promise<PdfExtraction> {
  return extractPdfPagesFromData(new Uint8Array(await file.arrayBuffer()));
}

export async function extractPdfText(file: File): Promise<string> {
  return (await extractPdfDocument(file)).text;
}
