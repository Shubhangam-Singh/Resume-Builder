/**
 * Text normalization — ported from the reference C# `NormalizeText`, extended
 * for old-PDF artifacts (ligatures, Wingdings bullets, hyphenated line wraps),
 * designed layouts (letter-spaced headings) and Word/plain-text alignment tabs.
 *
 * Newlines are load-bearing: every downstream step relies on line structure, so
 * we collapse same-line whitespace with `[^\S\n]` (never `\s`, which would eat
 * '\n' and destroy the layout the parser depends on).
 */

// Words that commonly start a hyphenated compound. A line wrap after one of
// these ("cross-⏎functional") keeps its hyphen; other wraps ("develop-⏎ment")
// were hyphenation and re-join into one word.
const COMPOUND_PREFIXES = new Set([
  "cross", "full", "end", "self", "well", "high", "low", "multi", "non", "co",
  "post", "pre", "real", "long", "short", "front", "back", "open", "user",
  "data", "cloud", "on", "off", "peer", "cost", "time", "state", "best", "top",
  "fast", "team", "client", "customer", "mission", "cutting", "hands",
  "problem", "results", "goal", "detail", "test", "event", "value", "market",
  "decision", "award", "world", "first", "year", "part", "half", "mid",
  "inter", "semi", "sub", "super", "anti", "auto", "e", "x", "large", "small",
  "mobile", "web", "server", "role", "rule", "fine", "hand", "know",
]);

// A wrapped fragment that is only a word ending ("test-⏎ing") was split by
// hyphenation, whatever came before it.
const SUFFIX_FRAGMENT =
  /^(?:ing|ings|ed|er|ers|est|ly|ment|ments|tion|tions|sion|sions|ness|ity|ities|ance|ence|able|ible|al|ally|ive|ous|ure|ures|ism|ist|ists|ize|ise|ized|ised|ation|ations)(?![a-z])/;

/**
 * Re-join a word broken across a line wrap. URLs keep their hyphen and lose
 * the break ("…/in/rahul-⏎sharma"); compounds keep their hyphen; ordinary
 * hyphenation ("develop-⏎ment") joins into one word.
 */
function rejoinWrappedHyphens(text: string): string {
  return text.replace(/(\S+)-\n(\S+)/g, (whole, left: string, right: string) => {
    if (/[/@]|\.[a-z]/i.test(left) || right.includes("/")) return `${left}-${right}`;
    if (!/[a-z]$/.test(left) || !/^[a-z]/.test(right)) return whole;
    if (SUFFIX_FRAGMENT.test(right)) return `${left}${right}`;
    const lastWord = left.match(/[a-z]+$/i)?.[0].toLowerCase() ?? "";
    return COMPOUND_PREFIXES.has(lastWord) ? `${left}-${right}` : `${left}${right}`;
  });
}

// Words that make up section headings. pdf.js reports a letter-spaced heading
// with one space between every letter, so the gap between its words is lost:
// "O P E N S O U R C E". A run that splits wholly into these words gets its
// word breaks back ("OPEN SOURCE", "WORK EXPERIENCE"); anything else stays
// one word.
const HEADING_WORDS = new Set([
  "about", "academic", "accomplishments", "achievements", "activities", "additional", "affiliations",
  "and", "areas", "awards", "background", "career", "certificates", "certifications", "co",
  "community", "competencies", "competitions", "conferences", "contact", "contributions", "core",
  "courses", "coursework", "curricular", "declaration", "details", "development", "digital",
  "education", "employment", "experience", "expertise", "extra", "extracurricular", "freelance",
  "grants", "hackathons", "highlights", "history", "hobbies", "honors", "honours", "information",
  "interests", "internship", "internships", "involvement", "key", "languages", "leadership",
  "licenses", "me", "memberships", "military", "objective", "of", "open", "other", "patents",
  "personal", "portfolio", "positions", "presentations", "professional", "profile", "projects",
  "publications", "qualifications", "recognition", "references", "relevant", "research",
  "responsibilities", "responsibility", "scholarships", "selected", "service", "side", "skills",
  "soft", "source", "speaking", "strengths", "summary", "talks", "teaching", "technical",
  "technologies", "tools", "training", "volunteer", "volunteering", "work", "workshops",
]);

