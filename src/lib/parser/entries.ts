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
  CustomItem,
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
  matchSingleDate,
  parseMonthYear,
  stripMatched,
} from "./dates";
import {
  COMPANY_WORD,
  INSTITUTION_RE,
  KNOWN_REGIONS,
  REGION_CODES,
  hasRoleTitle,
  hasRoleWord,
  isKnownCity,
  isLocationLine,
  startsWithActionVerb,
} from "./lexicon";
import type { Sections } from "./sections";
import { isKnownSkill, tidySkill } from "./skills";

// Bullet markers seen in the wild: •/* (normalized glyphs), dashes, Word's
// sub-bullet "o", and numbered lists ("1." / "2)"). Glyph bullets may touch
// the text ("•Built"); dashes, "o" and numbers need a space.
const BULLET = /^(?:[•*‣◦▪>»]\s*|[-–]\s+|o\s+|\d{1,2}[.)]\s+)(?=\S)/;

const isBullet = (line: string) => BULLET.test(line);
const stripBullet = (line: string) => line.replace(BULLET, "").trim();

const nonEmptyLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Legal/organizational suffixes that mark a segment as a company name.
const COMPANY_SUFFIX =
  /^(?:inc|llc|llp|ltd|plc|pvt(?:\.?\s*ltd)?|co|corp|gmbh|s\.?a\.?|ag|bv|oy|ab|pte(?:\.?\s*ltd)?)\.?$/i;

/** A title / company / date line, not prose: short, not a sentence, not a bullet verb. */
function isHeaderShaped(line: string): boolean {
  return (
    !/^[a-z]/.test(line) &&
    !/[.;]$/.test(line) &&
    wordCount(line) <= 12 &&
    !startsWithActionVerb(line)
  );
}

/**
 * A bullet whose marker was lost (Word paragraphs, plain text): it opens with
 * an action verb and reads as a sentence — "Built dashboards that cut…".
 * "Lead Data Engineer" or "Design Lead, Studio X" stay titles.
 */
function isUnmarkedBullet(line: string): boolean {
  if (!startsWithActionVerb(line) || wordCount(line) < 4) return false;
  return !hasRoleTitle(line.replace(/^\S+\s*/, ""));
}

/**
 * A wrapped continuation of the previous bullet (PDF line-wrap): starts
 * lowercase / with a digit / an opening bracket, the previous bullet clearly
 * didn't finish its sentence, or it stopped mid-sentence and this line reads
 * as prose rather than a heading.
 */
function isContinuation(line: string, prev: string): boolean {
  if (/^[a-z0-9(&+]/.test(line)) return true;
  if (/[,;:&/]$/.test(prev)) return true;
  if (!/[.!?)"%]$/.test(prev) && !/\s[|·-]\s/.test(line)) {
    const words = line.split(/\s+/);
    const lowerWords = words.filter((w) => /^[a-z]/.test(w)).length;
    if (words.length >= 5 && lowerWords >= 2) return true;
    // The sentence's last word or two, wrapped: "…technical" / "SEO."
    if (words.length <= 3 && /[.!?]$/.test(line)) return true;
  }
  return false;
}

const STRONG_SEPARATORS = /\s+[|–—-]\s+|\s+·\s+/;

const clean = (s: string) =>
  s.replace(/^[\s,|\-–—·]+|[\s,|\-–—·]+$/g, "").replace(/[^\S\n]{2,}/g, " ").trim();

/**
 * Split on separators, strongest first: " | ", " - ", " · " when present, else
 * commas — so "Software Engineer, QA | Acme" splits at the pipe. Legal
 * suffixes stay attached ("Acme, Inc.").
 */
function splitSegments(text: string): string[] {
  const parts = (STRONG_SEPARATORS.test(text) ? text.split(STRONG_SEPARATORS) : text.split(/,\s+/))
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

// Words of a place name never span a line break.
const MULTIWORD_PLACE =
  /([A-Z][\p{L}.'\-]+(?:[^\S\n]+[A-Z][\p{L}.'\-]+){0,2}),[^\S\n]*([A-Z][\p{L}.'\-]+(?:[^\S\n]+[A-Z][\p{L}.'\-]+){0,2})/gu;
// ", India" after "City, State".
const TRAILING_REGION = /^,[^\S\n]*([A-Z][\p{L}.'\-]+(?:[^\S\n]+[A-Z][\p{L}.'\-]+){0,2})/u;

/**
 * First "City, Known-Region" in `text` (plus a trailing ", Country"). A
 * candidate whose region isn't a place is retried from its second half, so
 * "Zalando SE, Berlin, Germany" finds "Berlin, Germany".
 */
function matchKnownPlace(
  text: string,
): { value: string; city: string; region: string; index: number; length: number } | null {
  MULTIWORD_PLACE.lastIndex = 0;
  let g: RegExpExecArray | null;
  while ((g = MULTIWORD_PLACE.exec(text)) !== null) {
    if (KNOWN_REGIONS.has(g[2].toLowerCase())) {
      let value = `${g[1]}, ${g[2]}`;
      let length = g[0].length;
      const tail = text.slice(g.index + length).match(TRAILING_REGION);
      if (tail && KNOWN_REGIONS.has(tail[1].toLowerCase())) {
        value += `, ${tail[1]}`;
        length += tail[0].length;
      }
      return { value, city: g[1], region: g[2], index: g.index, length };
    }
    // Overlapping retry: the region part may itself start a place.
    MULTIWORD_PLACE.lastIndex = g.index + g[0].length - g[2].length;
  }
  return null;
}
// Never across a line break: "SHUBHANGAM SINGH⏎Prayagraj, UP" is a name line
// and a place line, not the city "SINGH Prayagraj".
const CITY_CODE = /\b([A-Z][a-zA-Z.\-]+(?:[^\S\n]+[A-Z][a-zA-Z.\-]+)?),[^\S\n]*([A-Z]{2})\b/g;

/** First "City, ST" with a real region code and a city that isn't a job title. */
function matchCityCode(text: string): RegExpExecArray | null {
  CITY_CODE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITY_CODE.exec(text)) !== null) {
    if (REGION_CODES.has(m[2]) && !hasRoleWord(m[1])) return m;
  }
  return null;
}

// A work arrangement, bare or in brackets: "Remote", "(On-site)".
const WORK_MODE = /\(\s*(remote|hybrid|on-?site|wfh)\s*\)|\b(remote|hybrid|on-?site|wfh)\b/i;

/**
 * "Remote" / "City, ST" / "City, Known-Region" detection inside a meta line.
 * A work arrangement next to a place keeps both: "Xeedo Technologies,
 * Bengaluru (On-site)" → "Bengaluru (On-site)", leaving the employer clean.
 */
function extractLocation(text: string): { value: string; rest: string } | null {
  const m = text.match(WORK_MODE);
  if (m) {
    const raw = m[1] ?? m[2];
    const mode = raw[0].toUpperCase() + raw.slice(1).toLowerCase();
    const rest = clean(text.replace(m[0], " "));
    const place = extractPlace(rest);
    return place ? { value: `${place.value} (${mode})`, rest: place.rest } : { value: mode, rest };
  }
  return extractPlace(text);
}

/** "City, ST" / "City, Known-Region" / a known city field inside a meta line. */
function extractPlace(text: string): { value: string; rest: string } | null {
  const cc = matchCityCode(text);
  if (cc) return { value: cc[0], rest: text.replace(cc[0], " ").trim() };

  // "City, Tamil Nadu" / "Berlin, Germany" — region must be a known place so
  // "Designer, Acme Corp" never reads as a location.
  const place = matchKnownPlace(text);
  if (place) {
    const rest = `${text.slice(0, place.index)} ${text.slice(place.index + place.length)}`;
    return { value: place.value, rest: rest.trim() };
  }

  // A known city as a whole field: "Cred | Bengaluru | 2022", "Engineer, Stripe, Seattle".
  const fields = text.split(/(\s+[|·•–—-]\s+)/);
  for (let i = 0; i < fields.length; i += 2) {
    if (!isKnownCity(fields[i])) continue;
    const rest = fields.filter((_, j) => j !== i && j !== (i > 0 ? i - 1 : i + 1)).join("");
    return { value: fields[i].trim(), rest: rest.trim() };
  }
  const cleaned = clean(text);
  const tail = cleaned.match(/,\s*([^,|·•]+)$/);
  if (tail && tail.index !== undefined && isKnownCity(tail[1])) {
    return { value: tail[1].trim(), rest: cleaned.slice(0, tail.index).trim() };
  }
  return null;
}

