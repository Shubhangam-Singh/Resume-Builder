/**
 * Name extraction — ported from the reference C# `ExtractName` and helpers.
 * Four passes: clean standalone line, "Name | Title" split, name buried in a
 * contact line, and a single-word name header. Stop/role words and honorifics
 * keep titles and form labels from being mistaken for a name.
 */
import type { Sections } from "./sections";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NAME_STOP_WORDS = [
  "resume", "curriculum", "vitae", "cv", "page", "confidential", "profile",
  "summary", "objective", "contact", "address", "email", "phone", "mobile",
  "experience", "education", "skills", "projects", "references", "portfolio",
  "linkedin", "github",
  "overview", "career", "background", "detail", "information", "technical",
  "expertise", "competencies", "qualifications", "highlights", "interests",
  "activities", "hobbies", "declaration",
  "reg", "no", "id", "patient", "dob", "date", "gender", "serial", "roll",
  "form", "application", "ref", "code", "sr", "sl",
];

const ROLE_WORDS = [
  "developer", "engineer", "designer", "manager", "consultant", "analyst",
  "architect", "intern", "specialist", "administrator", "programmer",
  "scientist", "executive", "associate", "freelancer", "enthusiast",
  "professional", "student", "graduate", "fresher", "lead", "officer",
  "coordinator", "strategist", "technologist", "evangelist", "practitioner",
  "director", "founder", "ceo", "cto", "cfo", "president", "head", "trainee",
  "apprentice", "recruiter", "tester", "qa",
];

/** Exported for job-title detection in entry parsing. */
export const ROLE_WORD_SET = new Set(ROLE_WORDS);

const HONORIFIC =
  /^(?:mr|mrs|ms|miss|dr|prof|er|ca|sri|shri|smt|md|capt|lt|col)\.?\s+/i;

const STOP_WORD_REGEXES = NAME_STOP_WORDS.map(
  (w) => new RegExp(`\\b${escapeRegExp(w)}\\b`),
);
const ROLE_WORD_REGEXES = ROLE_WORDS.map(
  (w) => new RegExp(`\\b${escapeRegExp(w)}\\b`),
);

