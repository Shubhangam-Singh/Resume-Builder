/**
 * Turn mammoth's DOCX→HTML output into parser-ready text. mammoth's raw-text
 * mode drops list bullets (they're Word numbering, not characters), so bullet
 * points arrived as plain paragraphs and got mistaken for summaries or new
 * jobs. The HTML keeps the structure:
 *   - <li>          → "• item" lines
 *   - <h1>…<h6>     → heading hints (Word's Heading styles)
 *   - <td>/<th>     → one line per table row, cells joined with " | "
 *   - <a href>      → collected links (profile / website targets)
 * Pure string processing so it runs in tests without a DOM.
 */

export interface HtmlText {
  text: string;
  headingLines: string[];
  links: string[];
  /** Style of each short paragraph (Word Heading level → size, bold runs). */
  lineStyles: { text: string; size: number; bold: boolean }[];
}

// Relative sizes for Word's Heading 1–6 (mammoth drops the real font size).
const HEADING_SIZE: Record<string, number> = { h1: 1.6, h2: 1.4, h3: 1.25, h4: 1.15, h5: 1.1, h6: 1.05 };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const BLOCK = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "tr", "table", "ul", "ol", "br"]);

export function htmlToResumeText(html: string): HtmlText {
  const lines: string[] = [];
  const headingLines: string[] = [];
  const links: string[] = [];
  const lineStyles: HtmlText["lineStyles"] = [];

  let line = "";
  let cells: string[] | null = null; // inside a table row
  let heading = "";
  let afterBold = false; // the previous token closed a <strong>/<b> run
  let boldDepth = 0;
  let boldLetters = 0;
  let letters = 0;

  const endLine = () => {
    const t = line.replace(/[^\S\n]+/g, " ").trim();
    // A list item whose text arrives in a nested <p>: keep the bullet waiting.
    if (t === "•") return;
    if (cells) {
      if (t) cells.push(t);
    } else if (t) {
      lines.push(t);
      if (heading) headingLines.push(t.replace(/^•\s*/, ""));
      if (t.length <= 60 && t.split(/\s+/).length <= 8 && !t.startsWith("•")) {
        lineStyles.push({
          text: t,
          size: heading ? HEADING_SIZE[heading] : 1,
          bold: !!heading || (letters > 0 && boldLetters / letters >= 0.6),
        });
      }
    }
    line = "";
    boldLetters = 0;
    letters = 0;
  };

  const TOKEN = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(html)) !== null) {
    const [, closing, rawTag, attrs, textPart] = m;
    if (textPart !== undefined) {
      const t = decodeEntities(textPart);
      // "<strong>Certificate name</strong>  Issuer · 2022": a bold title
      // followed by spaced-out metadata — keep the two fields apart.
      line += afterBold && /^[^\S\n]{2,}\S/.test(t) && line.trim() ? ` | ${t.trimStart()}` : t;
      afterBold = false;
      const n = t.replace(/[^\p{L}\p{N}]/gu, "").length;
      letters += n;
      if (boldDepth > 0) boldLetters += n;
      continue;
    }
    const tag = rawTag.toLowerCase();
    afterBold = closing === "/" && (tag === "strong" || tag === "b");
    if (tag === "strong" || tag === "b") boldDepth = Math.max(0, boldDepth + (closing ? -1 : 1));
    if (tag === "a" && !closing) {
      const href = attrs.match(/href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'/i);
      const url = decodeEntities(href?.[1] ?? href?.[2] ?? "");
      if (/^(?:https?:|mailto:)/i.test(url)) links.push(url.replace(/^mailto:/i, ""));
      continue;
    }
    if (tag === "td" || tag === "th") {
      if (closing) endLine();
      continue;
    }
    if (tag === "tr") {
      if (!closing) cells = [];
      else if (cells) {
        endLine();
        const row = cells.join(" | ");
        cells = null;
        if (row) lines.push(row);
      }
      continue;
    }
    if (!BLOCK.has(tag)) continue;
    endLine();
    if (/^h[1-6]$/.test(tag)) heading = closing ? "" : tag;
    if (tag === "li") line = closing ? "" : "• ";
    if ((tag === "ul" || tag === "ol") && closing) line = "";
  }
  endLine();

  return { text: lines.join("\n"), headingLines, links, lineStyles };
}