interface TitleCompany {
  position: string;
  company: string;
  /** Which side held the title, when evidence (not a default) decided it. */
  order: TitleOrder | null;
  /** Two parts with no evidence either way — the split is a guess. */
  ambiguous?: boolean;
}

/** Split "Title at Company" / "Title — Company" / "Company, Title" into parts. */
function splitTitleCompany(text: string): TitleCompany {
  const t = text.trim();
  const titleFirst = (position: string, company: string): TitleCompany => ({ position, company, order: "title-first" });
  const companyFirst = (company: string, position: string): TitleCompany => ({ position, company, order: "company-first" });

  const at = t.match(/^(.*?)\s+(?:at|@|for|with)\s+(.*)$/i);
  if (at) return titleFirst(clean(at[1]), clean(at[2]));

  const parts = splitSegments(t);
  if (parts.length >= 2) {
    const [a, b] = parts;
    const aRole = hasRoleWord(a);
    const bRole = hasRoleWord(b);
    const aCo = COMPANY_WORD.test(a) || LEGAL_SUFFIX.test(a);
    const bCo = COMPANY_WORD.test(b) || LEGAL_SUFFIX.test(b);
    // Company markers outrank role words: "Acme Technologies, Engineer".
    if (aCo && !bCo && !aRole) return companyFirst(a, b);
    if (bCo && !aCo && !bRole) return titleFirst(a, b);
    if (aRole && !bRole) return titleFirst(a, b);
    if (bRole && !aRole) return companyFirst(a, b);
    return { position: a, company: b, order: null, ambiguous: true };
  }

  // A lone segment with a role word is a title — even "Senior Software
  // Engineer" or "Systems Engineer" — unless it carries a legal suffix.
  if (hasRoleWord(t) && !LEGAL_SUFFIX.test(t)) return { position: t, company: "", order: null };
  return { position: "", company: t, order: null };
}

const LEGAL_SUFFIX = /\b(?:inc|llc|llp|ltd|limited|plc|pvt|corp|corporation|gmbh)\b\.?/i;
// The tail of a company name wrapped onto the next line ("Northwind" / "Labs").
const COMPANY_TAIL =
  /^(?:labs?|inc\.?|llc|ltd\.?|limited|pvt\.?(?:\s*ltd\.?)?|corp\.?|corporation|technologies|systems|solutions|software|group|studios?|digital|consulting|consultancy|services)$/i;

interface WorkBlock {
  meta: string[];
  body: { text: string; marked: boolean }[];
}

type TitleOrder = "title-first" | "company-first";

interface BuiltWork {
  entry: WorkEntry;
  /** The header opened on a company-only line (roles grouped under it). */
  opensWithCompany: boolean;
  /** Which side held the title, when evidence (not a default) decided it. */
  order: TitleOrder | null;
  /** Title and company were told apart by position alone, without evidence. */
  ambiguous: boolean;
  /** The company was taken from the role above (grouped roles). */
  inherited?: boolean;
}

// LinkedIn-style durations next to a date: "(3 years 8 months)", "· 2 yrs".
export const DURATION =
  /[(·]\s*(?:less than a year|\d+\s*(?:years?|yrs?)(?:\s+\d+\s*(?:months?|mos?))?|\d+\s*(?:months?|mos?))\s*\)?/gi;

/** Title-or-company evidence for one header part. */
const looksLikeTitle = (s: string) => hasRoleWord(s) && !LEGAL_SUFFIX.test(s);
const looksLikeCompany = (s: string) => (COMPANY_WORD.test(s) || LEGAL_SUFFIX.test(s)) && !hasRoleWord(s);

function buildWork(block: WorkBlock): BuiltWork {
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
    rest = rest.replace(DURATION, " ");

    const loc = extractLocation(rest);
    if (loc && !location) {
      location = loc.value;
      rest = loc.rest;
    }

    rest = clean(rest);
    if (rest) titleParts.push(rest);
  }

  // A single date ("Summer 2014", "2019"): the role started and ended then.
  if (!dateFound) {
    for (let i = 0; i < titleParts.length; i++) {
      const single = matchSingleDate(titleParts[i]);
      if (!single) continue;
      startDate = endDate = parseMonthYear(single);
      titleParts[i] = clean(titleParts[i].replace(single, " "));
      break;
    }
  }
  const parts = titleParts.filter(Boolean);
  const opensWithCompany =
    block.meta.length > 1 && !lineHasDateRange(block.meta[0]) && !hasRoleWord(block.meta[0]);

  let position = "";
  let company = "";
  let order: TitleOrder | null = null;
  let ambiguous = false;
  const summaryParts: string[] = [];
  const [first, second, ...more] = parts;

  if (first && second && splitSegments(first).length === 1) {
    // Title and company on separate lines, in either order.
    if (looksLikeTitle(first) && !looksLikeTitle(second)) order = "title-first";
    else if (looksLikeTitle(second) && !looksLikeTitle(first)) order = "company-first";
    else if (looksLikeCompany(first) && !looksLikeCompany(second)) order = "company-first";
    else if (looksLikeCompany(second) && !looksLikeCompany(first)) order = "title-first";
    [position, company] = order === "company-first" ? [second, first] : [first, second];
    ambiguous = order === null;
    summaryParts.push(...more);
  } else if (first) {
    const parsed = splitTitleCompany(first);
    position = parsed.position;
    company = parsed.company;
    order = parsed.order;
    ambiguous = parsed.ambiguous === true;
    if (second) {
      // A second header line is usually the other half of the pair, or the
      // tail of a company name wrapped onto it ("Northwind" / "Labs").
      if (company && (COMPANY_TAIL.test(second) || /^\([^()]{1,30}\)$/.test(second))) {
        company = `${company} ${second}`;
      } else if (!company && !hasRoleWord(second)) company = second;
      else if (!position && hasRoleWord(second)) position = second;
      else summaryParts.push(second);
    }
    summaryParts.push(...more);
  }

  // Unmarked lines ahead of the first real bullet introduce the role.
  const firstMarked = block.body.findIndex((b) => b.marked);
  const lead = firstMarked > 0 ? block.body.slice(0, firstMarked) : [];
  const highlights = block.body.slice(lead.length).map((b) => b.text);
  summaryParts.push(...lead.map((b) => b.text));

  return {
    entry: {
      id: uid(),
      name: company,
      position,
      location,
      url: "",
      startDate,
      endDate,
      summary: summaryParts.join(" "),
      highlights,
    },
    opensWithCompany,
    order,
    ambiguous,
  };
}

/** True when nothing but a date (and maybe a location) is on the line. */
function isDateOnlyLine(line: string): boolean {
  const dr = extractDateRange(line);
  if (!dr) return false;
  let rest = stripMatched(line, dr.matched).replace(DURATION, " ");
  const loc = extractLocation(rest);
  if (loc) rest = loc.rest;
  return clean(rest).length <= 3;
}

type LineKind = "bullet" | "header" | "body";
interface ExperienceLine {
  kind: LineKind;
  text: string;
  dated: boolean;
}

/**
 * Pass 1 — label every line of the Experience section. Bullets carry a
 * marker; header lines are short and heading-shaped (titles, employers,
 * places, dates); everything else is body text. Wrapped text joins the line
 * it continues before anything else is decided.
 */
function classifyExperience(lines: string[]): ExperienceLine[] {
  const out: ExperienceLine[] = [];
  for (const line of lines) {
    if (isBullet(line)) {
      out.push({ kind: "bullet", text: stripBullet(line), dated: false });
      continue;
    }
    const dated = lineHasDateRange(line);
    const titled = hasRoleTitle(line) && isHeaderShaped(line);
    const prev = out[out.length - 1];
    // Wrapped bullet/body text re-joins its line — checked before job
    // headers, so "product manager to ship…" can't open a job. A capitalised
    // title after a finished sentence ("iOS Developer | Apple") still can.
    if (
      prev &&
      prev.kind !== "header" &&
      !dated &&
      !(titled && /[.!?]$/.test(prev.text)) &&
      isContinuation(line, prev.text)
    ) {
      prev.text += ` ${line}`;
      continue;
    }
    // "Key Achievements:" / "Responsibilities:" label the bullets below it.
    if (/:$/.test(line) && wordCount(line) <= 4 && !dated) continue;
    if (dated || titled) out.push({ kind: "header", text: line, dated });
    else if (isUnmarkedBullet(line) || isProse(line)) out.push({ kind: "body", text: line, dated: false });
    else if (isHeaderShaped(line) && wordCount(line) <= 8) out.push({ kind: "header", text: line, dated: false });
    else out.push({ kind: "body", text: line, dated: false });
  }
  return out;
}

