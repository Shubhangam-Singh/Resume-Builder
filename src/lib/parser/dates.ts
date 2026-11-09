/**
 * Date parsing — normalizes the date formats found in real-world resumes to
 * the model's "YYYY-MM" (or "YYYY") and extracts start/end ranges so entry
 * blobs can be split. Handles: month-name dates ("Mar 2021", "March, 2021",
 * "Jan '20"), numeric ("03/2021", "03.2021", "2021-03", "12/01/2020"), full
 * textual ("12 Jan 2020", "Jan 12, 2020"), seasons ("Summer 2021"), month-only
 * ranges ("Jan – Mar 2021"), abbreviated year ranges ("2014 - 18"), and open
 * starts ("Since 2019").
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
  // Seasons — approximate to the season's first month.
  spring: 3, summer: 6, fall: 9, autumn: 9, winter: 1,
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/** Expand a two-digit year: "'19" → 1900s/2000s pivoting just past today. */
function expandYY(yy: number): number {
  const pivot = (new Date().getFullYear() % 100) + 1;
  return yy <= pivot ? 2000 + yy : 1900 + yy;
}

const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const SEASONS = "spring|summer|fall|autumn|winter";
const YEAR = "(?:19|20)\\d{2}";

/** Normalize a single date token to "YYYY-MM" (or "YYYY", or ""). */
export function parseMonthYear(input: string): string {
  if (!input) return "";
  const s = input.trim().toLowerCase();

  // "12 Jan 2020" / "12th January, 2020"
  let m = s.match(
    new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})\\.?,?\\s*(${YEAR})`),
  );
  if (m && MONTHS[m[1]] !== undefined) return `${m[2]}-${pad(MONTHS[m[1]])}`;

  // "Jan 12, 2020" / "January 12 2020"
  m = s.match(
    new RegExp(`\\b(${MONTH_NAMES})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+(${YEAR})`),
  );
  if (m && MONTHS[m[1]] !== undefined) return `${m[2]}-${pad(MONTHS[m[1]])}`;

  // Month/season name + 4-digit year: "mar 2021", "march, 2021", "mar-2021"
  m = s.match(new RegExp(`\\b(${MONTH_NAMES}|${SEASONS})\\.?[\\s,\\-/]*(${YEAR})`));
  if (m && MONTHS[m[1]] !== undefined) return `${m[2]}-${pad(MONTHS[m[1]])}`;

  // Month name + two-digit year: "Jan '20", "Sept ’19", "Jan-21", "Jun/21"
  m = s.match(new RegExp(`\\b(${MONTH_NAMES})\\.?(?:\\s*,?\\s*'|[\\-/]\\s?'?)(\\d{2})(?!\\d)`));
  if (m && MONTHS[m[1]] !== undefined) {
    return `${expandYY(parseInt(m[2], 10))}-${pad(MONTHS[m[1]])}`;
  }

  // Full numeric date: 12/01/2020, 01-12-2020, 12.01.2020 (month = whichever
  // side is a valid month, preferring the first — US default).
  m = s.match(new RegExp(`\\b(\\d{1,2})[/.\\-](\\d{1,2})[/.\\-](${YEAR})\\b`));
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const mm = a >= 1 && a <= 12 ? a : b >= 1 && b <= 12 ? b : 0;
    return mm ? `${m[3]}-${pad(mm)}` : m[3];
  }

  // MM/YYYY, MM-YYYY, MM.YYYY
  m = s.match(new RegExp(`^(\\d{1,2})[/.\\-](${YEAR})$`));
  if (m) {
    const mm = parseInt(m[1], 10);
    if (mm >= 1 && mm <= 12) return `${m[2]}-${pad(mm)}`;
  }

  // YYYY-MM, YYYY/MM, YYYY.MM
  m = s.match(new RegExp(`^(${YEAR})[/.\\-](\\d{1,2})$`));
  if (m) {
    const mm = parseInt(m[2], 10);
    if (mm >= 1 && mm <= 12) return `${m[1]}-${pad(mm)}`;
  }

  // Year only
  m = s.match(new RegExp(`\\b(${YEAR})\\b`));
  if (m) return m[1];

  return "";
}

// Month names must start a word: "Gram-mar 2019" / "Ku-mar 2019" are not March.
const MONTH_START = `(?<![a-z])(?:${MONTH_NAMES})`;

// A single date token, ordered longest/most-specific first so alternation
// doesn't stop at a partial match ("Jan 12, 2020" before "Jan 2020"…).
const DATE_TOKEN =
  `(?:` +
  `\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAMES})\\.?,?\\s*${YEAR}` + // 12 Jan 2020
  `|${MONTH_START}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+${YEAR}` + // Jan 12, 2020
  `|\\d{1,2}[/.\\-]\\d{1,2}[/.\\-]${YEAR}` + // 12/01/2020
  `|${MONTH_START}\\.?(?:[\\s,\\-/]*${YEAR}|\\s*,?\\s*'\\d{2}|[\\-/]\\s?'?\\d{2})(?!\\d)` + // Jan 2020 / Mar-2021 / Jan '20 / Jan-21
  `|(?<![a-z])(?:${SEASONS})\\s+${YEAR}` + // Summer 2021
  `|\\d{1,2}[/.\\-]${YEAR}` + // 03/2021
  `|${YEAR}[/.\\-]\\d{1,2}(?!\\d)` + // 2021-03
  `|${YEAR}` + // 2021
  `)`;

const PRESENT =
  "present|current(?:ly)?|now|ongoing|today|till\\s*date|to\\s*date|till\\s*now|presently|date|pursuing|continuing";
const RANGE_SEP = "(?:-{1,2}|–|—|~|to|until|till|through|thru)";
// "2021 – Expected 2025": an anticipated end date.
const EXPECTED = "(?:(?:expected|anticipated|exp\\.)\\s*)?";

const RANGE_REGEX = new RegExp(
  `(${DATE_TOKEN})\\s*${RANGE_SEP}\\s*${EXPECTED}(${DATE_TOKEN}|${PRESENT})(?![a-z])`,
  "i",
);
// "Jan – Mar 2021": both months inherit the single year.
const MONTH_MONTH_YEAR = new RegExp(
  `\\b(${MONTH_NAMES})\\.?\\s*${RANGE_SEP}\\s*(${MONTH_NAMES})\\.?\\s*,?\\s*(${YEAR})`,
  "i",
);
// "2014 - 18" / "2014–'18": abbreviated end year inherits the start century.
const YEAR_YY_RANGE = new RegExp(
  `\\b(${YEAR})\\s*${RANGE_SEP}\\s*'?(\\d{2})\\b(?!\\d)`,
  "i",
);
// "Since 2019" / "since Jan 2020": open-ended range.
const SINCE_REGEX = new RegExp(`\\bsince\\s+(${DATE_TOKEN})`, "i");

