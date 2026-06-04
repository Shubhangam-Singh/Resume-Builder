/**
 * Date parsing (net-new for the builder import). The reference C# only had a
 * boolean date-range detector; here we additionally normalize varied formats to
 * the model's "YYYY-MM" and capture start/end so entry blobs can be split.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Normalize a single date token to "YYYY-MM" (or "YYYY", or ""). */
export function parseMonthYear(input: string): string {
  if (!input) return "";
  const s = input.trim().toLowerCase();

  // Month name + year: "mar 2021", "march, 2021", "sept 2019"
  let m = s.match(/([a-z]{3,9})\.?\s*,?\s*((?:19|20)\d{2})/);
  if (m && MONTHS[m[1]] !== undefined) return `${m[2]}-${pad(MONTHS[m[1]])}`;

  // MM/YYYY or MM-YYYY
  m = s.match(/^(\d{1,2})[/\-]((?:19|20)\d{2})$/);
  if (m) {
    const mm = parseInt(m[1], 10);
    if (mm >= 1 && mm <= 12) return `${m[2]}-${pad(mm)}`;
  }

  // YYYY-MM or YYYY/MM
  m = s.match(/^((?:19|20)\d{2})[/\-](\d{1,2})$/);
  if (m) {
    const mm = parseInt(m[2], 10);
    if (mm >= 1 && mm <= 12) return `${m[1]}-${pad(mm)}`;
  }

  // Year only
  m = s.match(/\b((?:19|20)\d{2})\b/);
  if (m) return m[1];

  return "";
}

const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const DATE_TOKEN = `(?:(?:${MONTH_NAMES})\\.?\\s*,?\\s*(?:19|20)\\d{2}|\\d{1,2}[/\\-](?:19|20)\\d{2}|(?:19|20)\\d{2}[/\\-]\\d{1,2}|(?:19|20)\\d{2})`;
const PRESENT = "present|current|now|ongoing|till\\s*date|to\\s*date|presently";

const RANGE_REGEX = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|to|until|till|–|—)\\s*(${DATE_TOKEN}|${PRESENT})`,
  "i",
);
const SINGLE_DATE_REGEX = new RegExp(DATE_TOKEN, "i");
const PRESENT_REGEX = new RegExp(`^(?:${PRESENT})$`, "i");

export interface DateRange {
  start: string; // "YYYY-MM" | "YYYY" | ""
  end: string; // "YYYY-MM" | "YYYY" | "" (empty = present)
  matched: string; // the exact substring matched, for stripping
}

/** Extract a "start – end" range from a line, if present. */
export function extractDateRange(line: string): DateRange | null {
  const m = line.match(RANGE_REGEX);
  if (!m) return null;
  const start = parseMonthYear(m[1]);
  const end = PRESENT_REGEX.test(m[2].trim()) ? "" : parseMonthYear(m[2]);
  if (!start && !end) return null;
  return { start, end, matched: m[0] };
}

/** Extract the first single date in a line (e.g. a graduation or cert date). */
export function extractSingleDate(line: string): string {
  const m = line.match(SINGLE_DATE_REGEX);
  return m ? parseMonthYear(m[0]) : "";
}

export function lineHasDateRange(line: string): boolean {
  return RANGE_REGEX.test(line);
}

export function lineHasAnyDate(line: string): boolean {
  return SINGLE_DATE_REGEX.test(line);
}

/** Remove a matched date range/substring from a line, tidying separators. */
export function stripMatched(line: string, matched: string): string {
  return line
    .replace(matched, " ")
    .replace(/\s*[|•·,\-–—]\s*$/g, "")
    .replace(/^\s*[|•·,\-–—]\s*/g, "")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}
