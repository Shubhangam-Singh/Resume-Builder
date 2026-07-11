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

// Bullet markers seen in the wild: •/* (normalized glyphs), dashes, Word's
// sub-bullet "o", and numbered lists ("1." / "2)").
const BULLET = /^(?:[•*‣◦▪>»]|[-–]|o|\d{1,2}[.)])\s+/;

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

// Legal/organizational suffixes that mark a segment as a company name.
const COMPANY_SUFFIX =
  /^(?:inc|llc|llp|ltd|plc|pvt(?:\.?\s*ltd)?|co|corp|gmbh|s\.?a\.?|ag|bv|oy|ab|pte(?:\.?\s*ltd)?)\.?$/i;
const COMPANY_WORD =
  /\b(?:inc|llc|llp|ltd|plc|pvt|corp|corporation|gmbh|technologies|technology|solutions|labs?|systems|softwares?|consulting|consultancy|group|studios?|media|networks?|industries|enterprises?|international|global|services|ventures|partners|bank|agency|digital|infotech|tech)\b\.?/i;

/**
 * A wrapped continuation of the previous bullet (PDF line-wrap): starts
 * lowercase / with a digit / an opening bracket, or the previous bullet
 * clearly didn't finish its sentence.
 */
function isContinuation(line: string, prev: string): boolean {
  if (/^[a-z0-9(&+]/.test(line)) return true;
  if (/[,;:&/]$/.test(prev)) return true;
  return false;
}

const SEPARATORS = /\s+[|\-–—]\s+|\s+·\s+|,\s+/;

// Regions we accept as the second half of "City, Region" — countries, Indian
// states, US/Canada/UK/AU regions. Keeps "Designer, Acme Corp" from reading as
// a location while still catching "Bengaluru, Karnataka" or "Berlin, Germany".
const KNOWN_REGIONS = new Set(
  [
    // Countries frequently on resumes
    "india", "usa", "united states", "united states of america", "uk",
    "united kingdom", "canada", "australia", "germany", "france",
    "netherlands", "spain", "italy", "ireland", "singapore", "uae",
    "united arab emirates", "dubai", "japan", "china", "brazil", "mexico",
    "poland", "sweden", "norway", "denmark", "finland", "switzerland",
    "austria", "belgium", "portugal", "new zealand", "south africa",
    "nigeria", "kenya", "egypt", "israel", "saudi arabia", "qatar",
    "bangladesh", "pakistan", "sri lanka", "nepal", "philippines",
    "indonesia", "malaysia", "thailand", "vietnam", "south korea", "russia",
    // Indian states & UTs
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "delhi", "new delhi", "goa", "gujarat", "haryana", "himachal pradesh",
    "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra",
    "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab",
    "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
    "uttar pradesh", "uttarakhand", "west bengal", "chandigarh",
    "jammu and kashmir", "puducherry",
    // US states (full names)
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
    "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
    "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
    "maine", "maryland", "massachusetts", "michigan", "minnesota",
    "mississippi", "missouri", "montana", "nebraska", "nevada",
    "new hampshire", "new jersey", "new mexico", "new york",
    "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
    "pennsylvania", "rhode island", "south carolina", "south dakota",
    "tennessee", "texas", "utah", "vermont", "virginia", "washington",
    "west virginia", "wisconsin", "wyoming",
    // Canada / UK / AU
    "ontario", "quebec", "british columbia", "alberta", "manitoba",
    "saskatchewan", "nova scotia", "england", "scotland", "wales",
    "northern ireland", "new south wales", "victoria", "queensland",
    "western australia", "south australia", "tasmania",
  ],
);

const MULTIWORD_PLACE =
  /([A-Z][\p{L}.'\-]+(?:\s+[A-Z][\p{L}.'\-]+){0,2}),\s*([A-Z][\p{L}.'\-]+(?:\s+[A-Z][\p{L}.'\-]+){0,2})/gu;

