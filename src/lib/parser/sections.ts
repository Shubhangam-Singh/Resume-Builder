/**
 * Section detection — ported from the reference C# `DetectSections` /
 * `IsSectionHeader`, extended with:
 *   - heading hints from the PDF extractor (lines set in a larger font),
 *   - unknown-header isolation: a short heading that isn't a known section
 *     still STARTS a new bucket (kept as a custom section), so "POSITIONS OF
 *     RESPONSIBILITY" content no longer bleeds into Experience/Education,
 *   - an explicit "other" bucket for sections that aren't résumé content
 *     (declaration, personal details, references, contact blocks).
 * Recognizes headers four ways: exact full-line, header-shaped prefix
 * ("Technical Skills (Backend)"), squashed ("W O R K-EXPERIENCE"), and
 * slang/abbreviation aliases.
 */
import { COMPANY_WORD, INSTITUTION_RE, hasRoleWord, isLocationLine } from "./lexicon";
import { looksLikeName } from "./name";

export type SectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "awards"
  | "publications"
  | "languages"
  | "other";

export type Sections = Record<string, string>;

/** Section text plus the heading each bucket was opened with. */
export interface DetectedSections {
  sections: Sections;
  /** Original heading text per bucket key (first heading wins). */
  titles: Record<string, string>;
}

/** Extra signals the extractor can pass in (e.g. large-font lines in a PDF). */
export interface ParseHints {
  /** Large-font lines, largest first (the name is usually first). */
  headingLines?: string[];
  /** Link targets found in the source (PDF annotations, DOCX hyperlinks). */
  links?: string[];
  /** How short lines are set: size relative to body text, and weight. */
  lineStyles?: LineStyleHint[];
  /**
   * Headings that were letter-spaced ("E X P E R I E N C E") before
   * normalization collapsed them. Filled in by the parser, not the extractor.
   */
  spacedHeadings?: string[];
}

export interface LineStyleHint {
  text: string;
  /** Glyph size ÷ body size. */
  size: number;
  bold: boolean;
}

const SECTION_ALTERNATIONS: { alt: string; key: SectionKey }[] = [
  {
    alt: "skills|technical skills|key skills|core skills|top skills|digital skills|it (and|&) digital skills|skills summary|technical proficiencies|technologies|tech stack|tools (and|&) technologies|core competencies|areas of expertise|technical expertise|skill set|skillset|programming languages|languages (and|&) frameworks|software skills|it skills|technical skill set|my stack|tools i use|tech skills|skills (and|&) interests|skills (and|&) abilities|competencies|soft skills|professional skills|computer skills|relevant skills",
    key: "skills",
  },
  {
    alt: "experience|work experience|professional experience|employment history|career history|work history|professional background|relevant experience|industry experience|employment|experience summary|professional history|previous employment|positions held|roles|work|jobs|internships?|internship experience|volunteering|volunteer experience|open source contributions|professional engagements|work profile|career progression|leadership experience|research experience|teaching experience|academic experience|additional experience|other experience",
    key: "experience",
  },
  {
    alt: "summary|professional summary|profile|career objective|objective|about me|executive summary|profile summary|career summary|personal statement|about|career profile|personal profile|introduction|intro|bio|summary of qualifications|highlights of qualifications|professional profile",
    key: "summary",
  },
  {
    alt: "education|educational qualifications|academic background|academic qualifications|qualifications|educational background|academics|degrees|education (and|&) qualifications|educational details|academic history|schooling|training|relevant coursework|coursework|academic details|education (and|&) training",
    key: "education",
  },
  {
    alt: "projects|project|personal projects|academic projects|key projects|notable projects|side projects|project experience|portfolio|projects undertaken|my projects|selected projects|freelance projects|relevant projects",
    key: "projects",
  },
  {
    alt: "certifications|certification|certificates|certificate|licenses|license|professional certifications|credentials|badges|licenses (and|&) certifications|certifications (and|&) licenses|courses (and|&) certifications|certifications (and|&) courses",
    key: "certifications",
  },
  {
    alt: "achievements|achievement|accomplishments|awards|award|honors|honours|awards (and|&) honors|awards (and|&) achievements|honors (and|&) awards|achievements (and|&) awards|scholastic achievements|academic achievements|key achievements",
    key: "awards",
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

// Headings for sections that aren't résumé content for the builder (or would
// duplicate the header). Matched FULL-LINE only; their text is dropped.
const OTHER_DROP_FULL_LINE = new RegExp(
  "^(?:references?|referees|declaration|personal details|personal information|personal data|personal profile details|social profiles|links|online presence|contact|contact information|contact details|contact me|get in touch)$",
  "i",
);

// Headings for sections worth keeping as custom sections. FULL-LINE only
// (prefix matching would eat prose like "Interests include…").
const OTHER_KEEP_FULL_LINE = new RegExp(
  "^(?:interests?|hobbies|hobbies (?:and|&) interests|interests (?:and|&) hobbies|strengths|additional information|additional info|extra[- ]?curricular activities|extra[- ]?curriculars?|co[- ]?curricular activities|activities|affiliations|memberships|professional memberships|positions of responsibility|leadership|volunteer work|community service|research interests|areas of interest|research areas)$",
  "i",
);

const SECTION_PATTERNS = SECTION_ALTERNATIONS.map(({ alt, key }) => ({
  full: new RegExp(`^(?:${alt})$`, "i"),
  prefix: new RegExp(`^(?:${alt})\\b`, "i"),
  key,
}));

/** Letters only, lowercased — "W O R K-EXPERIENCE" → "workexperience". */
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}]+/gu, "");

