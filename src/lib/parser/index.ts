/**
 * Parser orchestrator — turns raw resume text into a `ResumeData` ready for the
 * editable "Review what we imported" form. Parsing is best-effort: a failure in
 * any one extractor degrades to an empty field rather than aborting the import.
 */
import { emptyResume, uid } from "@/lib/resume/factory";
import { SECTION_LABELS } from "@/lib/resume/sections";
import type { CustomSection, HideableSection, ResumeData, SkillEntry } from "@/lib/resume/types";

import { extractEmail, extractPhone } from "./contact";
import { extractDateRange, matchSingleDate, stripMatched } from "./dates";
import {
  DURATION,
  extractBasicsLocation,
  extractHeaderSummary,
  extractLabel,
  extractProfiles,
  extractSummary,
  extractWebsite,
  parseCertificateEntries,
  parseCustomItems,
  parseEducationEntries,
  parseProjectEntries,
  parseWorkDetailed,
} from "./entries";
import { extractName } from "./name";
import { detectSectionsDetailed, type ParseHints, type Sections } from "./sections";
import { normalizeText, normalizeTextDetailed } from "./normalize";
import { parseSkillsSection } from "./skills";

export type { LineStyleHint, ParseHints } from "./sections";

export interface ParseSummary {
  name: boolean;
  email: boolean;
  phone: boolean;
  summary: boolean;
  work: number;
  education: number;
  projects: number;
  certificates: number;
  skills: number; // total individual keywords across categories
  /** Extra sections kept as custom sections (Publications, Awards, …). */
  custom: number;
}

/** A field the parser is unsure about, worth a look before importing. */
export interface ReviewNote {
  section: "basics" | "work" | "education" | "other";
  message: string;
}

export interface ParseResult {
  data: ResumeData;
  found: ParseSummary;
  /** True when nothing meaningful could be extracted. */
  isEmpty: boolean;
  /** Low-confidence fields, most important first (local parser only). */
  review?: ReviewNote[];
}

/** What to double-check: missing parts of entries, guessed splits, leftovers. */
function reviewNotes(data: ResumeData, guessed: number[], unplaced: string[]): ReviewNote[] {
  const notes: ReviewNote[] = [];
  const b = data.basics;
  if (!b.name) notes.push({ section: "basics", message: "Your name wasn't found — add it after importing." });
  if (!b.email && !b.phone) notes.push({ section: "basics", message: "No email or phone number was found." });

  data.work.forEach((w, i) => {
    const label = w.position || w.name || `Job ${i + 1}`;
    const missing = [!w.position && "job title", !w.name && "employer", !w.startDate && "dates"].filter(Boolean);
    if (missing.length) notes.push({ section: "work", message: `${label}: ${missing.join(", ")} not found.` });
    if (guessed.includes(i)) {
      notes.push({ section: "work", message: `${label} at ${w.name}: check the job title and employer aren't swapped.` });
    }
  });

  data.education.forEach((e, i) => {
    const label = e.institution || e.studyType || `Education ${i + 1}`;
    const missing = [!e.institution && "school", !e.studyType && "degree"].filter(Boolean);
    if (missing.length) notes.push({ section: "education", message: `${label}: ${missing.join(" and ")} not found.` });
  });

  if (unplaced.length) {
    const n = unplaced.length;
    notes.push({
      section: "other",
      message: `${n} line${n === 1 ? "" : "s"} didn't match any field — kept under "${UNPLACED_TITLE}" so nothing is lost.`,
    });
  }
  return notes;
}

const INLINE_SKILLS_LINE =
  /^(?:technical\s+skills|core\s+skills|skill\s+set|skills|technologies|tech\s+stack|programming\s+languages|core\s+competencies)\s*:\s*\S.*$/im;

/** Find a standalone "Skills: a, b, c" line anywhere in the text. */
function findInlineSkillsLine(text: string): string {
  const m = text.match(INLINE_SKILLS_LINE);
  return m ? m[0] : "";
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    console.warn("Resume parser: a step failed and was skipped.", err);
    return fallback;
  }
}

