/**
 * Text normalization — ported from the reference C# `NormalizeText`, extended
 * for old-PDF artifacts (ligatures, Wingdings bullets, hyphenated line wraps).
 *
 * Newlines are load-bearing: every downstream step relies on line structure, so
 * we collapse same-line whitespace with `[^\S\n]` (never `\s`, which would eat
 * '\n' and destroy the layout the parser depends on).
 */
export function normalizeText(input: string): string {
  if (!input) return "";

  // Unify line endings first so the rest of the pipeline only sees '\n'.
  let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Strip invisible characters PDF/DOCX extraction frequently injects.
  text = text
    .replace(/﻿/g, "") // BOM
    .replace(/​/g, "") // zero-width space
    .replace(/‌/g, "") // zero-width non-joiner
    .replace(/‍/g, "") // zero-width joiner
    .replace(/­/g, ""); // soft hyphen

  // Non-breaking space + tabs collapse to a normal space (newlines untouched).
  text = text.replace(/ /g, " ").replace(/\t/g, " ");

  // Typographic ligatures — embedded fonts in old PDFs emit these as single
  // glyphs ("Certiﬁed", "Proﬁle"), which breaks every keyword match downstream.
  text = text
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/ﬅ/g, "ft")
    .replace(/ﬆ/g, "st");

  // Curly quotes -> straight quotes.
  text = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

  // Normalize dash glyphs (en/em/figure/minus/box) to a plain hyphen so date
  // ranges and separators have one separator to handle.
  text = text.replace(/[‒–—―−─━]/g, "-");

  // Old Word→PDF exports render bullets as Wingdings/Symbol glyphs that land in
  // the Unicode private-use area — map them all to a plain bullet.
  text = text.replace(/[\uE000-\uF8FF]/g, "•");

  // Normalize bullet glyphs to a single marker so they read as line starters.
  text = text.replace(
    /[•●○◦◆◇▪■□▹▸►▶➔➜➝➞➢➣➤✓✔✦✧❖❑❒★‣⁃∙]/g,
    "•",
  );

  // Re-join words hyphenated across a line wrap ("develop-\nment"). Lowercase
  // on both sides only, so date ranges split across lines stay intact.
  text = text.replace(/([a-z])-\n([a-z])/g, "$1$2");

  // Collapse runs of spaces on the SAME line (preserve '\n').
  text = text.replace(/[^\S\n]{2,}/g, " ");

  // Trim leading/trailing spaces around each newline.
  text = text.replace(/[^\S\n]*\n[^\S\n]*/g, "\n");

  // Collapse 3+ newlines into a single blank line.
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