/** "Remote" / "City, ST" / "City, Known-Region" detection inside a meta line. */
function extractLocation(text: string): { value: string; rest: string } | null {
  let m = text.match(/\b(remote|hybrid|on-?site|wfh)\b/i);
  if (m) {
    const value = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    return { value, rest: text.replace(m[0], " ").trim() };
  }
  m = text.match(
    /\b([A-Z][a-zA-Z.\-]+(?:\s+[A-Z][a-zA-Z.\-]+)?),\s*([A-Z]{2})\b/,
  );
  if (m) return { value: m[0], rest: text.replace(m[0], " ").trim() };

  // "City, Tamil Nadu" / "Berlin, Germany" — region must be a known place so
  // "Designer, Acme Corp" never reads as a location.
  MULTIWORD_PLACE.lastIndex = 0;
  let g: RegExpExecArray | null;
  while ((g = MULTIWORD_PLACE.exec(text)) !== null) {
    if (KNOWN_REGIONS.has(g[2].toLowerCase())) {
      return { value: `${g[1]}, ${g[2]}`, rest: text.replace(g[0], " ").trim() };
    }
  }
  return null;
}

const clean = (s: string) =>
  s.replace(/^[\s,|\-–—·]+|[\s,|\-–—·]+$/g, "").replace(/[^\S\n]{2,}/g, " ").trim();