/** Expand the tiny regex vocabulary used in the alternations into plain phrases. */
function expandAlternative(alt: string): string[] {
  let forms = [alt];
  forms = forms.flatMap((f) =>
    f.includes("(and|&)") ? [f.replace("(and|&)", "and"), f.replace("(and|&)", "")] : [f],
  );
  forms = forms.flatMap((f) => (f.endsWith("s?") ? [f.slice(0, -2), `${f.slice(0, -2)}s`] : [f]));
  return forms;
}

/** Split an alternation on its top-level "|" only — not inside "(and|&)". */
function topLevelAlternatives(alt: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of alt) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "|" && depth === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const SQUASHED_HEADERS = new Map<string, SectionKey>();
for (const { alt, key } of SECTION_ALTERNATIONS) {
  for (const a of topLevelAlternatives(alt)) {
    for (const form of expandAlternative(a)) {
      const s = squash(form);
      if (s && !SQUASHED_HEADERS.has(s)) SQUASHED_HEADERS.set(s, key);
    }
  }
}

// Slang / abbreviations — only ever a whole heading line, never a word inside
// a sentence ("Improved workplace safety" is a bullet, not a heading).
const SLANG_ALIASES: { pattern: RegExp; key: SectionKey }[] = [
  { pattern: /^skillz$/i, key: "skills" },
  { pattern: /^educashun$/i, key: "education" },
  { pattern: /^qualz$/i, key: "education" },
  { pattern: /^(?:certifcates|certs)$/i, key: "certifications" },
  { pattern: /^workplace$/i, key: "experience" },
  { pattern: /^exp$/i, key: "experience" },
  { pattern: /^edu$/i, key: "education" },
  { pattern: /^tech$/i, key: "skills" },
];

// A line beginning with a header word may still be prose ("Experience working
// at ..."). Only treat a prefix hit as a header when the line is short enough.
const MAX_PREFIX_HEADER_LENGTH = 60;

// Words that may trail a heading ("Education Details", "Skills Summary").
const HEADER_TAIL_WORDS = new Set([
  "summary", "highlights", "details", "detail", "overview", "history",
  "section", "list", "profile", "info", "information", "experience", "skills",
  "projects", "education", "certifications", "certificates", "awards",
  "achievements", "courses", "coursework", "tools", "technologies",
  "interests", "activities", "languages", "qualifications", "and",
]);

