/**
 * Structured per-entry parsing (net-new for the builder import).
 *
 * The reference C# returned Experience as a single text blob and discarded
 * Education/Projects/Summary. Here we split each section into individual,
 * editable entries: work, education, projects, certificates — plus summary,
 * profiles and location. This is best-effort by design; results always feed the
 * editable "Review what we imported" form, so imperfect splits are recoverable.
 */
import { uid } from "@/lib/resume/factory";
import type {
  CertificateEntry,
  EducationEntry,
  Location,
  Profile,
  ProjectEntry,
  WorkEntry,
} from "@/lib/resume/types";
import {
  extractDateRange,
  extractSingleDate,
  lineHasDateRange,
  stripMatched,
} from "./dates";
import { ROLE_WORD_SET } from "./name";
import type { Sections } from "./sections";

const BULLET = /^(?:[•*]|-)\s+/;

const isBullet = (line: string) => BULLET.test(line);
const stripBullet = (line: string) => line.replace(BULLET, "").trim();

const nonEmptyLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

function hasRoleWord(text: string): boolean {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((w) => ROLE_WORD_SET.has(w));
}

const SEPARATORS = /\s+[|\-–—]\s+|\s+·\s+|,\s+/;

/** "Remote" / "Hybrid" / "City, ST" location detection inside a meta line. */
function extractLocation(text: string): { value: string; rest: string } | null {
  let m = text.match(/\b(remote|hybrid|on-?site)\b/i);
  if (m) {
    const value = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    return { value, rest: text.replace(m[0], " ").trim() };
  }
  m = text.match(
    /\b([A-Z][a-zA-Z.\-]+(?:\s+[A-Z][a-zA-Z.\-]+)?),\s*([A-Z]{2})\b/,
  );
  if (m) return { value: m[0], rest: text.replace(m[0], " ").trim() };
  return null;
}

const clean = (s: string) =>
  s.replace(/^[\s,|\-–—·]+|[\s,|\-–—·]+$/g, "").replace(/[^\S\n]{2,}/g, " ").trim();

/** Split "Title at Company" / "Title — Company" / "Company, Title" into parts. */
function splitTitleCompany(text: string): { position: string; company: string } {
  const t = text.trim();

  const at = t.match(/^(.*?)\s+(?:at|@|for|with)\s+(.*)$/i);
  if (at) return { position: clean(at[1]), company: clean(at[2]) };

  const parts = t
    .split(SEPARATORS)
    .map((s) => clean(s))
    .filter(Boolean);
  if (parts.length >= 2) {
    const aRole = hasRoleWord(parts[0]);
    const bRole = hasRoleWord(parts[1]);
    if (aRole && !bRole) return { position: parts[0], company: parts[1] };
    if (bRole && !aRole) return { position: parts[1], company: parts[0] };
    return { position: parts[0], company: parts[1] };
  }

  if (hasRoleWord(t)) return { position: t, company: "" };
  return { position: "", company: t };
}

interface WorkBlock {
  meta: string[];
  bullets: string[];
}

function buildWork(block: WorkBlock): WorkEntry {
  let startDate = "";
  let endDate = "";
  let dateFound = false;
  let location = "";
  const titleParts: string[] = [];

  for (const line of block.meta) {
    let rest = line;

    if (!dateFound) {
      const dr = extractDateRange(rest);
      if (dr) {
        startDate = dr.start;
        endDate = dr.end;
        dateFound = true;
        rest = stripMatched(rest, dr.matched);
      }
    }

    const loc = extractLocation(rest);
    if (loc && !location) {
      location = loc.value;
      rest = loc.rest;
    }

    rest = clean(rest);
    if (rest) titleParts.push(rest);
  }

  let position = "";
  let company = "";
  const summaryParts: string[] = [];
  if (titleParts.length > 0) {
    const parsed = splitTitleCompany(titleParts[0]);
    position = parsed.position;
    company = parsed.company;
    if (titleParts.length > 1) summaryParts.push(...titleParts.slice(1));
  }

  return {
    id: uid(),
    name: company,
    position,
    location,
    url: "",
    startDate,
    endDate,
    summary: summaryParts.join(" "),
    highlights: block.bullets,
  };
}

export function parseWorkEntries(sections: Sections): WorkEntry[] {
  const text = (sections.experience ?? "").trim();
  if (!text) return [];
  const lines = nonEmptyLines(text);

  const blocks: WorkBlock[] = [];
  let cur: WorkBlock | null = null;
  const flush = () => {
    if (cur && (cur.meta.length || cur.bullets.length)) blocks.push(cur);
    cur = null;
  };

  for (const line of lines) {
    if (isBullet(line)) {
      if (!cur) cur = { meta: [], bullets: [] };
      cur.bullets.push(stripBullet(line));
      continue;
    }

    const isHeader = lineHasDateRange(line) || hasRoleWord(line);
    if (isHeader) {
      // Continuation of a 2-line header (e.g. company line then title+dates)?
      if (
        cur &&
        cur.bullets.length === 0 &&
        cur.meta.length >= 1 &&
        cur.meta.length <= 2 &&
        !cur.meta.some(lineHasDateRange)
      ) {
        cur.meta.push(line);
      } else {
        flush();
        cur = { meta: [line], bullets: [] };
      }
    } else if (!cur) {
      cur = { meta: [line], bullets: [] };
    } else if (cur.bullets.length === 0 && cur.meta.length < 3) {
      cur.meta.push(line);
    } else {
      cur.bullets.push(line);
    }
  }
  flush();

  return blocks.map(buildWork);
}