/** "OPENSOURCE" → "OPEN SOURCE" when every piece is a heading word (fewest pieces). */
function splitHeadingWords(run: string): string {
  const lower = run.toLowerCase();
  if (run.length < 6 || HEADING_WORDS.has(lower) || !/^\p{Lu}+$/u.test(run)) return run;
  // best[i] = fewest words covering lower.slice(0, i), with where the last word starts.
  const best: { count: number; from: number }[] = [{ count: 0, from: -1 }];
  for (let i = 1; i <= lower.length; i++) {
    best[i] = { count: Infinity, from: -1 };
    for (let j = Math.max(0, i - 16); j <= i - 2; j++) {
      if (best[j].count + 1 < best[i].count && HEADING_WORDS.has(lower.slice(j, i))) {
        best[i] = { count: best[j].count + 1, from: j };
      }
    }
  }
  if (!Number.isFinite(best[lower.length].count) || best[lower.length].count > 4) return run;
  const words: string[] = [];
  for (let i = lower.length; i > 0; i = best[i].from) words.unshift(run.slice(best[i].from, i));
  return words.join(" ");
}

// A run of capitals 1–2 letters apart: "E X P E R I E N C E", "S U M M A RY"
// (kerning glues pairs like "RY"). Requires ≥4 groups, mostly single letters.
const LETTER_SPACED_RUN = /^(?:\p{Lu}{1,2}[^\S\n]+){3,}\p{Lu}{1,2}(?=[^\S\n]|$)/u;

/**
 * Collapse a letter-spaced heading at the start of a line. Wider gaps inside
 * the run are word breaks. When content follows on the same line (a heading
 * set in the left margin), the heading goes onto its own line.
 */
function collapseLetterSpacing(line: string): { line: string; heading?: string } {
  const m = line.match(LETTER_SPACED_RUN);
  if (!m) return { line };
  const run = m[0];
  const groups = run.trim().split(/[^\S\n]+/);
  const singles = groups.filter((g) => g.length === 1).length;
  if (singles < groups.length * 0.6) return { line };

  const word = run
    .trim()
    .split(/[^\S\n]{2,}/)
    .map((w) => splitHeadingWords(w.replace(/[^\S\n]+/g, "")))
    .join(" ");
  const rest = line.slice(run.length).trim();
  return { line: rest ? `${word}\n${rest}` : word, heading: word };
}

// A letter-spaced heading hyphenated across two lines in a narrow margin:
// "C E R T I F I C A- <content>" / "T I O N S".
const SPACED_HEAD_BROKEN = /^((?:\p{Lu}{1,2}[^\S\n]+){2,}\p{Lu}{1,2})-(?=[^\S\n]|$)/u;
const SPACED_HEAD_TAIL = /^(?:\p{Lu}{1,2}[^\S\n]+)*\p{Lu}{1,2}(?=[^\S\n]|$)/u;

function joinBrokenSpacedHeading(a: string, b: string | undefined): string[] | null {
  const head = a.match(SPACED_HEAD_BROKEN);
  const tail = b?.match(SPACED_HEAD_TAIL);
  if (!head || !tail || b === undefined) return null;
  const word = head[1].replace(/\s+/g, "") + tail[0].replace(/\s+/g, "");
  return [word, a.slice(head[0].length).trim(), b.slice(tail[0].length).trim()].filter(Boolean);
}

/**
 * Collapse letter-spaced headings line by line (see collapseLetterSpacing),
 * reporting each collapsed heading: letter-spacing is how the document sets
 * its headings, which the section detector can learn from.
 */
function collapseSpacedHeadings(text: string): { text: string; headings: string[] } {
  const lines = text.split("\n").map((l) => l.trim());
  const out: string[] = [];
  const headings: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const joined = joinBrokenSpacedHeading(lines[i], lines[i + 1]);
    if (joined) {
      out.push(...joined);
      headings.push(joined[0]);
      i++;
    } else {
      const collapsed = collapseLetterSpacing(lines[i]);
      out.push(collapsed.line);
      if (collapsed.heading) headings.push(collapsed.heading);
    }
  }
  return { text: out.join("\n"), headings };
}

const FULL_NUMERIC_DATE = /(?<![\d/.])(\d{1,2})([/.])(\d{1,2})\2((?:19|20)\d{2})(?![\d/.])/g;

/**
 * "01/03/2020" is March in Europe and January in the US. A document settles
 * it for itself: one date whose first part can't be a month ("15/09/2017")
 * makes the whole résumé day-first, and every full date is rewritten to an
 * unambiguous "MM/YYYY". Without such evidence the dates are left alone
 * (month-first, the US reading).
 */
function resolveDayFirstDates(text: string): string {
  let dayFirst = false;
  let monthFirst = false;
  for (const m of text.matchAll(FULL_NUMERIC_DATE)) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    if (a > 12 && b <= 12) dayFirst = true;
    if (b > 12 && a <= 12) monthFirst = true;
  }
  if (!dayFirst || monthFirst) return text;
  return text.replace(FULL_NUMERIC_DATE, (whole, _day: string, _sep: string, month: string, year: string) =>
    Number(month) >= 1 && Number(month) <= 12 ? `${month.padStart(2, "0")}/${year}` : whole,
  );
}