/**
 * Split one run of header lines into entries at its date ranges — each job
 * carries one. Lines between two dates go to the earlier entry when the
 * résumé puts dates first ("2020 – Present" / "Engineer, Stripe"), else to the
 * later one ("Engineer, Stripe" / "2020 – Present"); a lone place stays with
 * the entry above it. Returns the entries and any leading lines that belong to
 * the previous job instead (more than two before its first date).
 */
function splitHeaderRun(
  lines: ExperienceLine[],
  dateFirst: boolean,
): { metas: string[][]; leftovers: string[] } {
  const anchors = lines.flatMap((l, i) => (l.dated ? [i] : []));
  const texts = lines.map((l) => l.text);
  const leadCount = anchors[0];
  const keepLead = dateFirst ? 0 : Math.min(2, leadCount);
  const leftovers = texts.slice(0, leadCount - keepLead);

  const metas: string[][] = [];
  let start = leadCount - keepLead;
  for (let a = 0; a < anchors.length; a++) {
    const anchor = anchors[a];
    const nextAnchor = anchors[a + 1];
    if (nextAnchor === undefined) {
      metas.push(texts.slice(start));
      break;
    }
    // Lines strictly between this anchor and the next one.
    let cut: number;
    if (dateFirst) {
      cut = nextAnchor;
    } else {
      cut = anchor + 1;
      while (cut < nextAnchor && extractLocation(texts[cut])?.rest === "") cut++;
    }
    metas.push(texts.slice(start, cut));
    start = cut;
  }
  return { metas, leftovers };
}

export function parseWorkEntries(sections: Sections): WorkEntry[] {
  return parseWorkDetailed(sections).entries;
}

/**
 * Work entries plus the indexes of entries whose title/company split was a
 * pure guess — two parts, no evidence for either reading, and no order
 * learned from the other entries. The review screen asks about those.
 */
export function parseWorkDetailed(sections: Sections): { entries: WorkEntry[]; guessed: number[] } {
  const text = (sections.experience ?? "").trim();
  if (!text) return { entries: [], guessed: [] };
  const lines = classifyExperience(nonEmptyLines(text));

  // Group consecutive header lines into runs; body lines between them.
  type Group = { header: boolean; lines: ExperienceLine[] };
  const groups: Group[] = [];
  for (const line of lines) {
    const header = line.kind === "header";
    const last = groups[groups.length - 1];
    if (last && last.header === header) last.lines.push(line);
    else groups.push({ header, lines: [line] });
  }

  // Learn the résumé's layout: a date-only line opening a header run means
  // dates come first; one after the title means they come last.
  let dateFirstVotes = 0;
  let dateLastVotes = 0;
  for (const g of groups) {
    if (!g.header || g.lines.length < 2) continue;
    const i = g.lines.findIndex((l) => l.dated);
    if (i < 0 || !isDateOnlyLine(g.lines[i].text)) continue;
    if (i === 0) dateFirstVotes++;
    else dateLastVotes++;
  }
  const dateFirst = dateFirstVotes > dateLastVotes;

  // Pass 2 — turn header runs into entries; body lines join the entry above.
  const blocks: WorkBlock[] = [];
  const open = (meta: string[]) => {
    const block: WorkBlock = { meta, body: [] };
    blocks.push(block);
    return block;
  };
  const current = () => blocks[blocks.length - 1] ?? open([]);

  for (const g of groups) {
    if (!g.header) {
      const block = current();
      for (const l of g.lines) block.body.push({ text: l.text, marked: l.kind === "bullet" });
      continue;
    }
    const dated = g.lines.some((l) => l.dated);
    if (!dated) {
      // An undated run is a job only if it names a role; otherwise it's
      // stray short text from the job above (a tech list, a team name).
      if (g.lines.some((l) => hasRoleTitle(l.text)) || blocks.length === 0) open(g.lines.map((l) => l.text));
      else for (const l of g.lines) current().body.push({ text: l.text, marked: false });
      continue;
    }
    const { metas, leftovers } = splitHeaderRun(g.lines, dateFirst);
    if (leftovers.length) {
      const block = current();
      for (const t of leftovers) block.body.push({ text: t, marked: false });
    }
    for (const meta of metas) open(meta);
  }

  // Pass 3 — build entries, then repair them with what the whole section says.
  const built = blocks.filter((b) => b.meta.length || b.body.length).map(buildWork);

  // Roles grouped under one employer (LinkedIn): a role with no company
  // inherits the employer of the role above it, if that one opened on the
  // employer's own line.
  for (let i = 1; i < built.length; i++) {
    const { entry } = built[i];
    const prev = built[i - 1];
    if (!entry.name && entry.position && prev.entry.name && (prev.opensWithCompany || prev.inherited)) {
      entry.name = prev.entry.name;
      built[i].inherited = true;
    }
  }

  // Ambiguous title/company pairs follow the order the confident ones use.
  const companyFirst = built.filter((b) => b.order === "company-first").length;
  const titleFirst = built.filter((b) => b.order === "title-first").length;
  if (companyFirst > titleFirst) {
    for (const b of built) {
      if (b.ambiguous && b.entry.name && b.entry.position) {
        [b.entry.name, b.entry.position] = [b.entry.position, b.entry.name];
      }
    }
  }
  const orderLearned = companyFirst !== titleFirst;
  const guessed = built.flatMap((b, i) =>
    b.ambiguous && !orderLearned && b.entry.name && b.entry.position ? [i] : [],
  );

  return { entries: built.map((b) => b.entry), guessed };
}

// ---- Education -----------------------------------------------------------

// Spelled-out degrees: "Bachelor of Technology", "Master of Business Administration".
const DEGREE_FIELDS =
  "science|sciences|arts|technology|engineering|commerce|business administration|computer applications|computer science|fine arts|education|laws?|philosophy|architecture|design|pharmacy|medicine|surgery|management|economics|mathematics|statistics|nursing|journalism|social work|public health|information technology|applied science|music|physical education|dental surgery|mass communication|hotel management";
// Word edges as lookarounds, not \b: the production minifier folds this
// constant template literal into a string and mangles "\\b" into a backspace.
const DEGREE_PHRASE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:bachelor|master|doctor|associate)(?:'?s)?(?:\\s+degree)?(?:\\s+of\\s+(?:${DEGREE_FIELDS}))?(?![\\p{L}])`,
  "iu",
);
// Abbreviated degrees, dotted 2-letter forms and school-level qualifications.
const DEGREE_ABBREV =
  /\b(?:ph\.?\s?d\.?|d\.?\s?phil\.?|doctorate|m\.?\s?b\.?\s?a\.?|b\.?\s?tech\.?|m\.?\s?tech\.?|b\.?\s?sc\.?|m\.?\s?sc\.?|b\.?\s?c\.?\s?a\.?|m\.?\s?c\.?\s?a\.?|b\.?\s?com\.?|m\.?\s?com\.?|b\.?\s?b\.?\s?a\.?|b\.?\s?b\.?\s?m\.?|b\.?\s?m\.?\s?s\.?|b\.?\s?arch\.?|m\.?\s?arch\.?|b\.?\s?pharm\.?|m\.?\s?pharm\.?|b\.?\s?des\.?|m\.?\s?des\.?|b\.?\s?ed\.?|m\.?\s?ed\.?|b\.?\s?f\.?\s?a\.?|m\.?\s?f\.?\s?a\.?|m\.?\s?phil\.?|b\.?\s?eng\.?|m\.?\s?eng\.?|mbbs|bds|ll\.?\s?b\.?|ll\.?\s?m\.?|pgdm|pgdba|pg\s?diploma|diploma|high school|(?:higher|senior)\s+secondary|secondary|hsc|ssc|sslc|puc|intermediate|matriculation|class\s+(?:x{1,2}i{0,2}|1[02])(?:th)?|(?:10|12)th(?:\s+(?:grade|standard|std|class))?|ged|[ao][\s-]levels?|[bm]\.\s?[aes]\.?)(?![\p{L}])/iu;
