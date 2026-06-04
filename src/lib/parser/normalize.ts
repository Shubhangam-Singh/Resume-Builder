/**
 * Text normalization — ported from the reference C# `NormalizeText`.
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

  // Curly quotes -> straight quotes.
  text = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

  // Normalize dash glyphs (en/em/figure/minus/box) to a plain hyphen so date
  // ranges and separators have one separator to handle.
  text = text.replace(/[‒–—―−─━]/g, "-");

  // Normalize bullet glyphs to a single marker so they read as line starters.
  text = text.replace(
    /[•●○◦◆▪■▸►▶➤★]/g,
    "•",
  );

  // Collapse runs of spaces on the SAME line (preserve '\n').
  text = text.replace(/[^\S\n]{2,}/g, " ");

  // Trim leading/trailing spaces around each newline.
  text = text.replace(/[^\S\n]*\n[^\S\n]*/g, "\n");

  // Collapse 3+ newlines into a single blank line.
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
