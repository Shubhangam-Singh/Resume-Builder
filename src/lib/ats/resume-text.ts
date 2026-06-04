import type { ResumeData } from "@/lib/resume/types";

/**
 * Flatten a ResumeData into a single plain-text blob for keyword matching.
 * Includes everything a job-description scan should see: headline, summary,
 * every bullet, skills, project tech, etc.
 */
export function resumeToPlainText(resume: ResumeData): string {
  const parts: string[] = [];
  const { basics, work, education, projects, skills, certificates } = resume;

  parts.push(basics.name, basics.label, basics.summary);

  for (const w of work) {
    parts.push(w.position, w.name, w.summary, ...w.highlights);
  }
  for (const e of education) {
    parts.push(e.institution, e.studyType, e.area, ...e.courses);
  }
  for (const p of projects) {
    parts.push(p.name, p.description, ...p.highlights, ...p.keywords);
  }
  for (const s of skills) {
    parts.push(s.name, ...s.keywords);
  }
  for (const c of certificates) {
    parts.push(c.name, c.issuer);
  }

  return parts.filter(Boolean).join("\n");
}
