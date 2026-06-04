import type { Location } from "./types";

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

/** "2021-03" -> "Mar 2021"; "2021" -> "2021"; "" -> "". Unparseable -> as-is. */
export function formatMonthYear(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  const match = /^(\d{4})(?:-(\d{1,2}))?/.exec(trimmed);
  if (!match) return trimmed;
  const year = match[1];
  const month = match[2] ? parseInt(match[2], 10) : undefined;
  if (month && month >= 1 && month <= 12) {
    return `${MONTHS[month - 1]} ${year}`;
  }
  return year;
}

/** Format a start/end pair as "Mar 2021 – Present" / "Mar 2021 – May 2024". */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = formatMonthYear(startDate);
  const end = formatMonthYear(endDate);
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
