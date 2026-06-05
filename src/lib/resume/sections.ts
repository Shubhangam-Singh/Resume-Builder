import type { HideableSection, ResumeMeta } from "./types";

/** Default order body sections render in (matches the ATS Classic layout). */
export const DEFAULT_SECTION_ORDER: HideableSection[] = [
  "summary",
  "work",
  "education",
  "projects",
  "skills",
  "certificates",
];

/**
 * Resolve the effective section order: any saved order first (de-duped and
 * validated), with any sections it omits appended in the default order. Always
 * returns all six keys exactly once, so it's safe for both rendering and
 * reordering.
 */
export function resolveSectionOrder(meta: ResumeMeta): HideableSection[] {
  const valid = new Set<HideableSection>(DEFAULT_SECTION_ORDER);
  const seen = new Set<HideableSection>();
  const given: HideableSection[] = [];
  for (const s of meta.sectionOrder ?? []) {
    if (valid.has(s) && !seen.has(s)) {
      seen.add(s);
      given.push(s);
    }
  }
  const missing = DEFAULT_SECTION_ORDER.filter((s) => !seen.has(s));
  return [...given, ...missing];
}