// ---- Education -----------------------------------------------------------

const INSTITUTION_RE =
  /\b(university|college|institute|institution|school|academy|polytechnic|iit|nit|bits)\b/i;
const DEGREE_RE =
  /\b(ph\.?\s?d|doctorate|m\.?b\.?a|b\.?\s?tech|m\.?\s?tech|b\.?\s?e\b|m\.?\s?e\b|b\.?\s?sc|m\.?\s?sc|b\.?\s?c\.?\s?a|m\.?\s?c\.?\s?a|b\.?\s?s\b|m\.?\s?s\b|b\.?\s?a\b|m\.?\s?a\b|bachelor|master|associate|diploma|high school|secondary|hsc|ssc)\b/i;
const SCORE_RE =
  /\b(?:gpa|cgpa|grade)\s*[:\-]?\s*\d(?:\.\d{1,2})?(?:\s*\/\s*\d{1,2})?|\d\.\d{1,2}\s*(?:gpa|cgpa)|\d(?:\.\d{1,2})?\s*\/\s*(?:10|4|5)\b|\b\d{1,3}(?:\.\d{1,2})?\s*%/i;

function buildEducation(lines: string[]): EducationEntry {
  let institution = "";
  let studyType = "";
  let area = "";
  let startDate = "";
  let endDate = "";
  let score = "";

  for (const line of lines) {
    if (!score) {
      const sm = line.match(SCORE_RE);
      if (sm) score = sm[0].trim();
    }
    if (!startDate && !endDate) {
      const dr = extractDateRange(line);
      if (dr) {
        startDate = dr.start;
        endDate = dr.end;
      } else {
        const single = extractSingleDate(line);
        if (single) endDate = single;
      }
    }
  }

  const instLine = lines.find((l) => INSTITUTION_RE.test(l));
  if (instLine) institution = stripMetaNoise(instLine);

  const degLine = lines.find((l) => DEGREE_RE.test(l));
  if (degLine) {
    const cleaned = stripMetaNoise(degLine);
    const dm = cleaned.match(DEGREE_RE);
    if (dm) studyType = dm[0].replace(/\s+/g, " ").trim();
    const am = cleaned.match(/\b(?:in|of)\s+([A-Za-z][A-Za-z &/\-]{1,40})/i);
    if (am) area = clean(am[1]);
  }

  if (!institution && !degLine) institution = stripMetaNoise(lines[0] ?? "");

  return {
    id: uid(),
    institution,
    area,
    studyType,
    startDate,
    endDate,
    score,
    courses: [],
  };
}

/** Remove date ranges, scores and trailing separators from a meta line. */
function stripMetaNoise(line: string): string {
  let s = line;
  const dr = extractDateRange(s);
  if (dr) s = stripMatched(s, dr.matched);
  s = s.replace(SCORE_RE, " ");
  s = s.replace(/(?:19|20)\d{2}/g, " ");
  return clean(s);
}

export function parseEducationEntries(sections: Sections): EducationEntry[] {
  const text = (sections.education ?? "").trim();
  if (!text) return [];
  const lines = nonEmptyLines(text).map((l) => (isBullet(l) ? stripBullet(l) : l));

  const blocks: string[][] = [];
  let cur: string[] | null = null;
  const flush = () => {
    if (cur && cur.length) blocks.push(cur);
    cur = null;
  };

  for (const line of lines) {
    const isInst = INSTITUTION_RE.test(line);
    if (isInst) {
      flush();
      cur = [line];
    } else if (!cur) {
      cur = [line];
    } else {
      cur.push(line);
    }
  }
  flush();

  return blocks.map(buildEducation).filter((e) => e.institution || e.studyType);
}

// ---- Projects ------------------------------------------------------------

const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9.\-]+\.[a-z]{2,}(?:\/\S*)?)/i;

