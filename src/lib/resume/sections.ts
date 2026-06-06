import type {
  CustomSection,
  HideableSection,
  ResumeMeta,
  SectionKey,
} from "./types";

/** Default order body sections render in (matches the ATS Classic layout). */
export const DEFAULT_SECTION_ORDER: HideableSection[] = [
  "summary",
  "work",
  "education",
  "projects",
  "skills",
  "certificates",
];

/** The section key for a custom section, e.g. `custom:abc123`. */
export function customKey(id: string): string {
  return `custom:${id}`;
}

/** Extract the custom-section id from a `custom:<id>` key, else null. */
export function customIdFromKey(key: string): string | null {
  return key.startsWith("custom:") ? key.slice("custom:".length) : null;
}

/**
 * Resolve the effective section order: any saved order first (de-duped and
 * validated against the built-in keys plus the live custom sections), with any
 * keys it omits appended — built-ins in the default order, then any remaining
 * custom sections in their stored order. Always returns every valid key exactly
 * once, so it's safe for both rendering and reordering.
 */
export function resolveSectionOrder(
  meta: ResumeMeta,
  customSections: CustomSection[] = [],
): SectionKey[] {
  const customKeys = customSections.map((s) => customKey(s.id));
  const valid = new Set<SectionKey>([...DEFAULT_SECTION_ORDER, ...customKeys]);
  const seen = new Set<SectionKey>();
  const given: SectionKey[] = [];
  for (const s of meta.sectionOrder ?? []) {
    if (valid.has(s) && !seen.has(s)) {
      seen.add(s);
      given.push(s);
    }
  }
  const missing = [...DEFAULT_SECTION_ORDER, ...customKeys].filter(
    (s) => !seen.has(s),
  );
  return [...given, ...missing];
}
