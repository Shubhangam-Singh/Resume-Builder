/**
 * Section detection — ported from the reference C# `DetectSections` /
 * `IsSectionHeader`. Recognizes headers three ways: exact full-line, short-line
 * prefix (so "Technical Skills (Backend)" still matches), and slang/abbrev
 * aliases ("SKILLZ", "EDUCASHUN", "EXP."). Decoration-only lines are dropped.
 */

export type SectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "publications"
  | "languages";

export type Sections = Record<string, string>;

const SECTION_ALTERNATIONS: { alt: string; key: SectionKey }[] = [
  {
    alt: "skills|technical skills|key skills|core skills|skills summary|technical proficiencies|technologies|tech stack|tools (and|&) technologies|core competencies|areas of expertise|technical expertise|skill set|programming languages|languages (and|&) frameworks|software skills|it skills|technical skill set|my stack|tools i use|tech skills",
    key: "skills",
  },
  {
    alt: "experience|work experience|professional experience|employment history|career history|work history|professional background|relevant experience|industry experience|employment|experience summary|professional history|previous employment|positions held|roles|work|jobs|internships|volunteering|open source contributions",
    key: "experience",
  },
  {
    alt: "summary|professional summary|profile|career objective|objective|about me|executive summary|profile summary|career summary|personal statement|about|career profile|personal profile|introduction|intro|bio",
    key: "summary",
  },
  {
    alt: "education|educational qualifications|academic background|academic qualifications|qualifications|educational background|academics|degrees|education (and|&) qualifications|educational details|academic history|schooling|training",
    key: "education",
  },
  {
    alt: "projects|project|personal projects|academic projects|key projects|notable projects|side projects|project experience|portfolio|projects undertaken|my projects|selected projects",
    key: "projects",
  },
  {
    alt: "certifications|certification|certificates|certificate|licenses|license|professional certifications|achievements|achievement|accomplishments|awards|award|honors|honours|credentials|badges",
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

/** Returns the section key if `line` is a header, else null. */
export function detectSectionHeader(line: string): SectionKey | null {
  if (line.length < 2 || line.length > 80) return null;

  // "Label: a, b, c" is a labeled content line (e.g. a skills subcategory like
  // "Languages: Python, Java"), NOT a section header — even though "Languages"
  // is itself a section word. The trailing comma-list is the giveaway.
  const colon = line.indexOf(":");
  if (colon > 0 && line.slice(colon + 1).includes(",")) return null;

  // Strip decorative non-alphanumeric prefixes ("// WORK", ">> OBJECTIVE").
  let s = line.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  // Strip trailing decorative suffixes ("]]", "))").
  s = s.replace(/[^\p{L}\p{N}\s]+$/u, "").trim();
  // Strip a leading bullet / arabic / roman numbering.
  s = s.replace(/^[•\-*]+\s*/, "");
  s = s.replace(/^\d{1,2}[.)]\s+/, "");
  s = s.replace(/^[IVXLC]{1,5}[.)]\s+/i, "");
  // Strip trailing decorators/punctuation following a header.
  s = s.replace(/[:\-|.\s]+$/, "").trim();

  if (s.length === 0) return null;

  const lower = s.toLowerCase();

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

/** Split normalized text into section blobs keyed by `SectionKey`. */
export function detectSections(text: string): Sections {
  const sections: Sections = {};
  const lines = text.split("\n");

  let current = "header";
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
      if (!(current in sections)) sections[current] = "";
      continue;
    }

    sections[current] += line + "\n";
  }

  return sections;
}
