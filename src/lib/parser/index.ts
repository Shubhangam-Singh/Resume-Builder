/**
 * Parser orchestrator — turns raw resume text into a `ResumeData` ready for the
 * editable "Review what we imported" form. Parsing is best-effort: a failure in
 * any one extractor degrades to an empty field rather than aborting the import.
 */
import { emptyResume } from "@/lib/resume/factory";
import type { ResumeData } from "@/lib/resume/types";

import { extractEmail, extractPhone } from "./contact";
import {
  extractBasicsLocation,
  extractLabel,
  extractProfiles,
  extractSummary,
  extractWebsite,
  parseCertificateEntries,
  parseEducationEntries,
  parseProjectEntries,
  parseWorkEntries,
} from "./entries";
import { extractName } from "./name";
import { detectSections } from "./sections";
import { normalizeText } from "./normalize";
import { parseSkillsSection } from "./skills";

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
}

export interface ParseResult {
  data: ResumeData;
  found: ParseSummary;
  /** True when nothing meaningful could be extracted. */
  isEmpty: boolean;
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

export function parseResumeText(rawText: string): ParseResult {
  const data = emptyResume();
  const text = safe(() => normalizeText(rawText), "");

  if (text) {
    const sections = safe(() => detectSections(text), { header: text });

    const name = safe(() => extractName(text, sections), "");
    data.basics.name = name;
    data.basics.label = safe(() => extractLabel(sections, name), "");
    data.basics.email = safe(() => extractEmail(text), "");
    data.basics.phone = safe(() => extractPhone(text), "");
    data.basics.url = safe(() => extractWebsite(text), "");
    data.basics.summary = safe(() => extractSummary(sections), "");
    data.basics.profiles = safe(() => extractProfiles(text), []);
    data.basics.location = safe(() => extractBasicsLocation(sections, text), {
      city: "",
      region: "",
      countryCode: "",
    });

    data.work = safe(() => parseWorkEntries(sections), []);
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
    found.skills === 0;

  return { data, found, isEmpty };
}