/**
 * After a prefix match, the rest of the line must still read like a heading:
 * nothing, a parenthetical ("(Backend)"), a connector ("& Certifications"), or
 * generic heading words. "Project Manager - Acme" or "Research Assistant |
 * IIT" are job titles, not headings.
 */
function isHeaderTail(rest: string): boolean {
  const r = rest.trim();
  if (!r) return true;
  if (/^\([^()]{1,40}\)$/.test(r)) return true;
  if (/\d|[@|,:]|https?:|www\./i.test(r)) return false;
  const words = r.split(/[\s&/+-]+/).filter(Boolean);
  if (words.length > 4) return false;
  if (/^(?:[&/+-]|and\b)/i.test(r)) return !hasRoleWord(r);
  return words.every((w) => HEADER_TAIL_WORDS.has(w.toLowerCase()));
}

// Lines made only of decoration act as header underlines and carry no content.
const DECORATION_LINE = /^[=\-_~*•\s]{3,}$/;

/** Strip decorations/numbering so "// WORK:" and "2) Skills -" match cleanly. */
function stripHeaderDecoration(line: string): string {
  let s = line.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  s = s.replace(/[^\p{L}\p{N}\s)]+$/u, "").trim();
  s = s.replace(/^[•\-*]+\s*/, "");
  s = s.replace(/^\d{1,2}[.)]\s+/, "");
  s = s.replace(/^[IVXLC]{1,5}[.)]\s+/i, "");
  s = s.replace(/[:\-|.\s]+$/, "").trim();
  return s;
}

/** Full-line / squashed / slang match of an already-stripped heading. */
function matchWholeHeading(s: string): SectionKey | null {
  const lower = s.toLowerCase();
  if (OTHER_DROP_FULL_LINE.test(lower) || OTHER_KEEP_FULL_LINE.test(lower)) return "other";
  for (const { full, key } of SECTION_PATTERNS) {
    if (full.test(lower)) return key;
  }
  if (s.length <= 40) {
    const key = SQUASHED_HEADERS.get(squash(s));
    if (key) return key;
  }
  for (const { pattern, key } of SLANG_ALIASES) {
    if (pattern.test(lower)) return key;
  }
  return null;
}

/** Returns the section key if `line` is a known header, else null. */
export function detectSectionHeader(line: string): SectionKey | null {
  if (line.length < 2 || line.length > 80) return null;

  // "Label: a, b, c" is a labeled content line (e.g. a skills subcategory like
  // "Languages: Python, Java"), NOT a section header — even though "Languages"
  // is itself a section word. The trailing comma-list is the giveaway.
  const colon = line.indexOf(":");
  if (colon > 0 && line.slice(colon + 1).trim()) return null;

  const s = stripHeaderDecoration(line);
  if (s.length === 0) return null;

  const whole = matchWholeHeading(s);
  if (whole) return whole;

  const lower = s.toLowerCase();
  if (lower.length <= MAX_PREFIX_HEADER_LENGTH) {
    for (const { prefix, key } of SECTION_PATTERNS) {
      const m = lower.match(prefix);
      if (m && isHeaderTail(lower.slice(m[0].length))) return key;
    }
  }
  return null;
}

/** "Interests" / "Positions of Responsibility" → keep as a custom section. */
function isKeepableOther(line: string): boolean {
  return OTHER_KEEP_FULL_LINE.test(stripHeaderDecoration(line).toLowerCase());
}

// Inline headings that open a section with content on the same line.
const INLINE_HEADER_KEYS = new Set<SectionKey>([
  "summary", "skills", "education", "experience", "certifications", "awards",
  "languages", "projects",
]);
// Inside entries, "Label: …" is a sub-label ("Technologies: React",
// "Achievements: Cut costs 20%"), never a new section.
const ENTRY_SECTIONS = new Set(["experience", "projects", "education"]);
const CONTACTISH = /@|https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|dev|io|me|net|org|in|co|ai|app)\b|\+?\d[\d\s().-]{7,}\d/i;