export function looksLikeName(candidate: string, allowSingleWord = false): boolean {
  if (!candidate || !candidate.trim()) return false;
  candidate = candidate.trim();

  if (candidate.length < 2 || candidate.length > 60) return false;
  if (/\d/.test(candidate)) return false;
  if (candidate.includes("@")) return false;

  const lower = candidate.toLowerCase();
  for (const rx of STOP_WORD_REGEXES) if (rx.test(lower)) return false;
  for (const rx of ROLE_WORD_REGEXES) if (rx.test(lower)) return false;

  const words = candidate.split(" ").filter(Boolean);

  const minWords = allowSingleWord ? 1 : 2;
  if (words.length < minWords || words.length > 5) return false;

  for (const word of words) {
    if (!/^[\p{L}][\p{L}'\-]*\.?$/u.test(word)) return false;
  }

  // Reject garbled all-initials lines like "A B C D".
  if (words.every((w) => w.replace(/\.$/, "").length === 1)) return false;
  // A lone single word must be a real token (>= 3 letters), not an initial.
  if (words.length === 1 && words[0].replace(/\.$/, "").length < 3) return false;
  // Reject a leading first-person "I" (prose bleeding into the header).
  if (words.length >= 2 && words[0] === "I") return false;

  return true;
}

function cleanName(s: string): string {
  s = s.trim().replace(HONORIFIC, "");
  s = s.replace(/[^\S\n]{2,}/g, " ").trim();
  return s.replace(/^[,|\-\s]+|[,|\-\s]+$/g, "");
}

const CREDENTIAL_TAIL =
  /,\s*(?:phd|ph\.d|mba|msc|bsc|btech|mtech|be|me|ms|ba|bca|mca|pmp|cfa|cpa|md|mphil|dba|llb|llm|ca|cma|csa|csm|pmi|aws[-\w]*|gcp[-\w]*|azure[-\w]*|cism|cissp|ceh|itil|six\s*sigma|prince2|togaf|[a-z]{2,6}(?:-[a-z]{2,6})?)\s*$/i;

const DEGREE_TOKEN =
  /^(phd|mba|msc|bsc|btech|mtech|be|me|ms|ba|bca|mca|pmp|cfa|cpa|md|mphil)$/i;

export function extractName(text: string, sections: Sections): string {
  const header =
    sections.header && sections.header.trim().length > 0 ? sections.header : text;
  const lines = header
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 12);

  // Pass 1 — a clean, standalone name line.
  for (const line of lines) {
    if (/[@|]|\d|https?:\/\//i.test(line)) continue;
    if (line.trimEnd().endsWith(":")) continue;
    if (/^\w{1,6}\.\s+\w{1,6}\.?$/.test(line)) continue;

    const candidate = line.replace(HONORIFIC, "");

    // "Last, First" -> "First Last", stripping trailing credential segments.
    let lfCandidate = candidate;
    let stripped = true;
    while (stripped) {
      stripped = false;
      const m = lfCandidate.match(CREDENTIAL_TAIL);
      if (m && m.index !== undefined) {
        lfCandidate = lfCandidate.slice(0, m.index).trim();
        stripped = true;
      }
    }

    const lf = lfCandidate.match(/^(\p{L}[\p{L}'\-]+),\s+(\p{L}[\p{L}'\-]+)\.?$/u);
    if (lf && !DEGREE_TOKEN.test(lf[2])) {
      const swapped = `${lf[2]} ${lf[1]}`;
      if (looksLikeName(swapped)) return cleanName(swapped);
    }

    const beforeComma = candidate.split(",")[0].trim();
    if (looksLikeName(beforeComma)) return cleanName(beforeComma);
    if (looksLikeName(candidate)) return cleanName(candidate);
  }

  // Pass 2 — "Name | Title | City" / "Name - Title".
  for (const line of lines) {
    const segments = line.split(/\s[|\-]\s/);
    if (segments.length >= 2) {
      const seg = segments[0].trim().replace(HONORIFIC, "");
      if (looksLikeName(seg)) return cleanName(seg);
    }
  }

  // Pass 3 — name buried in a contact line.
  for (const line of lines) {
    let l = line;
    l = l.replace(/[\w.\-+]+@[\w.\-]+\.\w{2,}/g, " "); // email
    l = l.replace(/https?:\/\/\S+/g, " "); // urls
    l = l.replace(
      /(www\.)?(linkedin|github|gitlab|behance|dribbble|medium|twitter)\.\S+/gi,
      " ",
    );
    l = l.replace(/\+?\d[\d\s\-()]{7,}\d/g, " "); // phone-ish
    l = l.replace(/\b[A-Za-z][A-Za-z]+,\s*[A-Z]{2}\b/g, " "); // City, ST
    l = l.replace(/[|•·/]/g, " "); // separators
    l = l.replace(
      /\b(e-?mail(\s+id)?|email|phone|mobile|cell|tel|mob|fax|address|url|website|contact|portfolio)\b\s*:?\s*/gi,
      " ",
    );
    l = l.trim().replace(HONORIFIC, "");
    l = l.replace(/[^\S\n]{2,}/g, " ").trim();

    const m = l.match(/^[\p{L}][\p{L}'\-.]*(\s+[\p{L}][\p{L}'\-.]*){1,3}/u);
    if (m && looksLikeName(m[0])) return cleanName(m[0]);
  }

  // Pass 4 — a single-word name on the very first line.
  if (lines.length > 0) {
    const firstClean = lines[0].replace(HONORIFIC, "");
    const firstToken = firstClean.split(",")[0].trim();
    if (/[A-Z]/.test(firstToken) && looksLikeName(firstToken, true)) {
      return cleanName(firstToken);
    }
  }

  return "";
}