/** Spoken languages ("English (Fluent), Hindi") as a skills category. */
function parseLanguages(text: string): SkillEntry[] {
  const keywords = text
    .split(/[\n,;|•·]+/)
    .map((t) => t.replace(/^[\s\-*]+/, "").trim())
    .filter((t) => t.length > 0 && t.length <= 40);
  return keywords.length ? [{ id: uid(), name: "Languages", keywords: [...new Set(keywords)] }] : [];
}

/**
 * Sections the builder has no field for, kept as custom sections under their
 * own headings: publications, awards, and any unknown heading ("Positions of
 * Responsibility", "Interests"). Declaration / references / contact are not.
 */
function buildCustomSections(sections: Sections, titles: Record<string, string>): CustomSection[] {
  const out: CustomSection[] = [];
  for (const key of Object.keys(sections)) {
    if (key !== "publications" && key !== "awards" && !key.startsWith("other:")) continue;
    const items = parseCustomItems(sections[key]);
    if (!items.length) continue;
    const fallback = key === "publications" ? "Publications" : key === "awards" ? "Awards" : "Additional Information";
    out.push({ id: uid(), title: titles[key] || fallback, items });
  }
  return out;
}

const STOP_WORDS = new Set(["an", "the", "and", "or", "of", "in", "at", "for", "with", "to", "on", "by", "as", "from"]);
const DATE_WORDS = /\b(?:present|current|currently|now|today|ongoing|till|until|since)\b/gi;

/** Comparable words of a string, accents folded: "Universität" → "universitat". */
function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

/** Every word that made it into the parsed résumé, from any field. */
function wordsInData(data: ResumeData): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") for (const w of words(v)) out.add(w);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk({ ...data, meta: undefined });
  return out;
}

/** A line's words, without its dates (they are stored as "2021-03"). */
function contentWords(line: string): string[] {
  let s = line;
  const range = extractDateRange(s);
  if (range) s = stripMatched(s, range.matched);
  for (let n = 0; n < 6; n++) {
    const single = matchSingleDate(s);
    if (!single) break;
    s = s.replace(single, " ");
  }
  return words(s.replace(DURATION, " ").replace(DATE_WORDS, " "));
}

/**
 * Lines whose words mostly didn't make it into any field — the "never lose
 * content" net. Sections dropped on purpose (references, declaration, the
 * contact block, which is read into the contact fields) are not checked, nor
 * are labels ("Key Achievements:") and one-word lines.
 * Exported for tests.
 */
export function findUnplacedLines(sections: Sections, data: ResumeData): string[] {
  const kept = wordsInData(data);
  const out: string[] = [];
  for (const [key, body] of Object.entries(sections)) {
    if (key === "other") continue;
    for (const raw of body.split("\n")) {
      const line = raw.replace(/^[•*‣◦▪>»-]\s*/, "").trim();
      if (!line || /:$/.test(line)) continue;
      const w = contentWords(line);
      if (w.length < 2) continue;
      const placed = w.filter((t) => kept.has(t)).length;
      if (placed / w.length < 0.5) out.push(line);
    }
  }
  return [...new Set(out)];
}

const UNPLACED_TITLE = "Additional Information";

// Detected section buckets → the builder's section keys.
const BUILT_IN_SECTIONS: Record<string, HideableSection> = {
  summary: "summary",
  experience: "work",
  education: "education",
  projects: "projects",
  skills: "skills",
  certifications: "certificates",
};

/**
 * The résumé's own headings for the built-in sections ("Internship
 * Experience", "Technical Skills"), where they differ from the builder's
 * defaults — so the imported résumé keeps its wording.
 */
function importedSectionTitles(titles: Record<string, string>): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [bucket, key] of Object.entries(BUILT_IN_SECTIONS)) {
    const title = titles[bucket]?.trim();
    if (!title || title.length > 40 || title.toLowerCase() === SECTION_LABELS[key].toLowerCase()) continue;
    out[key] = title;
  }
  return Object.keys(out).length ? out : undefined;
}