// U+2028 / U+2029 (built from char codes: as literals they end a regex line).
const LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, "g");

// U+2063, the PDF extractor's mark for a wrapped bullet line (see
// CONTINUATION_MARK in import/pdf.ts).
const CONTINUATION = String.fromCharCode(0x2063);
const CONTINUED_HYPHEN = new RegExp(`-[^\\S\\n]*\\n${CONTINUATION}`, "g");
const CONTINUED_LINE = new RegExp(`[^\\S\\n]*\\n${CONTINUATION}[^\\S\\n]*`, "g");

export function normalizeText(input: string): string {
  return normalizeTextDetailed(input).text;
}

/** Normalized text, plus the letter-spaced headings collapsed on the way. */
export function normalizeTextDetailed(input: string): { text: string; spacedHeadings: string[] } {
  if (!input) return { text: "", spacedHeadings: [] };

  // Compatibility folding: ligatures, full-width forms, "𝗯𝗼𝗹𝗱" styled letters
  // pasted from LinkedIn, non-breaking spaces, ellipses…
  let text = input.normalize("NFKC");

  // Unify line endings first so the rest of the pipeline only sees '\n'.
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(LINE_SEPARATORS, "\n");

  // Lines the PDF extractor marked as a bullet's hanging-indent wrap join the
  // line above. A hyphenated wrap keeps its line break here so the
  // hyphenation rules below decide ("dash-⏎board" → "dashboard").
  text = text
    .replace(CONTINUED_HYPHEN, "-\n")
    .replace(CONTINUED_LINE, " ")
    .split(CONTINUATION).join("");

  // Strip invisible characters PDF/DOCX extraction frequently injects.
  text = text.replace(/[﻿​‌‍⁠­]/g, "");

  // Any remaining non-breaking or typographic space → plain space.
  text = text.replace(/[  -   　]/g, " ");

  // Typographic ligatures (NFKC already folds most; kept for safety).
  text = text
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬀ/g, "ff")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl")
    .replace(/ﬅ/g, "ft")
    .replace(/ﬆ/g, "st");

  // Curly quotes -> straight quotes.
  text = text.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"');

  // Every dash/hyphen glyph → a plain hyphen, so date ranges and separators
  // have one character to handle (includes U+2010/U+2011 Word hyphens).
  text = text.replace(/[‐-―−─━﹘﹣－]/g, "-");

  // Old Word→PDF exports render bullets as Wingdings/Symbol glyphs that land in
  // the Unicode private-use area — map them all to a plain bullet.
  text = text.replace(/[-]/g, "•");

  // Normalize bullet glyphs to a single marker so they read as line starters.
  text = text.replace(
    /[•●○◦◆◇▪■□▫◾◼▹▸►▶▷➔➜➝➞➢➣➤→⇒❯✓✔✦✧❖❑❒★‣⁃∙⦿◉⬤♦]/g,
    "•",
  );

  // Tabs: a tab after a bullet is just spacing; a tab between two pieces of
  // text is column alignment (Word / plain-text dates) → explicit separator.
  text = text.replace(/•[^\S\n]*\t+/g, "• ");
  text = text.replace(/(\S)[^\S\n]*\t[\t ]*(?=\S)/g, "$1 | ");
  text = text.replace(/\t/g, " ");

  // Letter-spaced headings, line by line, before spaces are collapsed (the
  // wider gaps between words are still visible here).
  const spaced = collapseSpacedHeadings(text);
  text = spaced.text;

  text = rejoinWrappedHyphens(text);
  text = resolveDayFirstDates(text);

  // Page furniture: "Page 1 of 2", "Page 3", "2 / 3" alone on a line.
  // The whole line goes, so an entry broken across pages reads as one.
  text = text.replace(/^[^\S\n]*(?:page[^\S\n]+\d{1,2}(?:[^\S\n]*(?:of|\/)[^\S\n]*\d{1,2})?|\d{1,2}[^\S\n]*(?:of|\/)[^\S\n]*\d{1,2})[^\S\n]*(?:\n|$)/gim, "");

  // Collapse runs of spaces on the SAME line (preserve '\n').
  text = text.replace(/[^\S\n]{2,}/g, " ");

  // Trim leading/trailing spaces around each newline.
  text = text.replace(/[^\S\n]*\n[^\S\n]*/g, "\n");

  // Collapse 3+ newlines into a single blank line.
  text = text.replace(/\n{3,}/g, "\n\n");

  return { text: text.trim(), spacedHeadings: spaced.headings };
}