// Bare two-letter degrees only in capitals — "be"/"me"/"ms" are also words.
const DEGREE_BARE = /\b(?:BE|ME|BA|MA|BS|MS)\b/;

/** The degree mentioned in a line, earliest first (then longest). */
function findDegree(line: string): { text: string; index: number } | null {
  const hits = [DEGREE_PHRASE, DEGREE_ABBREV, DEGREE_BARE]
    .map((re) => line.match(re))
    .filter((m): m is RegExpMatchArray => !!m && m.index !== undefined)
    .map((m) => ({ text: m[0].trim(), index: m.index! }));
  if (!hits.length) return null;
  hits.sort((a, b) => a.index - b.index || b.text.length - a.text.length);
  return hits[0];
}

const SCORE_RE =
  /\b(?:gpa|cgpa|cpi|sgpa|grade|percentage|aggregate|marks|score)\s*[:\-]?\s*\d{1,3}(?:\.\d{1,2})?(?:\s*\/\s*\d{1,3})?\s*%?|\d\.\d{1,2}\s*(?:gpa|cgpa|cpi)|\d(?:\.\d{1,2})?\s*\/\s*(?:10|4|5)\b(?:\s*(?:gpa|cgpa|cpi)\b)?|\b\d{1,3}(?:\.\d{1,2})?\s*%/i;

// The last word of a field of study, when it wraps onto its own line.
const FIELD_TAIL =
  /^(?:science|sciences|engineering|technology|studies|administration|analytics|management|design|arts|commerce|economics|mathematics|physics|chemistry|biology|systems|applications)$/i;

const COURSEWORK_LINE =
  /^(?:relevant\s+|key\s+|core\s+)?(?:course\s*work|courses|subjects)\s*[:\-]\s*(.+)$/i;

/** Remove date ranges, scores and trailing separators from a meta line. */
function stripMetaNoise(line: string): string {
  let s = line;
  const dr = extractDateRange(s);
  if (dr) s = stripMatched(s, dr.matched);
  s = s.replace(SCORE_ALL, " ");
  const single = matchSingleDate(s);
  if (single) s = s.replace(single, " ");
  s = s.replace(/(?:19|20)\d{2}/g, " ");
  // Brackets, dots and colons the dates and scores were cut out of:
  // "Marketing · ( )", "Prayagraj (ICSE), 2021: 95%".
  s = s
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/\s+·\s*$/, "")
    .replace(/[^\S\n]*:[^\S\n]*(?=,|$)/g, "")
    .replace(/,\s*(?=,|$)/g, "");
  return clean(s);
}

const SCORE_ALL = new RegExp(SCORE_RE.source, "gi");

/** Text after a degree: "(CBSE)" / "(B.Des)" join the degree; ", CS" / "in CS" is the field. */
function splitAfterDegree(after: string): { suffix: string; field: string } {
  let rest = after;
  let suffix = "";
  const board = rest.match(/^\s*(\((?:[A-Z][A-Za-z.]{1,8}|Hons\.?|Honou?rs)\))/);
  if (board) {
    suffix = ` ${board[1]}`;
    rest = rest.slice(board[0].length);
  }
  rest = rest.replace(/^[\s,.:\-–—]+/, "");
  // LinkedIn repeats the degree as an abbreviation: "Master of … - MBA, Marketing".
  // Only when a field follows it — "MBA in MBA" keeps its one field.
  const again = findDegree(rest);
  if (again && again.index === 0) {
    const afterAgain = rest.slice(again.text.length).replace(/^[\s,.:\-–—]+/, "");
    if (/^\p{L}/u.test(afterAgain)) rest = afterAgain;
  }
  rest = rest.replace(/^(?:in|of)\s+/i, "");
  if (rest.startsWith("(")) rest = rest.replace(/^\(([^)]*)\).*/, "$1");
  // The field runs up to the institution: "Physics, Indian Institute of Science".
  const segments = rest.split(/\s+[|\-–—]\s+|[|;·]/)[0].split(/,\s+/);
  const inst = segments.findIndex((s) => INSTITUTION_RE.test(s));
  let field = clean((inst >= 0 ? segments.slice(0, inst) : segments).join(", "));
  // "Nursing (BSN)": the abbreviation repeats the degree, not the field.
  field = field.replace(/\s*\([A-Z][A-Za-z.]{1,6}\)$/, "");
  return { suffix, field };
}

/** The institution in text that follows a degree: "…, Computer Science - TU München". */
function institutionAfterDegree(after: string): string {
  const segments = after
    .replace(/^\s*\([^)]*\)/, "")
    .split(/\s+[|\-–—]\s+|,\s+/)
    .map((s) => clean(s))
    .filter(Boolean);
  const i = segments.findIndex((s) => INSTITUTION_RE.test(s));
  if (i >= 0) return segments.slice(i).join(", ");
  return clean(after.replace(/^\s*\([^)]*\)/, "").split(/,\s+(?=[\p{L}]+\s*$)/u)[0]);
}

/**
 * Places are not part of an institution's name when set apart from it
 * ("Southwestern University | Georgetown, TX") or when they're a whole country
 * or state ("TU München, Germany"). A city in the name stays ("IISc, Bengaluru").
 */
