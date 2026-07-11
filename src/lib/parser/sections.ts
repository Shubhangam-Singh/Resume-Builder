/**
 * Section detection — ported from the reference C# `DetectSections` /
 * `IsSectionHeader`, extended with:
 *   - heading hints from the PDF extractor (lines set in a larger font),
 *   - unknown-header isolation: a short ALL-CAPS or hinted line that isn't a
 *     known section still STARTS a new (ignored) section, so "DECLARATION" or
 *     "INTERESTS" content no longer bleeds into Experience/Education,
 *   - an explicit "other" bucket for common non-resume-data sections.
 * Recognizes headers three ways: exact full-line, short-line prefix (so
 * "Technical Skills (Backend)" still matches), and slang/abbrev aliases.
 */
import { ROLE_WORD_SET } from "./name";

export type SectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "publications"
  | "languages"
  | "other";

export type Sections = Record<string, string>;

/** Extra signals the extractor can pass in (e.g. large-font lines in a PDF). */
export interface ParseHints {
  headingLines?: string[];
}

const SECTION_ALTERNATIONS: { alt: string; key: SectionKey }[] = [
  {
    alt: "skills|technical skills|key skills|core skills|skills summary|technical proficiencies|technologies|tech stack|tools (and|&) technologies|core competencies|areas of expertise|technical expertise|skill set|programming languages|languages (and|&) frameworks|software skills|it skills|technical skill set|my stack|tools i use|tech skills|skills (and|&) interests|skills (and|&) abilities|competencies",
    key: "skills",
  },
  {
    alt: "experience|work experience|professional experience|employment history|career history|work history|professional background|relevant experience|industry experience|employment|experience summary|professional history|previous employment|positions held|roles|work|jobs|internships?|volunteering|volunteer experience|open source contributions|professional engagements|work profile|career progression|leadership experience",
    key: "experience",
  },
  {
    alt: "summary|professional summary|profile|career objective|objective|about me|executive summary|profile summary|career summary|personal statement|about|career profile|personal profile|introduction|intro|bio|summary of qualifications|highlights of qualifications|professional profile",
    key: "summary",
  },
  {
    alt: "education|educational qualifications|academic background|academic qualifications|qualifications|educational background|academics|degrees|education (and|&) qualifications|educational details|academic history|schooling|training|relevant coursework|coursework|academic details",
    key: "education",
  },
  {
    alt: "projects|project|personal projects|academic projects|key projects|notable projects|side projects|project experience|portfolio|projects undertaken|my projects|selected projects|freelance projects",
    key: "projects",
  },
  {
    alt: "certifications|certification|certificates|certificate|licenses|license|professional certifications|achievements|achievement|accomplishments|awards|award|honors|honours|credentials|badges|awards (and|&) honors|awards (and|&) achievements",
    key: "certifications",
  },
  {
    alt: "publications|publication|research|research papers|papers|patents|talks|presentations|conferences",
    key: "publications",
  },
  {
    alt: "languages|language|language proficiency|languages known|languages spoken|spoken languages",
    key: "languages",
  },
];

// Sections that carry no resume data for the builder. Matched FULL-LINE only
// (prefix matching would eat prose like "Interests include…"). Routing them to
// "other" keeps their content out of whatever section came before.
const OTHER_FULL_LINE = new RegExp(
  "^(?:interests?|hobbies|hobbies (?:and|&) interests|references?|referees|declaration|personal details|personal information|personal data|strengths|additional information|additional info|extracurricular activities|extracurriculars?|activities|affiliations|memberships|professional memberships|social profiles|links|online presence|contact|contact information|contact details|contact me|get in touch)$",
  "i",
);

const SECTION_PATTERNS = SECTION_ALTERNATIONS.map(({ alt, key }) => ({
  full: new RegExp(`^(?:${alt})$`, "i"),
  prefix: new RegExp(`^(?:${alt})\\b`, "i"),
  key,
}));

const SLANG_ALIASES: { pattern: RegExp; key: SectionKey }[] = [
  { pattern: /\bskillz\b/i, key: "skills" },
  { pattern: /\beducashun\b/i, key: "education" },
  { pattern: /\bqualz\b/i, key: "education" },
  { pattern: /\bcertifcates\b|\bcerts\b/i, key: "certifications" },
  { pattern: /\bworkplace\b/i, key: "experience" },
  { pattern: /^exp\.?$/i, key: "experience" },
  { pattern: /^edu\.?$/i, key: "education" },
  { pattern: /^tech\.?$/i, key: "skills" },
];