const SINGLE_DATE_REGEX = new RegExp(DATE_TOKEN, "i");
const PRESENT_REGEX = new RegExp(`^(?:${PRESENT})$`, "i");

export interface DateRange {
  start: string; // "YYYY-MM" | "YYYY" | ""
  end: string; // "YYYY-MM" | "YYYY" | "" (empty = present)
  matched: string; // the exact substring matched, for stripping
}

/** Extract a "start – end" range from a line, if present. */
export function extractDateRange(line: string): DateRange | null {
  // Month–month with one shared year must run before the generic range, which
  // would otherwise read "Jan - Mar 2021" as (bare "Jan"? no) — mis-split.
  let m = line.match(MONTH_MONTH_YEAR);
  if (m) {
    const m1 = MONTHS[m[1].toLowerCase()];
    const m2 = MONTHS[m[2].toLowerCase()];
    if (m1 !== undefined && m2 !== undefined) {
      return {
        start: `${m[3]}-${pad(m1)}`,
        end: `${m[3]}-${pad(m2)}`,
        matched: m[0],
      };
    }
  }

  m = line.match(RANGE_REGEX);
  if (m) {
    const start = parseMonthYear(m[1]);
    const end = PRESENT_REGEX.test(m[2].trim()) ? "" : parseMonthYear(m[2]);
    if (start || end) return { start, end, matched: m[0] };
  }

  // "2014 - 18": only meaningful when the expanded end doesn't precede start.
  m = line.match(YEAR_YY_RANGE);
  if (m) {
    const start = m[1];
    const end = `${expandYY(parseInt(m[2], 10))}`;
    if (parseInt(end, 10) >= parseInt(start, 10)) {
      return { start, end, matched: m[0] };
    }
  }

  m = line.match(SINCE_REGEX);
  if (m) {
    const start = parseMonthYear(m[1]);
    if (start) return { start, end: "", matched: m[0] };
  }

  return null;
}

/** The first single date's exact text in a line ("Oct 2021"), for stripping. */
export function matchSingleDate(line: string): string {
  return line.match(SINGLE_DATE_REGEX)?.[0] ?? "";
}

/** Extract the first single date in a line (e.g. a graduation or cert date). */
export function extractSingleDate(line: string): string {
  const m = matchSingleDate(line);
  return m ? parseMonthYear(m) : "";
}

export function lineHasDateRange(line: string): boolean {
  return (
    MONTH_MONTH_YEAR.test(line) ||
    RANGE_REGEX.test(line) ||
    YEAR_YY_RANGE.test(line) ||
    SINCE_REGEX.test(line)
  );
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