function trimInstitutionPlace(inst: string): string {
  let s = inst
    .split(/\s+\|\s+/)
    .filter((seg, i) => i === 0 || !(isLocationLine(seg) || extractLocation(seg)?.rest === ""))
    .join(" | ");
  for (;;) {
    const m = s.match(/,\s*([\p{L}][\p{L} .'-]*)$/u);
    if (!m || m.index === undefined) break;
    const region = m[1].trim();
    if (!KNOWN_REGIONS.has(region.toLowerCase()) && !REGION_CODES.has(region)) break;
    s = s.slice(0, m.index);
  }
  return clean(s);
}

function buildEducation(lines: string[]): EducationEntry {
  let startDate = "";
  let endDate = "";
  let score = "";
  const courses: string[] = [];
  const body: string[] = [];

  for (const line of lines) {
    const cw = line.match(COURSEWORK_LINE);
    if (cw) {
      courses.push(...cw[1].split(/[,;|]/).map((c) => clean(c)).filter(Boolean));
      continue;
    }
    body.push(line);
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

  let institution = "";
  let studyType = "";
  let area = "";

  const degLine = body.find((l) => findDegree(l));
  let schoolLevel = false;
  if (degLine) {
    const cleaned = stripMetaNoise(degLine);
    const deg = findDegree(cleaned);
    if (deg) {
      const after = cleaned.slice(deg.index + deg.text.length);
      const { suffix, field } = splitAfterDegree(after);
      studyType = deg.text.replace(/\s+/g, " ") + suffix;
      // "Class XII — MV Convent, Prayagraj": a school qualification has no
      // field of study; the text after it names the school.
      schoolLevel = SCHOOL_LEVEL.test(deg.text);
      if (schoolLevel) {
        const school = institutionAfterDegree(suffix ? after.replace(/^\s*\([^)]*\)/, "") : after);
        if (school && !findDegree(school)) institution = trimInstitutionPlace(school);
      } else if (
        field.length >= 2 &&
        field.length <= 60 &&
        /^[\p{L}][\p{L} &/\-.(),]*$/u.test(field) &&
        !INSTITUTION_RE.test(field)
      ) {
        area = field;
      }
    }
    // A field of study wrapped in a narrow column: "…& Computer" / "Science".
    const tail = body[body.indexOf(degLine) + 1]?.trim();
    if (area && tail && FIELD_TAIL.test(tail) && !/[.,;:)]$/.test(area)) area = `${area} ${tail}`;
  }

  const instLine = body.find((l) => INSTITUTION_RE.test(l));
  if (instLine && !(schoolLevel && institution && instLine === degLine)) {
    let inst = stripMetaNoise(instLine);
    // "University of Washington - B.S., CS" / "Class XII (CBSE) - Delhi Public
    // School": keep only the institution side of the degree.
    const deg = findDegree(inst);
    if (deg) {
      const before = clean(inst.slice(0, deg.index));
      inst = INSTITUTION_RE.test(before) ? before : institutionAfterDegree(inst.slice(deg.index + deg.text.length));
    }
    institution = trimInstitutionPlace(inst);
  }

  // No institution word ("MIT", "Stanford"): the entry's first line, or the
  // text before the degree when they share a line ("NYU Stern - MBA").
  if (!institution && body[0] && body[0] !== degLine) institution = stripMetaNoise(body[0]);
  if (!institution && degLine) {
    const cleaned = stripMetaNoise(degLine);
    const deg = findDegree(cleaned);
    const before = deg ? clean(cleaned.slice(0, deg.index)) : "";
    if (before && wordCount(before) <= 8) institution = before;
  }

  // The exam board after a school's name belongs with the qualification:
  // "MV Convent, Prayagraj (CBSE)" → "Class XII (CBSE)".
  const board = schoolLevel ? institution.match(/\s*\(([A-Z]{2,6}|State Board)\)$/) : null;
  if (board && board.index !== undefined && !studyType.includes("(")) {
    studyType = `${studyType} (${board[1]})`;
    institution = clean(institution.slice(0, board.index));
  }

  return { id: uid(), institution, area, studyType, startDate, endDate, score, courses };
}

// School-level qualifications: no field of study, the school is named after them.
const SCHOOL_LEVEL =
  /^(?:class\b|high school|(?:higher|senior)\s+secondary|secondary|hsc|ssc|sslc|puc|intermediate|matriculation|(?:10|12)th|ged|[ao][\s-]levels?)/i;

/**
 * "Class XII — MV Convent, 2023: 93% | Class X — Boys' High School, 2021: 95%":
 * two qualifications packed on one line become one line each.
 */
function splitPackedEducation(line: string): string[] {
  const parts = line.split(/\s+\|\s+/);
  if (parts.filter((p) => findDegree(p)).length < 2) return [line];
  const out: string[] = [];
  for (const p of parts) {
    if (findDegree(p) || out.length === 0) out.push(p);
    else out[out.length - 1] += ` | ${p}`;
  }
  return out;
}

export function parseEducationEntries(sections: Sections): EducationEntry[] {
  const text = (sections.education ?? "").trim();
  if (!text) return [];
  const lines = nonEmptyLines(text)
    .map((l) => (isBullet(l) ? stripBullet(l) : l))
    .flatMap(splitPackedEducation);

  // A new entry starts when a line would fill a slot the current entry already
  // has — a second institution or a second degree. Works for institution-first
  // and degree-first layouts alike.
  const blocks: { lines: string[]; inst: boolean; deg: boolean; dated: boolean }[] = [];
  let cur: (typeof blocks)[number] | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inst = INSTITUTION_RE.test(line);
    const deg = !!findDegree(line);
    // A second date range also starts a new entry — institutions without a
    // telltale word ("MIT | Sep 2016 – Jun 2018") still split cleanly.
    const dated = lineHasDateRange(line);
    const plain = !deg && !dated && !SCORE_RE.test(line) && !COURSEWORK_LINE.test(line);
    // After a complete entry (institution, degree and dates), a short plain
    // line followed by a degree or dates is the next institution ("NYU Stern"
    // / "B.S., Finance") — not a wrapped field of study ("…& Computer" / "Science").
    const next = lines[i + 1] ?? "";
    const nextInstitution =
      plain &&
      !!cur?.inst &&
      !!cur?.deg &&
      !!cur?.dated &&
      wordCount(line) <= 5 &&
      !/[:.;!?]/.test(line) &&
      (!!findDegree(next) || lineHasDateRange(next));
    const collides =
      cur !== null &&
      ((inst && cur.inst) || (deg && cur.deg) || (dated && cur.dated) || nextInstitution);
    if (!cur || collides) {
      // An entry opening on a plain line ("MIT", "NYU Stern") opens on its
      // institution, even without an institution keyword.
      cur = { lines: [], inst: plain, deg: false, dated: false };
      blocks.push(cur);
    }
    cur.lines.push(line);
    cur.inst ||= inst;
    cur.deg ||= deg;
    cur.dated ||= dated;
  }

  return blocks
    .map((b) => buildEducation(b.lines))
    .filter((e) => e.institution || e.studyType);
}

// ---- Projects ------------------------------------------------------------

const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9.\-]+\.[a-z]{2,}(?:\/\S*)?)/i;
const TECH_LINE =
  /^(?:tech(?:nolog(?:y|ies))?(?:\s+(?:stack|used))?|stack|tools(?:\s+used)?|built\s+with|languages?(?:\s+used)?|frameworks?)\s*[:\-]\s*(.+)$/i;

const splitList = (s: string) =>
  s
    .split(/[,/|]+/)
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * "TypeScript, Next.js, ClickHouse" — a comma list that is mostly known tech.
 * Inside a project's header, after its name and tagline, a short comma list
 * needs fewer known names ("ESP32, C++, IoT, WiFi").
 */
function looksLikeTechList(s: string, minKnownShare = 0.5): boolean {
  if (/\s\|\s/.test(s)) return false; // "Name | Tech" is a header, not a list
  const items = splitList(s);
  if (items.length < 2 || items.some((i) => wordCount(i) > 3 || /[.!?]$/.test(i))) return false;
  const known = items.filter((i) => isKnownSkill(i)).length;
  return known > 0 && known / items.length >= minKnownShare;
}

/** A description sentence under a project heading, not a new heading. */
function isProse(line: string): boolean {
  if (startsWithActionVerb(line) && wordCount(line) >= 4) return true;
  const lowerWords = line.split(/\s+/).filter((w) => /^[a-z]/.test(w)).length;
  return wordCount(line) >= 6 && (/[.!]$/.test(line) || lowerWords >= 3);
}

function parseProjectHeader(line: string): ProjectEntry {
  let rest = line;

  // A labelled link, with its label and brackets: "(Live: site.com)".
  let url = "";
  const labelled = rest.match(LABELLED_LINK);
  if (labelled) {
    url = /^https?:/i.test(labelled[1]) ? labelled[1] : `https://${labelled[1]}`;
    rest = rest.replace(labelled[0], " ");
  }

  // Dates aren't part of the name. Projects have no date field, so they're
  // kept at the end of the description rather than lost.
  let dates = "";
  const dr = extractDateRange(rest);
  if (dr) {
    dates = dr.matched.trim();
    rest = stripMatched(rest, dr.matched);
  } else {
    const year = rest.match(/(?:^|\s)[|\-–—·,]?\s*((?:19|20)\d{2})\s*$/);
    if (year && year.index !== undefined) {
      dates = year[1];
      rest = rest.slice(0, year.index);
    }
  }

  const um = url ? null : rest.match(URL_RE);
  if (um && /\.(com|dev|io|net|org|app|me|co)\b/i.test(um[1])) {
    url = um[1].startsWith("http") ? um[1] : `https://${um[1]}`;
    rest = rest.replace(um[0], " ").trim();
  }

  let keywords: string[] = [];
  // Trailing parenthetical tech list, e.g. "(React, Node, Postgres)".
  const paren = rest.match(/\(([^)]+)\)\s*$/);
  if (paren && /[,/]/.test(paren[1])) {
    keywords = splitList(paren[1]);
    rest = rest.replace(paren[0], " ").trim();
  }
  // Or an explicit "Tech:/Stack:/Technologies:" suffix.
  const tech = rest.match(/\b(?:tech|stack|technologies|tools)\s*:\s*(.+)$/i);
  if (tech) {
    keywords = splitList(tech[1]);
    rest = rest.replace(tech[0], " ").trim();
  }

  const parts = rest.split(/\s+[|\-–—:·]\s+|:\s+/).map(clean).filter(Boolean);
  const name = parts[0] ?? clean(rest);
  const descParts: string[] = [];
  for (const part of parts.slice(1)) {
    // "OpenMetrics | TypeScript, Next.js" — a tech list, not a description.
    if (!keywords.length && looksLikeTechList(part, 0.25)) keywords = splitList(part);
    else descParts.push(part);
  }
  const description = descParts.join(" - ");

  return {
    id: uid(),
    name,
    description: dates ? (description ? `${description} · ${dates}` : dates) : description,
    highlights: [],
    url,
    keywords: keywords.map(tidySkill),
  };
}