function parseProjectHeader(line: string): ProjectEntry {
  let rest = line;
  let url = "";
  const um = rest.match(URL_RE);
  if (um && /\.(com|dev|io|net|org|app|me|co)\b/i.test(um[1])) {
    url = um[1].startsWith("http") ? um[1] : `https://${um[1]}`;
    rest = rest.replace(um[0], " ").trim();
  }

  let keywords: string[] = [];
  // Trailing parenthetical tech list, e.g. "(React, Node, Postgres)".
  const paren = rest.match(/\(([^)]+)\)\s*$/);
  if (paren && /[,/]/.test(paren[1])) {
    keywords = paren[1]
      .split(/[,/]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    rest = rest.replace(paren[0], " ").trim();
  }
  // Or an explicit "Tech:/Stack:/Technologies:" suffix.
  const tech = rest.match(/\b(?:tech|stack|technologies|tools)\s*:\s*(.+)$/i);
  if (tech) {
    keywords = tech[1]
      .split(/[,/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    rest = rest.replace(tech[0], " ").trim();
  }

  const parts = rest.split(/\s+[|\-–—:]\s+|:\s+/);
  const name = clean(parts[0] ?? rest);
  const description = parts.length > 1 ? clean(parts.slice(1).join(" - ")) : "";

  return { id: uid(), name, description, highlights: [], url, keywords };
}

export function parseProjectEntries(sections: Sections): ProjectEntry[] {
  const text = (sections.projects ?? "").trim();
  if (!text) return [];
  const lines = nonEmptyLines(text);

  const entries: ProjectEntry[] = [];
  let cur: ProjectEntry | null = null;
  const flush = () => {
    if (cur && (cur.name || cur.description || cur.highlights.length)) {
      entries.push(cur);
    }
    cur = null;
  };

  for (const line of lines) {
    if (isBullet(line)) {
      if (!cur) cur = { id: uid(), name: "", description: "", highlights: [], url: "", keywords: [] };
      cur.highlights.push(stripBullet(line));
    } else {
      flush();
      cur = parseProjectHeader(line);
    }
  }
  flush();

  return entries;
}

// ---- Certificates --------------------------------------------------------

export function parseCertificateEntries(sections: Sections): CertificateEntry[] {
  const text = (sections.certifications ?? "").trim();
  if (!text) return [];
  const lines = nonEmptyLines(text).map((l) => (isBullet(l) ? stripBullet(l) : l));

  return lines
    .map((line): CertificateEntry => {
      let rest = line;
      let date = "";
      const dr = extractDateRange(rest);
      if (dr) {
        date = dr.end || dr.start;
        rest = stripMatched(rest, dr.matched);
      } else {
        const single = extractSingleDate(rest);
        if (single) {
          date = single;
          const ym = rest.match(/(?:19|20)\d{2}/);
          if (ym) rest = clean(rest.replace(ym[0], " "));
        }
      }

      let name = clean(rest);
      let issuer = "";
      const split = rest.match(/^(.*?)\s+(?:-|–|—|by|from|\|)\s+(.*)$/i);
      if (split) {
        name = clean(split[1]);
        issuer = clean(split[2]);
      }

      return { id: uid(), name, issuer, date, url: "" };
    })
    .filter((c) => c.name);
}

// ---- Summary / profiles / location --------------------------------------

export function extractSummary(sections: Sections): string {
  const text = (sections.summary ?? "").trim();
  if (!text) return "";
  return nonEmptyLines(text)
    .map((l) => (isBullet(l) ? stripBullet(l) : l))
    .join(" ")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}

/** Detect a headline/title line in the header (e.g. "Full-Stack Developer"). */
export function extractLabel(sections: Sections, name: string): string {
  const header = nonEmptyLines(sections.header ?? "");
  for (const line of header) {
    if (line === name) continue;
    if (/[@]|https?:\/\//i.test(line)) continue;
    if (line.length > 60) continue;
    if (hasRoleWord(line) && !lineHasDateRange(line)) {
      return clean(line.split(/\s*[|•·]\s*/)[0]);
    }
  }
  return "";
}

export function extractProfiles(text: string): Profile[] {
  const profiles: Profile[] = [];

  const li = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_\-%]+)\/?/i,
  );
  if (li) {
    profiles.push({
      id: uid(),
      network: "LinkedIn",
      username: li[1],
      url: `https://linkedin.com/in/${li[1]}`,
    });
  }

  const gh = text.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_\-]+)\/?(?!\S)/i,
  );
  if (gh && gh[1].toLowerCase() !== "in") {
    profiles.push({
      id: uid(),
      network: "GitHub",
      username: gh[1],
      url: `https://github.com/${gh[1]}`,
    });
  }

  return profiles;
}

export function extractWebsite(text: string): string {
  const matches = [...text.matchAll(/https?:\/\/[^\s|]+/gi)].map((m) => m[0]);
  const site = matches.find(
    (u) => !/(linkedin|github|gitlab|twitter|facebook|instagram)\.com/i.test(u),
  );
  return site ? site.replace(/[).,]+$/, "") : "";
}

export function extractBasicsLocation(sections: Sections, text: string): Location {
  const region = { city: "", region: "", countryCode: "" };
  const header = (sections.header ?? "").trim() || text;
  const m = header.match(
    /\b([A-Z][a-zA-Z.\-]+(?:\s+[A-Z][a-zA-Z.\-]+)?),\s*([A-Z]{2})\b/,
  );
  if (m) {
    region.city = m[1];
    region.region = m[2];
  }
  return region;
}