/**
 * "Summary: Backend engineer with…" / "Skills: Python, Java" — a heading with
 * its content on the same line. Returns the section and the content, or null
 * when the label is a sub-label inside the current section.
 */
function splitInlineHeader(
  line: string,
  current: string,
): { key: SectionKey; rest: string } | null {
  if (ENTRY_SECTIONS.has(current)) return null;
  const colon = line.indexOf(":");
  if (colon <= 0 || colon > 40) return null;
  const rest = line.slice(colon + 1).trim();
  if (!rest || CONTACTISH.test(rest)) return null;
  const key = matchWholeHeading(stripHeaderDecoration(line.slice(0, colon)));
  if (!key || key === "other" || !INLINE_HEADER_KEYS.has(key)) return null;
  if (key === current) return null;
  if (current === "skills" && (key === "languages" || key === "skills")) return null;
  return { key, rest };
}

// Words that appear in section headings but not in employer/project names.
const SECTION_VOCAB =
  /\b(?:responsibilit(?:y|ies)|activities|achievements|accomplishments|awards|honou?rs|interests|hobbies|strengths|extra[- ]?curricular|co[- ]?curricular|volunteer(?:ing)?|leadership|positions|publications|references|declaration|trainings?|workshops|seminars|conferences|coursework|memberships|affiliations|involvement|scholarships|competitions|hackathons|initiatives|contributions|patents|talks|languages|certifications|courses|projects|skills|experience|summary|profile|objective|details|information)\b/i;

/**
 * An UNKNOWN section header: short and heading-shaped, AND either flagged by
 * the extractor as large-font or worded like a section ("POSITIONS OF
 * RESPONSIBILITY", "Extra-Curricular Activities"). ALL CAPS alone isn't
 * enough — "TATA CONSULTANCY SERVICES" or "INFOSYS" is an employer line.
 * Only applies after the first known header (the name is short and large too).
 */
function isUnknownHeader(line: string, hintSet: Set<string>): boolean {
  if (line.length < 3 || line.length > 48) return false;
  if (/[@,.!?;:•|]|\d/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length > 5) return false;
  if (hasRoleWord(line)) return false; // likely a job-title line, keep as content
  if (COMPANY_WORD.test(line) || INSTITUTION_RE.test(line)) return false;
  if (hintSet.has(line.toLowerCase())) return true;

  const allCaps = line === line.toUpperCase() && /\p{Lu}{3}/u.test(line);
  if (allCaps) return SECTION_VOCAB.test(line);
  const titleCase = words.every((w) => /^[\p{Lu}&]/u.test(w) || /^(?:of|and|the|in|for|&)$/.test(w));
  return titleCase && words.length >= 2 && SECTION_VOCAB.test(words[words.length - 1]);
}

const isCapsLine = (s: string) => s === s.toUpperCase() && /\p{Lu}{2}/u.test(s);

/** A line's style as a comparable key, or null when it looks like body text. */
function styleSignature(style: LineStyleHint, line: string): string | null {
  const size = Math.round(style.size * 20) / 20;
  const caps = isCapsLine(line);
  // Bold mixed-case text at body size is how labels, employers and project
  // names are set — never distinctive enough to mark a heading.
  if (!caps && size < 1.15) return null;
  return `${style.bold ? "bold" : "regular"}|${size}|${caps ? "caps" : "mixed"}`;
}

/** The shape any section heading has, whatever its wording. */
function isHeadingShaped(line: string): boolean {
  if (line.length < 3 || line.length > 48 || !/^\p{Lu}/u.test(line)) return false;
  if (/[@,.!?;:•|]|\d/.test(line) || line.split(/\s+/).length > 5) return false;
  return !hasRoleWord(line) && !COMPANY_WORD.test(line) && !INSTITUTION_RE.test(line);
}