// "(Live: site.com)" / "Demo: https://…" — a link with its label.
const LABELLED_LINK =
  /\(?\s*\b(?:live|demo|link|url|website|site|repo|code|github)\s*:\s*((?:https?:\/\/)?[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}(?:\/[^\s)]*)?)\s*\)?/i;

export function parseProjectEntries(sections: Sections): ProjectEntry[] {
  const text = (sections.projects ?? "").trim();
  if (!text) return [];
  const lines = nonEmptyLines(text);

  const entries: ProjectEntry[] = [];
  let cur: ProjectEntry | null = null;
  // A tech list printed above its project's name (right-aligned in a narrow
  // column lands first): held for the next project.
  let pendingKeywords: string[] = [];
  const flush = () => {
    if (cur && (cur.name || cur.description || cur.highlights.length)) {
      entries.push(cur);
    }
    cur = null;
  };

  for (const line of lines) {
    const c = cur as ProjectEntry | null;
    if ((!c || c.keywords.length > 0) && !isBullet(line) && looksLikeTechList(line)) {
      pendingKeywords = splitList(line).map(tidySkill);
      continue;
    }
    if (isBullet(line)) {
      if (!c) cur = { id: uid(), name: "", description: "", highlights: [], url: "", keywords: [] };
      cur!.highlights.push(stripBullet(line));
      continue;
    }
    if (c && c.highlights.length > 0 && isContinuation(line, c.highlights[c.highlights.length - 1])) {
      c.highlights[c.highlights.length - 1] += ` ${line}`;
      continue;
    }
    if (c) {
      const tech = line.match(TECH_LINE);
      if (tech || (!c.keywords.length && looksLikeTechList(line))) {
        c.keywords = splitList(tech ? tech[1] : line).map(tidySkill);
        continue;
      }
      if (c.description && !c.highlights.length && /^[a-z]/.test(line)) {
        c.description += ` ${line}`;
        continue;
      }
      if (isProse(line)) {
        if (!c.description && !c.highlights.length) c.description = line;
        else c.highlights.push(line);
        continue;
      }
    }
    flush();
    cur = parseProjectHeader(line);
    if (!cur.keywords.length && pendingKeywords.length) cur.keywords = pendingKeywords;
    pendingKeywords = [];
  }
  flush();

  // "… Live: cold-grid.vercel.app" at the end of a bullet is the project's
  // link. The bullet keeps its text; the link also goes on the project.
  for (const e of entries) {
    if (e.url) continue;
    const m = [e.description, ...e.highlights].join(" ").match(LABELLED_LINK);
    if (m) e.url = /^https?:/i.test(m[1]) ? m[1] : `https://${m[1]}`;
  }

  return entries;
}

// ---- Certificates --------------------------------------------------------

// Levels that end a certificate's name — never its issuer.
const CERT_LEVEL =
  /^(?:associate|professional|practitioner|specialty|speciality|foundational|fundamentals|expert|advanced|intermediate|beginner|entry(?:\s+level)?|core|level\s*\d+|part\s*\d+|tier\s*\d+|i{1,3}|iv)$/i;

// Issuers that a certificate's own name gives away.
const KNOWN_ISSUERS: [RegExp, string][] = [
  [/^aws\b|^amazon web services\b/i, "Amazon Web Services"],
  [/^(?:google cloud|gcp)\b/i, "Google Cloud"],
  [/^google\b/i, "Google"],
  [/^(?:microsoft|azure)\b/i, "Microsoft"],
  [/^oracle\b/i, "Oracle"],
  [/^cisco\b|\bccn[ap]\b/i, "Cisco"],
  [/^comptia\b/i, "CompTIA"],
  [/^salesforce\b/i, "Salesforce"],
  [/^red hat\b/i, "Red Hat"],
  [/^hashicorp\b|^terraform\b/i, "HashiCorp"],
  [/\bpmp\b|^project management professional\b|\bcapm\b|^pmi\b/i, "PMI"],
  [/^ibm\b/i, "IBM"],
  [/^meta\b/i, "Meta"],
  [/^databricks\b/i, "Databricks"],
  [/^snowflake\b/i, "Snowflake"],
  [/^tableau\b/i, "Tableau"],
  [/^mongodb\b/i, "MongoDB"],
  [/^(?:certified kubernetes|cka|ckad|cks)\b|\(ck(?:a|ad|s)\)/i, "The Linux Foundation"],
  [/^linux foundation\b/i, "The Linux Foundation"],
  [/^(?:certified scrum|csm|cspo)\b|\((?:csm|cspo)\)/i, "Scrum Alliance"],
  [/^professional scrum|\bpsm\b|\bpspo\b/i, "Scrum.org"],
  [/\bcissp\b|^isc2\b|\(isc\)²/i, "ISC2"],
  [/\bcis[am]\b|\bcrisc\b|^isaca\b/i, "ISACA"],
  [/\bceh\b|^certified ethical hacker\b|^ec-council\b/i, "EC-Council"],
  [/^google analytics\b|^google ads\b/i, "Google"],
  [/^hubspot\b/i, "HubSpot"],
  [/^adobe\b/i, "Adobe"],
  [/^autodesk\b|^autocad\b/i, "Autodesk"],
  [/^sap\b/i, "SAP"],
  [/^servicenow\b/i, "ServiceNow"],
  [/^atlassian\b/i, "Atlassian"],
  [/^nvidia\b/i, "NVIDIA"],
  [/^(?:java se|java ee)\b/i, "Oracle"],
  [/^itil\b/i, "PeopleCert"],
  [/^cfa\b|^chartered financial analyst\b/i, "CFA Institute"],
  [/^frm\b|^financial risk manager\b/i, "GARP"],
  [/^tensorflow developer\b/i, "Google"],
];

// LinkedIn-style detail lines that belong to the certificate above them.
const CERT_DETAIL = /^(?:credential\s+id|credential\s+url|license\s+(?:number|no)|issued|expires|expiry|valid\s+until)\b/i;

// Words that make a line a certificate's name rather than its issuer.
const CERT_WORDS =
  /\b(?:certified|certificate|certification|specialization|specialisation|nanodegree|course|exam|program|programme|associate|professional|developer|architect)\b/i;

const LEVEL_WORDS =
  "associate|professional|practitioner|specialty|speciality|foundational|fundamentals|expert|advanced|intermediate|beginner";

// Words that name an issuing body.
const ISSUER_ORG =
  /\b(?:association|board|council|society|foundation|institute|academy|university|college|commission|federation|agency|department|ministry|alliance|consortium|red cross|coursera|udemy|edx|nptel|linkedin learning|inc|llc|ltd|corporation)\b/i;

interface ParsedCert {
  cert: CertificateEntry;
  /** The issuer was written out (not inferred from the name). */
  explicitIssuer: boolean;
}

/** One certificate line: "Name - Level | Issuer · Date" / "Name by Issuer (2021)". */
function parseCertLine(line: string): ParsedCert {
  let rest = line;
  let date = "";
  const dr = extractDateRange(rest);
  if (dr) {
    date = dr.end || dr.start;
    rest = stripMatched(rest, dr.matched);
  } else {
    const single = matchSingleDate(rest);
    if (single) {
      date = parseMonthYear(single);
      rest = clean(rest.replace(single, " "));
    }
  }
  // "Professional Data Engineer (2022)" leaves "( )" once the year is cut out.
  rest = clean(rest.replace(/\(\s*\)|\[\s*\]/g, " "));

  const segments = rest
    .split(/\s+[|\-–—·]\s+|\s+(?:by|from)\s+/i)
    .map(clean)
    .filter(Boolean);
  let name = clean(rest);
  let issuer = "";
  if (segments.length >= 2) {
    const last = segments[segments.length - 1];
    // "Associate Amazon Web Services": a level glued to the issuer.
    const glued = last.match(new RegExp(`^(${LEVEL_WORDS})\\s+(\\p{Lu}.+)$`, "iu"));
    if (CERT_LEVEL.test(last)) {
      name = segments.join(" - ");
    } else if (glued) {
      name = [...segments.slice(0, -1), glued[1]].join(" - ");
      issuer = glued[2];
    } else {
      issuer = last;
      name = segments.slice(0, -1).join(" - ");
    }
  }
  // "Basic Life Support (BLS), American Heart Association" — issuer after a
  // comma, when it reads as an organisation and the name before it doesn't.
  if (!issuer) {
    const cm = name.match(/^(.+?),\s+([^,]{3,60})$/);
    if (cm && ISSUER_ORG.test(cm[2]) && !ISSUER_ORG.test(cm[1])) {
      name = clean(cm[1]);
      issuer = clean(cm[2]);
    }
  }
  // "AWS Certified Developer (Amazon)" — parenthetical issuer.
  if (!issuer) {
    const pm = name.match(/^(.*?)\s*\(([^)]{2,40})\)$/);
    if (pm && !/[,/]/.test(pm[2]) && !/^[A-Z]{2,6}$/.test(pm[2])) {
      name = clean(pm[1]);
      issuer = clean(pm[2]);
    }
  }
  const explicitIssuer = !!issuer;
  if (!issuer) issuer = KNOWN_ISSUERS.find(([re]) => re.test(name))?.[1] ?? "";

  return { cert: { id: uid(), name, issuer, date, url: "" }, explicitIssuer };
}