// A line beginning with a header word may still be prose ("Experience working
// at ..."). Only treat a prefix hit as a header when the line is short enough.
const MAX_PREFIX_HEADER_LENGTH = 60;

// Lines made only of decoration act as header underlines and carry no content.
const DECORATION_LINE = /^[=\-_~*•\s]{3,}$/;

/** Strip decorations/numbering so "// WORK:" and "2) Skills -" match cleanly. */
function stripHeaderDecoration(line: string): string {
  let s = line.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  s = s.replace(/[^\p{L}\p{N}\s]+$/u, "").trim();
  s = s.replace(/^[•\-*]+\s*/, "");
  s = s.replace(/^\d{1,2}[.)]\s+/, "");
  s = s.replace(/^[IVXLC]{1,5}[.)]\s+/i, "");
  s = s.replace(/[:\-|.\s]+$/, "").trim();
  return s;
}

/** Returns the section key if `line` is a known header, else null. */
export function detectSectionHeader(line: string): SectionKey | null {
  if (line.length < 2 || line.length > 80) return null;

  // "Label: a, b, c" is a labeled content line (e.g. a skills subcategory like
  // "Languages: Python, Java"), NOT a section header — even though "Languages"
  // is itself a section word. The trailing comma-list is the giveaway.
  const colon = line.indexOf(":");
  if (colon > 0 && line.slice(colon + 1).includes(",")) return null;

  const s = stripHeaderDecoration(line);
  if (s.length === 0) return null;

  const lower = s.toLowerCase();

  if (OTHER_FULL_LINE.test(lower)) return "other";

  for (const { full, key } of SECTION_PATTERNS) {
    if (full.test(lower)) return key;
  }
  if (lower.length <= MAX_PREFIX_HEADER_LENGTH) {
    for (const { prefix, key } of SECTION_PATTERNS) {
      if (prefix.test(lower)) return key;
    }
  }
  for (const { pattern, key } of SLANG_ALIASES) {
    if (pattern.test(lower)) return key;
  }
  return null;
}

function hasRoleWord(text: string): boolean {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((w) => ROLE_WORD_SET.has(w));
}

/**
 * An UNKNOWN section header: short, header-shaped, and either flagged by the
 * extractor as large-font or written in ALL CAPS. Starting a fresh (ignored)
 * section for these keeps stray sections from polluting the previous one.
 * Only applies after the first known header — the top-of-page name/label are
 * also short and large, and they must stay in the header bucket.
 */
function isUnknownHeader(line: string, hintSet: Set<string>): boolean {
  if (line.length < 3 || line.length > 40) return false;
  if (/[@,.!?;:•|]|\d/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length > 4) return false;
  if (hasRoleWord(line)) return false; // likely a job-title line, keep as content

  const allCaps =
    line === line.toUpperCase() && /[A-Z]{3}/.test(line);
  return allCaps || hintSet.has(line.toLowerCase());
}

/** Split normalized text into section blobs keyed by `SectionKey`. */
export function detectSections(text: string, hints?: ParseHints): Sections {
  const sections: Sections = {};
  const lines = text.split("\n");

  const hintSet = new Set(
    (hints?.headingLines ?? [])
      .map((h) => h.trim().toLowerCase())
      .filter((h) => h.length >= 3 && h.length <= 48),
  );

  let current = "header";
  let seenKnown = false;
  let otherIdx = 0;
  sections[current] = "";

  for (const raw of lines) {
    const line = raw.trim();

    if (line.length === 0) {
      sections[current] += "\n";
      continue;
    }
    if (DECORATION_LINE.test(line)) continue;

    const header = detectSectionHeader(line);
    if (header) {
      current = header;
      seenKnown = true;
      if (!(current in sections)) sections[current] = "";
      continue;
    }

    if (seenKnown && isUnknownHeader(line, hintSet)) {
      current = `other:${otherIdx++}`;
      sections[current] = "";
      continue;
    }

    sections[current] += line + "\n";
  }

  return sections;
}