/**
 * Learn how THIS document sets its section headings — the size, weight and
 * case shared by the headings we recognise ("EXPERIENCE", "EDUCATION") — so
 * a heading we don't know ("OPEN SOURCE", "SPEAKING") is still a heading when
 * it is set exactly like them. Without style data (plain text), a heading's
 * "style" is its layout: a capitalised line with blank lines around it.
 *
 * A style counts when at least two known headings share it (a two-column
 * layout may use one style per column), the counted styles cover at least
 * half the known headings, and each is distinctive — no more other lines use it than known
 * headings do, so employer names set like headings switch the rule off.
 */
function learnHeadingStyle(
  lines: string[],
  styles: LineStyleHint[] | undefined,
  spacedHeadings: string[] = [],
): ((line: string) => boolean) | null {
  // Letter-spacing is a style of its own (Zenith's margin labels, Canva
  // headings), whatever the size or weight of the letters.
  const spaced = new Set(spacedHeadings.map((h) => h.trim()));
  let signatureAt: (i: number) => string | null;
  if (styles?.length) {
    const byText = new Map<string, LineStyleHint>();
    for (const s of styles) {
      const k = s.text.trim().toLowerCase();
      if (k && !byText.has(k)) byText.set(k, s);
    }
    signatureAt = (i) => {
      const line = lines[i].trim();
      const s = byText.get(line.toLowerCase());
      return s ? styleSignature(s, line) : null;
    };
  } else {
    // Plain text: a capitalised line standing alone between blank lines
    // (an entry's first line, "MIT", runs straight into its details).
    const blank = (i: number) => i >= 0 && i < lines.length && !lines[i].trim();
    signatureAt = (i) => (isCapsLine(lines[i].trim()) && blank(i - 1) && blank(i + 1) ? "text|caps|alone" : null);
  }

  const known = new Map<string, number>();
  const others = new Map<string, number>();
  let knownTotal = 0;
  const signatures = lines.map((raw, i) => {
    const line = raw.trim();
    if (!line) return null;
    return spaced.has(line) && isCapsLine(line) ? "letter-spaced" : signatureAt(i);
  });
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const sig = signatures[i];
    if (detectSectionHeader(line) !== null) {
      knownTotal++;
      if (sig) known.set(sig, (known.get(sig) ?? 0) + 1);
    } else if (sig) {
      others.set(sig, (others.get(sig) ?? 0) + 1);
    }
  });
  const accepted = new Set(
    [...known]
      .filter(([sig, n]) => n >= 2 && (others.get(sig) ?? 0) <= n)
      .map(([sig]) => sig),
  );
  const covered = [...accepted].reduce((sum, sig) => sum + (known.get(sig) ?? 0), 0);
  if (accepted.size === 0 || covered < knownTotal * 0.5) return null;

  // Looked up by line text: the caller walks the same lines in order.
  const headingText = new Set<string>();
  lines.forEach((raw, i) => {
    const sig = signatures[i];
    if (sig && accepted.has(sig)) headingText.add(raw.trim());
  });
  return (line: string) => headingText.has(line) && isHeadingShaped(line);
}