export function parseResumeText(rawText: string, hints?: ParseHints): ParseResult {
  const data = emptyResume();
  const normalized = safe(() => normalizeTextDetailed(rawText), { text: "", spacedHeadings: [] as string[] });
  const text = normalized.text;
  let unplaced: string[] = [];
  let guessed: number[] = [];

  if (text) {
    // Hints go through the same normalization so they compare equal to lines.
    const normalizedHints: ParseHints = {
      headingLines: (hints?.headingLines ?? []).map((h) => safe(() => normalizeText(h), h)),
      links: hints?.links ?? [],
      lineStyles: (hints?.lineStyles ?? []).map((s) => ({ ...s, text: safe(() => normalizeText(s.text), s.text) })),
      spacedHeadings: normalized.spacedHeadings,
    };
    const { sections, titles } = safe(() => detectSectionsDetailed(text, normalizedHints), {
      sections: { header: text } as Sections,
      titles: {},
    });
    const links = normalizedHints.links ?? [];
    const linkText = links.join("\n");
    const contactScope = `${sections.header ?? ""}\n${sections.other ?? ""}`;

    const name = safe(() => extractName(text, sections, normalizedHints), "");
    data.basics.name = name;
    data.basics.label = safe(() => extractLabel(sections, name), "");
    // A "mailto:" link stands in when the address isn't printed.
    data.basics.email = safe(() => extractEmail(text) || extractEmail(linkText), "");
    data.basics.phone = safe(() => extractPhone(text), "");
    data.basics.url = safe(() => extractWebsite(text, contactScope, links), "");
    data.basics.summary = safe(
      () => extractSummary(sections) || extractHeaderSummary(sections),
      "",
    );
    data.basics.profiles = safe(() => extractProfiles(`${text}\n${linkText}`), []);
    data.basics.location = safe(() => extractBasicsLocation(sections, text), {
      city: "",
      region: "",
      countryCode: "",
    });

    const work = safe(() => parseWorkDetailed(sections), { entries: [], guessed: [] as number[] });
    data.work = work.entries;
    guessed = work.guessed;
    data.education = safe(() => parseEducationEntries(sections), []);
    data.projects = safe(() => parseProjectEntries(sections), []);
    data.certificates = safe(() => parseCertificateEntries(sections), []);
    data.skills = safe(() => {
      // Prefer a dedicated Skills section; fall back to an inline "Skills: …"
      // line for compact resumes that have no standalone heading.
      const skillsText = sections.skills?.trim()
        ? sections.skills
        : findInlineSkillsLine(text);
      return skillsText ? parseSkillsSection(skillsText) : [];
    }, []);
    data.skills.push(...safe(() => parseLanguages(sections.languages ?? ""), []));
    data.customSections = safe(() => buildCustomSections(sections, titles), []);
    data.meta.sectionTitles = safe(() => importedSectionTitles(titles), undefined);

    // Whatever no field took is kept, verbatim, rather than silently dropped.
    unplaced = safe(() => findUnplacedLines(sections, data), []);
    if (unplaced.length) {
      const items = unplaced.map((line) => ({ id: uid(), name: line, description: "", date: "", url: "", highlights: [] }));
      const existing = data.customSections.find((s) => s.title.toLowerCase() === UNPLACED_TITLE.toLowerCase());
      if (existing) existing.items.push(...items);
      else data.customSections.push({ id: uid(), title: UNPLACED_TITLE, items });
    }
  }

  const skillCount = data.skills.reduce((n, s) => n + s.keywords.length, 0);
  const found: ParseSummary = {
    name: !!data.basics.name,
    email: !!data.basics.email,
    phone: !!data.basics.phone,
    summary: !!data.basics.summary,
    work: data.work.length,
    education: data.education.length,
    projects: data.projects.length,
    certificates: data.certificates.length,
    skills: skillCount,
    custom: data.customSections?.length ?? 0,
  };

  const isEmpty =
    !found.name &&
    !found.email &&
    !found.phone &&
    !found.summary &&
    found.work === 0 &&
    found.education === 0 &&
    found.projects === 0 &&
    found.certificates === 0 &&
    found.skills === 0 &&
    found.custom === 0;

  const review = isEmpty ? [] : safe(() => reviewNotes(data, guessed, unplaced), []);
  return { data, found, isEmpty, review };
}