/** Split on separators, re-attaching legal suffixes ("Acme, Inc." stays one). */
function splitSegments(text: string): string[] {
  const parts = text
    .split(SEPARATORS)
    .map((s) => clean(s))
    .filter(Boolean);
  const merged: string[] = [];
  for (const part of parts) {
    if (merged.length > 0 && COMPANY_SUFFIX.test(part)) {
      merged[merged.length - 1] += `, ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged;
}

/** Split "Title at Company" / "Title — Company" / "Company, Title" into parts. */
function splitTitleCompany(text: string): { position: string; company: string } {
  const t = text.trim();

  const at = t.match(/^(.*?)\s+(?:at|@|for|with)\s+(.*)$/i);
  if (at) return { position: clean(at[1]), company: clean(at[2]) };

  const parts = splitSegments(t);
  if (parts.length >= 2) {
    const [a, b] = parts;
    const aRole = hasRoleWord(a);
    const bRole = hasRoleWord(b);
    const aCo = COMPANY_WORD.test(a);
    const bCo = COMPANY_WORD.test(b);
    // Company markers outrank role words: "Acme Technologies, Engineer".
    if (aCo && !bCo && !aRole) return { position: b, company: a };
    if (bCo && !aCo && !bRole) return { position: a, company: b };
    if (aRole && !bRole) return { position: a, company: b };
    if (bRole && !aRole) return { position: b, company: a };
    return { position: a, company: b };
  }

  if (hasRoleWord(t) && !COMPANY_WORD.test(t)) return { position: t, company: "" };
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
    // A second header line is usually the other half of the pair (company
    // under title or vice versa) — fill whichever slot is still empty.
    if (titleParts.length > 1) {
      const next = titleParts[1];
      if (!company && !hasRoleWord(next)) company = next;
      else if (!position && hasRoleWord(next)) position = next;
      else summaryParts.push(next);
      if (titleParts.length > 2) summaryParts.push(...titleParts.slice(2));
    }
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

/** True when nothing but a date (and maybe a location) is on the line. */
function isDateOnlyLine(line: string): boolean {
  const dr = extractDateRange(line);
  if (!dr) return false;
  let rest = stripMatched(line, dr.matched);
  const loc = extractLocation(rest);
  if (loc) rest = loc.rest;
  return clean(rest).length <= 3;
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

    const lineDated = lineHasDateRange(line);
    const isHeader = lineDated || hasRoleWord(line);
    if (isHeader) {
      const curDated = cur ? cur.meta.some(lineHasDateRange) : false;
      // Multi-line headers merge in either order — "Title / Company / Dates"
      // or "Dates / Title, Company" — but two dated lines mean two entries.
      const mergeable =
        cur !== null &&
        cur.bullets.length === 0 &&
        ((cur.meta.length <= 2 && !(curDated && lineDated)) ||
          (cur.meta.length <= 3 && lineDated && !curDated && isDateOnlyLine(line)));
      if (mergeable) {
        cur!.meta.push(line);
      } else {
        flush();
        cur = { meta: [line], bullets: [] };
      }
    } else if (!cur) {
      cur = { meta: [line], bullets: [] };
    } else if (cur.bullets.length === 0 && cur.meta.length < 3) {
      cur.meta.push(line);
    } else if (
      cur.bullets.length > 0 &&
      isContinuation(line, cur.bullets[cur.bullets.length - 1])
    ) {
      // Wrapped bullet text (PDF line breaks) re-joins its bullet.
      cur.bullets[cur.bullets.length - 1] += ` ${line}`;
    } else {
      cur.bullets.push(line);
    }
  }
  flush();

  return blocks.map(buildWork);
}

// ---- Education -----------------------------------------------------------

const INSTITUTION_RE =
  /\b(university|college|institute|institution|school|academy|polytechnic|iit|nit|bits|iiit|vit|srm)\b/i;
const DEGREE_RE =
  /\b(ph\.?\s?d|doctorate|m\.?b\.?a|b\.?\s?tech|m\.?\s?tech|b\.?\s?e\b|m\.?\s?e\b|b\.?\s?sc|m\.?\s?sc|b\.?\s?c\.?\s?a|m\.?\s?c\.?\s?a|b\.?\s?s\b|m\.?\s?s\b|b\.?\s?a\b|m\.?\s?a\b|bachelor(?:'?s)?|master(?:'?s)?|associate|diploma|high school|secondary|hsc|ssc)\b/i;
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
    if (dm) {
      studyType = dm[0].replace(/\s+/g, " ").trim();
      const am = cleaned.match(/\b(?:in|of)\s+([A-Za-z][A-Za-z &/\-]{1,48})/i);
      if (am) {
        area = clean(am[1]);
      } else if (dm.index !== undefined) {
        // "B.Tech, Information Technology" — the field follows the degree.
        const after = clean(
          cleaned.slice(dm.index + dm[0].length).replace(/^[\s,:\-–—]+/, ""),
        );
        const field = after.split(/[|,;]/)[0].trim();
        if (
          field.length >= 2 &&
          field.length <= 48 &&
          /^[A-Za-z][A-Za-z &/\-.()]*$/.test(field) &&
          !INSTITUTION_RE.test(field)
        ) {
          area = field;
        }
      }
    }
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

  // Dates in project headers ("Portfolio Site — Jan 2021") aren't part of the
  // name; the project model has no date fields, so just strip them.
  const dr = extractDateRange(rest);
  if (dr) rest = stripMatched(rest, dr.matched);

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
    } else if (
      cur &&
      cur.highlights.length > 0 &&
      isContinuation(line, cur.highlights[cur.highlights.length - 1])
    ) {
      cur.highlights[cur.highlights.length - 1] += ` ${line}`;
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
      // "AWS Certified Developer (Amazon)" — parenthetical issuer.
      if (!issuer) {
        const pm = name.match(/^(.*?)\s*\(([^)]{2,40})\)$/);
        if (pm && !/[,/]/.test(pm[2])) {
          name = clean(pm[1]);
          issuer = clean(pm[2]);
        }
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
  const matches = text.match(/https?:\/\/[^\s|]+/gi) || [];
  const site = matches.find(
    (u) => !/(linkedin|github|gitlab|twitter|facebook|instagram)\.com/i.test(u),
  );
  return site ? site.replace(/[).,]+$/, "") : "";
}

export function extractBasicsLocation(sections: Sections, text: string): Location {
  const result: Location = { city: "", region: "", countryCode: "" };

  // Prefer an explicitly labeled line anywhere in the document.
  const labeled = text.match(/\b(?:address|location)\s*[:\-]\s*(.{3,80})/i);
  const scopes = [
    labeled?.[1] ?? "",
    (sections.header ?? "").trim(),
    (sections.other ?? "").trim(), // sidebar "Contact" blocks land here
    text,
  ];

  for (const scope of scopes) {
    if (!scope) continue;
    // "City, ST" (2-letter region)
    const m = scope.match(
      /\b([A-Z][a-zA-Z.\-]+(?:\s+[A-Z][a-zA-Z.\-]+)?),\s*([A-Z]{2})\b/,
    );
    if (m) {
      result.city = m[1];
      result.region = m[2];
      return result;
    }
    // "City, Known-Region" ("Vellore, Tamil Nadu" / "Berlin, Germany")
    MULTIWORD_PLACE.lastIndex = 0;
    let g: RegExpExecArray | null;
    while ((g = MULTIWORD_PLACE.exec(scope)) !== null) {
      if (KNOWN_REGIONS.has(g[2].toLowerCase())) {
        result.city = g[1];
        result.region = g[2];
        return result;
      }
    }
    // A bare known place on its own line ("Bengaluru" / "India")
    const lone = nonEmptyLines(scope).find((l) =>
      KNOWN_REGIONS.has(l.toLowerCase()),
    );
    if (lone) {
      result.region = lone;
      return result;
    }
  }
  return result;
}