export function parseCertificateEntries(sections: Sections): CertificateEntry[] {
  const text = (sections.certifications ?? "").trim();
  if (!text) return [];
  const lines = nonEmptyLines(text).map((l) => (isBullet(l) ? stripBullet(l) : l));

  const parsed: { raw: string; p: ParsedCert }[] = [];
  for (const line of lines) {
    const prev = parsed[parsed.length - 1];
    if (prev && CERT_DETAIL.test(line)) {
      if (!prev.p.cert.date) prev.p.cert.date = extractSingleDate(line);
      continue;
    }
    // A name wrapped in a narrow column: the previous line ends mid-name
    // ("…Architect –" / "Associate") or this line is lowercase / a lone level.
    if (
      prev &&
      (/[-–—|,&]$|\b(?:of|and|in|for|the)$/i.test(prev.raw) ||
        /^[a-z(]/.test(line) ||
        CERT_LEVEL.test(line))
    ) {
      prev.raw = `${prev.raw} ${line}`;
      prev.p = parseCertLine(prev.raw);
      continue;
    }
    // The issuer and date on their own line under the name — exactly
    // "Issuer · Date", e.g. "Amazon Web Services · Sep 2022".
    const issuerLine = line.match(/^([^|·,]{2,50}?)\s*[·|,]\s*([^|·,]+)$/);
    if (prev && !prev.p.cert.date && !prev.p.explicitIssuer && issuerLine) {
      const datePart = issuerLine[2].trim();
      const date = extractSingleDate(datePart);
      const leftover = clean(datePart.replace(matchSingleDate(datePart), ""));
      if (date && !leftover && wordCount(issuerLine[1]) <= 5 && !CERT_WORDS.test(issuerLine[1])) {
        prev.p.cert.issuer = clean(issuerLine[1]);
        prev.p.cert.date = date;
        prev.p.explicitIssuer = true;
        continue;
      }
    }
    parsed.push({ raw: line, p: parseCertLine(line) });
  }
  return parsed.map((x) => x.p.cert).filter((c) => c.name);
}

// ---- Custom sections (publications, awards, unknown headings) ------------

/** More "(" than ")" — the text stops inside a bracket. */
const opensBracket = (s: string) => (s.match(/\(/g)?.length ?? 0) > (s.match(/\)/g)?.length ?? 0);

/**
 * Items of a section the builder has no form for (Awards, Open Source, …).
 * One item per line, except that an item set as a short title line takes
 * the lines under it that complete it: a date on its own line ("Pandas" /
 * "2022") and one sentence of description ("Fixed timezone handling…").
 * Lists of one-line items ("Cricket" / "Reading", achievements ending in a
 * full stop) stay separate items.
 */
export function parseCustomItems(text: string): CustomItem[] {
  const items: CustomItem[] = [];
  let titleLine = false; // the last item opened on a short title line
  let lastRaw = ""; // the last item's text as written (its date not yet cut)
  for (const raw of nonEmptyLines(text)) {
    const bullet = isBullet(raw);
    const line = bullet ? stripBullet(raw) : raw;
    const prev = items[items.length - 1];
    // A wrapped line: lowercase, or the item above stopped inside a bracket
    // or after a comma ("…Qualified: PRMO (2019," / "2021), NSEJS (2019)").
    if (prev && !bullet && (/^[a-z)\]]/.test(line) || opensBracket(lastRaw) || /,$/.test(lastRaw))) {
      lastRaw = `${lastRaw} ${line}`;
      const redone = itemNameAndDate(lastRaw);
      prev.name = redone.name;
      prev.date = redone.date;
      continue;
    }
    if (prev && titleLine && !bullet && !prev.description) {
      const single = matchSingleDate(line);
      if (!prev.date && single && clean(line.replace(single, " ")) === "") {
        prev.date = parseMonthYear(single);
        continue;
      }
      if (!single && !lineHasDateRange(line) && wordCount(line) >= 4 && wordCount(line) > wordCount(prev.name)) {
        prev.description = line;
        continue;
      }
    }
    titleLine = !bullet && wordCount(line) <= 8 && !/[.!?]$/.test(line);
    lastRaw = line;
    const { name, date } = itemNameAndDate(line);
    items.push({ id: uid(), name, description: "", date, url: "", highlights: [] });
  }
  return items;
}

/**
 * An item's own date is a single date mentioned once: "Winner, SIH 2022".
 * A line naming several years ("JEE Mains 2023 … KVPY SA 2022 … PRMO (2019,
 * 2021)") is all content — none of them is the item's date.
 */
function itemNameAndDate(line: string): { name: string; date: string } {
  const years = line.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/g) ?? [];
  if (years.length !== 1 || lineHasDateRange(line)) return { name: clean(line), date: "" };
  const single = matchSingleDate(line);
  if (!single) return { name: clean(line), date: "" };
  return { name: clean(line.replace(single, " ").replace(/\(\s*\)/g, " ")), date: parseMonthYear(single) };
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

/**
 * A summary written straight under the contact block with no heading: the
 * prose lines of the header (sentences, not name/label/contact lines).
 */
export function extractHeaderSummary(sections: Sections): string {
  const prose = nonEmptyLines(sections.header ?? "").filter((l) => {
    if (/@|https?:\/\/|www\.|\+?\d[\d\s().-]{7,}\d/.test(l)) return false;
    const lowerWords = l.split(/\s+/).filter((w) => /^[a-z]/.test(w)).length;
    return wordCount(l) >= 10 && lowerWords >= 4;
  });
  return prose.join(" ").trim();
}

/** Detect a headline/title line in the header (e.g. "Full-Stack Developer"). */
/**
 * The headline under the name. Header lines often pack it with other fields
 * ("Mechanical Engineer | davidkim@yahoo.com | 216-555-0143", "B.Tech (CS) |
 * Final Year Student", "Postdoctoral Researcher, Department of Physics, …"),
 * so it is the first FIELD that names a role — not a contact, degree, place
 * or date.
 */
export function extractLabel(sections: Sections, name: string): string {
  const header = nonEmptyLines(sections.header ?? "");
  for (const line of header) {
    if (line === name || lineHasDateRange(line)) continue;
    for (const field of line.split(/\s*[|•·]\s*/)) {
      // A long field is a headline plus its affiliation: keep the first part.
      const candidate = clean(field.length > 60 ? field.split(/,\s+/)[0] : field);
      if (!candidate || candidate.length > 60) continue;
      if (/@|https?:\/\/|www\.|\d{3}/i.test(candidate) || CONTACT_DOMAIN.test(candidate)) continue;
      if (findDegree(candidate) || isLocationLine(candidate)) continue;
      if (hasRoleWord(candidate)) return candidate;
    }
  }
  return "";
}

const CONTACT_DOMAIN = /\b[a-z0-9-]+\.(?:com|dev|io|me|net|org|in|co|ai|app|design)\b/i;

interface NetworkRule {
  network: string;
  /** Captures the username from a profile URL. */
  url: RegExp;
  base: string;
  /** Label as written before a bare handle ("LeetCode: alex_m"). */
  label: string;
  /** Site paths that look like a username but aren't ("kaggle.com/datasets"). */
  reserved?: RegExp;
}

