import type { DateFormat, Location } from "./types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "2021-03" -> "Mar 2021" (short). The `format` controls the style:
 *   short   "Mar 2021"   long "March 2021"   numeric "03/2021"
 *   iso     "2021-03"    year "2021"
 * "" -> ""; unparseable -> as-is.
 */
export function formatMonthYear(value: string, format: DateFormat = "short"): string {
  if (!value) return "";
  const trimmed = value.trim();
  const match = /^(\d{4})(?:-(\d{1,2}))?/.exec(trimmed);
  if (!match) return trimmed;
  const year = match[1];
  const month = match[2] ? parseInt(match[2], 10) : undefined;
  const hasMonth = !!month && month >= 1 && month <= 12;

  if (format === "year") return year;
  if (!hasMonth) return year;

  const mm = String(month).padStart(2, "0");
  switch (format) {
    case "long":
      return `${MONTHS_LONG[month - 1]} ${year}`;
    case "numeric":
      return `${mm}/${year}`;
    case "iso":
      return `${year}-${mm}`;
    case "short":
    default:
      return `${MONTHS[month - 1]} ${year}`;
  }
}

/** Format a start/end pair as "Mar 2021 – Present" / "Mar 2021 – May 2024". */
export function formatDateRange(
  startDate: string,
  endDate: string,
  format: DateFormat = "short",
): string {
  const start = formatMonthYear(startDate, format);
  const end = formatMonthYear(endDate, format);
  if (start && !endDate) return `${start} – Present`;
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

/** "Austin, TX" — appends country only when there's no region. */
export function formatLocation(loc: Location): string {
  const parts = [loc.city, loc.region].filter(Boolean);
  if (!loc.region && loc.countryCode) parts.push(loc.countryCode);
  return parts.join(", ");
}

/** Split a textarea value into trimmed, non-empty lines (one bullet per line). */
export function linesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Split a comma-separated value into trimmed, non-empty items. */
export function commaToList(value: string): string[] {
  return value
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
}