/** "POSITIONS OF RESPONSIBILITY" → "Positions of Responsibility". */
function displayTitle(line: string): string {
  const s = stripHeaderDecoration(line);
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && /^(?:of|and|the|in|for|at|on|to)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

/** A headline under the name ("Full-Stack Software Engineer"). */
function isLabelLike(line: string): boolean {
  return (
    line.length <= 60 &&
    !/[@\d]/.test(line) &&
    hasRoleWord(line) &&
    detectSectionHeader(line) === null
  );
}

/** Split normalized text into section blobs, remembering each bucket's heading. */
export function detectSectionsDetailed(text: string, hints?: ParseHints): DetectedSections {
  const sections: Sections = {};
  const titles: Record<string, string> = {};
  const lines = text.split("\n");

  const hintLines = (hints?.headingLines ?? []).map((h) => h.trim()).filter(Boolean);
  const hintSet = new Set(
    hintLines.map((h) => h.toLowerCase()).filter((h) => h.length >= 3 && h.length <= 48),
  );
  // The largest-font line that reads like a name. In two-column layouts it can
  // sit below a sidebar's headings; it still belongs to the header.
  const nameLine = hintLines.find((h) => looksLikeName(h) && detectSectionHeader(h) === null);
  const styledHeading = learnHeadingStyle(lines, hints?.lineStyles, hints?.spacedHeadings);

  let current = "header";
  let seenKnown = false;
  let otherIdx = 0;
  let pullLabel = 0;
  let prevLine = "";
  sections[current] = "";

  const open = (key: string, heading: string) => {
    current = key;
    if (!(current in sections)) sections[current] = "";
    if (!(current in titles)) titles[current] = displayTitle(heading);
  };

  const nextContent = (i: number) => {
    for (let j = i + 1; j < lines.length; j++) if (lines[j].trim()) return lines[j].trim();
    return "";
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.length === 0) {
      sections[current] += "\n";
      continue;
    }
    if (DECORATION_LINE.test(line)) continue;

    // The tail of a wrapped sentence ("…on all delivered" / "projects.") is
    // content, even when it happens to be a section word.
    const wrapsPrevious = /^[a-z]/.test(line) && prevLine !== "" && !/[.!?:]$/.test(prevLine);
    prevLine = line;
    if (wrapsPrevious) {
      sections[current] += line + "\n";
      continue;
    }

    // The lines under a pulled-out name are its headline and place
    // ("Senior PM at Razorpay" / "Bengaluru, Karnataka, India"), not content
    // of the sidebar section above them.
    if (pullLabel > 0) {
      pullLabel--;
      if (isLabelLike(line) || (isLocationLine(line) && detectSectionHeader(line) === null)) {
        sections.header += line + "\n";
        continue;
      }
      pullLabel = 0;
    }
    if (nameLine && current !== "header" && line === nameLine) {
      sections.header += line + "\n";
      pullLabel = 2;
      continue;
    }

    const inline = splitInlineHeader(line, current);
    if (inline) {
      open(inline.key, line.slice(0, line.indexOf(":")));
      seenKnown = true;
      sections[current] += inline.rest + "\n";
      continue;
    }

    const header = detectSectionHeader(line);
    // Inside Skills, "Languages" / "Research" above a comma list is a skill
    // category label (sidebar layouts), not the start of another section.
    // ALL-CAPS headings still open their section.
    if (
      header &&
      current === "skills" &&
      header !== "skills" &&
      line !== line.toUpperCase() &&
      line.split(/\s+/).length <= 3 &&
      (nextContent(i).match(/,/g) ?? []).length >= 1
    ) {
      sections[current] += line + "\n";
      continue;
    }
    // A second skills heading inside Skills ("Competencies", "Soft Skills")
    // is a category — keep it as the label of the list that follows.
    if (header === "skills" && current === "skills") {
      sections[current] += line + "\n";
      continue;
    }
    if (header) {
      seenKnown = true;
      // Keep-worthy "other" sections (Interests, Positions of Responsibility)
      // get their own bucket so they can become custom sections.
      if (header === "other" && isKeepableOther(line)) open(`other:${otherIdx++}`, line);
      else open(header, line);
      continue;
    }

    if (seenKnown && line !== nameLine && (isUnknownHeader(line, hintSet) || styledHeading?.(line))) {
      open(`other:${otherIdx++}`, line);
      continue;
    }

    sections[current] += line + "\n";
  }

  return { sections, titles };
}

/** Split normalized text into section blobs keyed by `SectionKey`. */
export function detectSections(text: string, hints?: ParseHints): Sections {
  return detectSectionsDetailed(text, hints).sections;
}