// Profile URLs end at the username — a repo link ("github.com/u/repo") is not
// a profile, but a trailing separator ("github.com/u|") is fine.
const END = "(?![A-Za-z0-9_\\-]|/[A-Za-z0-9])";
const NETWORKS: NetworkRule[] = [
  { network: "LinkedIn", label: "linked\\s?in", base: "https://linkedin.com/in/", url: new RegExp(`linkedin\\.com/in/([A-Za-z0-9_\\-%]+)`, "gi") },
  { network: "GitHub", label: "github", base: "https://github.com/", url: new RegExp(`github\\.com/([A-Za-z0-9_\\-]+)/?${END}`, "gi"), reserved: /^(?:orgs|sponsors|topics|features|about|pricing|login|settings|marketplace|explore|apps|collections)$/i },
  { network: "GitLab", label: "gitlab", base: "https://gitlab.com/", url: new RegExp(`gitlab\\.com/([A-Za-z0-9_.\\-]+)/?${END}`, "gi"), reserved: /^(?:explore|users|groups|help)$/i },
  { network: "LeetCode", label: "leet\\s?code", base: "https://leetcode.com/u/", url: /leetcode\.com\/(?:u\/)?([A-Za-z0-9_\-]+)/gi, reserved: /^(?:problems|problemset|contest|discuss|explore|studyplan|tag|company)$/i },
  { network: "Kaggle", label: "kaggle", base: "https://kaggle.com/", url: /kaggle\.com\/([A-Za-z0-9_\-]+)/gi, reserved: /^(?:datasets|competitions|code|discussions|learn|models|c|d)$/i },
  { network: "HackerRank", label: "hacker\\s?rank", base: "https://hackerrank.com/profile/", url: /hackerrank\.com\/(?:profile\/)?([A-Za-z0-9_\-]+)/gi, reserved: /^(?:challenges|contests|domains|certificates|certificate|skills-verification|dashboard)$/i },
  { network: "Codeforces", label: "codeforces", base: "https://codeforces.com/profile/", url: /codeforces\.com\/profile\/([A-Za-z0-9_.\-]+)/gi },
  { network: "CodeChef", label: "codechef", base: "https://codechef.com/users/", url: /codechef\.com\/users\/([A-Za-z0-9_\-]+)/gi },
  { network: "Medium", label: "medium", base: "https://medium.com/@", url: /medium\.com\/@([A-Za-z0-9_.\-]+)/gi },
  { network: "Dribbble", label: "dribbble", base: "https://dribbble.com/", url: /dribbble\.com\/([A-Za-z0-9_\-]+)/gi, reserved: /^(?:shots|tags|search|jobs)$/i },
  { network: "Behance", label: "behance", base: "https://behance.net/", url: /behance\.net\/([A-Za-z0-9_\-]+)/gi, reserved: /^(?:gallery|search|joblist)$/i },
  { network: "Twitter", label: "twitter", base: "https://twitter.com/", url: /(?<![\w.])(?:twitter|x)\.com\/([A-Za-z0-9_]+)/gi, reserved: /^(?:home|intent|share|search|i|hashtag)$/i },
];

// Words printed as the visible text of a link, never a handle.
const LINK_LABEL =
  /^(?:portfolio|website|web|site|blog|resume|cv|profile|link|links|here|email|e-mail|mail|phone|mobile|github|linkedin|gitlab|twitter|leetcode|kaggle|medium|behance|dribbble|homepage)$/i;

export function extractProfiles(text: string): Profile[] {
  const profiles: Profile[] = [];
  for (const rule of NETWORKS) {
    // First URL whose path is a real username (not "kaggle.com/datasets/…").
    let username = [...text.matchAll(rule.url)]
      .map((m) => m[1])
      .find((u) => !rule.reserved?.test(u)) ?? "";
    if (!username) {
      // "GitHub: alexmorgan" / "LeetCode - alex_m" — a handle after a label.
      // Never across " | ": in "GitHub | Portfolio" both are link labels.
      const handle = text.match(
        new RegExp(`(?<![A-Za-z0-9])${rule.label}[^\\S\\n]*(?::|[-–][^\\S\\n])[^\\S\\n]*@?([A-Za-z0-9_.\\-]{2,50})(?![A-Za-z0-9_\\-]|\\.[a-z])`, "i"),
      );
      username = handle && !LINK_LABEL.test(handle[1]) ? handle[1] : "";
    }
    username = username.replace(/[.\-]+$/, "");
    if (username && username.toLowerCase() !== "in") {
      profiles.push({ id: uid(), network: rule.network, username, url: rule.base + username });
    }
  }
  return profiles;
}

const SOCIAL_DOMAIN =
  /(?:^|\.)(?:linkedin|github|gitlab|twitter|x|facebook|instagram|medium|behance|dribbble|kaggle|leetcode|hackerrank|codechef|codeforces|stackoverflow|youtube)\.(?:com|net)$/i;
// Bare personal domains ("jopark.dev", "www.jopark.com"). Lowercase only, so
// "B.Tech" / "ASP.NET" never match; never the domain of an email address.
const BARE_DOMAIN =
  /(?<![@\w./-])((?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|dev|io|me|net|org|in|co|ai|app|site|tech|xyz|info|design|page|blog|online|studio|website|space|codes|art|co\.in|co\.uk))(?![\w@-])(\/[^\s|,)]*)?/g;

const SOCIAL_URL = /(linkedin|github|gitlab|twitter|facebook|instagram)\.com/i;
const explicitUrls = (s: string) =>
  (s.match(/https?:\/\/[^\s|]+/gi) || []).map((u) => u.replace(/[).,]+$/, "")).filter((u) => !SOCIAL_URL.test(u));

/**
 * The personal website. In order: an explicit http(s) URL in the contact
 * area (`scope` — header and sidebar contact blocks), a bare domain there
 * ("jopark.dev"), then an explicit URL anywhere. Link targets (PDF
 * annotations, Word hyperlinks) only confirm a domain the contact area shows —
 * on their own they're as likely to be a project's link.
 */
export function extractWebsite(text: string, scope: string = text, links: string[] = []): string {
  const inScope = explicitUrls(scope)[0];
  if (inScope) return inScope;

  // "Portfolio" / "Website" printed in the contact area as a link's text: the
  // link behind it is the site. Links come in reading order, so the first
  // web link that isn't a social profile is the one in the header.
  if (/(?<![\p{L}])(?:portfolio|website|personal (?:site|website)|homepage|blog)(?![\p{L}])/iu.test(scope)) {
    const site = links.find((l) => /^https?:\/\//i.test(l) && !SOCIAL_URL.test(l) && !/^https?:\/\/(?:www\.)?(?:x|medium|kaggle|leetcode|behance|dribbble)\./i.test(l));
    if (site) return site.replace(/\/$/, "");
  }

  BARE_DOMAIN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BARE_DOMAIN.exec(scope)) !== null) {
    const host = m[1].replace(/^www\./, "");
    if (SOCIAL_DOMAIN.test(host)) continue;
    const viaLink = links.find((l) => new RegExp(`^https?://(?:www\\.)?${host.replace(/\./g, "\\.")}(?:[/?#]|$)`, "i").test(l));
    return viaLink ? viaLink.replace(/\/$/, "") : `https://${m[1]}${(m[2] ?? "").replace(/[).,/]+$/, "")}`;
  }

  return explicitUrls(text)[0] ?? "";
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
    // "City, ST" (a real 2-letter region code)
    const m = matchCityCode(scope);
    if (m) {
      result.city = m[1];
      result.region = m[2];
      return result;
    }
    // "City, Known-Region" ("Vellore, Tamil Nadu" / "Berlin, Germany")
    const place = matchKnownPlace(scope);
    if (place) {
      result.city = place.city;
      result.region = place.region;
      return result;
    }
    // A known city as one field of a contact line ("Pune | +91 98…"); only in
    // the header/contact scopes — elsewhere it's a job's location.
    if (scope !== text) {
      const city = nonEmptyLines(scope)
        .flatMap((l) => l.split(/\s+[|·•]\s+|\s{2,}/))
        .find((f) => isKnownCity(f));
      if (city) {
        result.city = city.trim();
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
