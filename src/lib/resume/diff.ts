import { formatLocation } from "./format";
import type { ResumeData } from "./types";

/**
 * A human-readable, high-level diff between two resume versions — field changes
 * in Basics, and per-section counts of added / removed / edited entries. Used by
 * version history so users can see what changed before restoring.
 */

export interface DiffLine {
  label: string;
  detail: string;
  kind: "changed" | "added" | "removed";
}

function omitId<T extends { id?: string }>(o: T): Omit<T, "id"> {
  const c = { ...o };
  delete (c as { id?: string }).id;
  return c;
}

function short(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > 40 ? `${t.slice(0, 40)}…` : t || "(empty)";
}

function arrayDiff(
  label: string,
  prev: { id: string }[],
  next: { id: string }[],
): DiffLine[] {
  if (prev.length !== next.length) {
    return [
      {
        label,
        kind: next.length > prev.length ? "added" : "removed",
        detail: `${prev.length} → ${next.length} ${
          next.length === 1 ? "entry" : "entries"
        }`,
      },
    ];
  }
  let edited = 0;
  for (let i = 0; i < prev.length; i++) {
    if (JSON.stringify(omitId(prev[i])) !== JSON.stringify(omitId(next[i]))) {
      edited++;
    }
  }
  return edited > 0
    ? [{ label, kind: "changed", detail: `${edited} ${edited === 1 ? "entry" : "entries"} edited` }]
    : [];
}

/** `prev` is the older version (e.g. a snapshot); `next` is the current resume. */
export function diffResumes(prev: ResumeData, next: ResumeData): DiffLine[] {
  const lines: DiffLine[] = [];

  const basicsFields: [string, keyof ResumeData["basics"]][] = [
    ["Name", "name"],
    ["Headline", "label"],
    ["Email", "email"],
    ["Phone", "phone"],
    ["Website", "url"],
    ["Summary", "summary"],
  ];
  for (const [label, field] of basicsFields) {
    const a = String(prev.basics[field] ?? "");
    const b = String(next.basics[field] ?? "");
    if (a !== b) {
      lines.push({ label, kind: "changed", detail: `“${short(a)}” → “${short(b)}”` });
    }
  }
  if (formatLocation(prev.basics.location) !== formatLocation(next.basics.location)) {
    lines.push({
      label: "Location",
      kind: "changed",
      detail: `“${short(formatLocation(prev.basics.location))}” → “${short(
        formatLocation(next.basics.location),
      )}”`,
    });
  }

  lines.push(...arrayDiff("Experience", prev.work, next.work));
  lines.push(...arrayDiff("Education", prev.education, next.education));
  lines.push(...arrayDiff("Projects", prev.projects, next.projects));
  lines.push(...arrayDiff("Skills", prev.skills, next.skills));
  lines.push(...arrayDiff("Certifications", prev.certificates, next.certificates));
  lines.push(
    ...arrayDiff(
      "Custom sections",
      prev.customSections ?? [],
      next.customSections ?? [],
    ),
  );

  if (prev.meta.template !== next.meta.template) {
    lines.push({
      label: "Template",
      kind: "changed",
      detail: `${prev.meta.template} → ${next.meta.template}`,
    });
  }

  return lines;
}
