import { formatLocation } from "@/lib/resume/format";
import type { Basics, ResumeData } from "@/lib/resume/types";

/** One piece of contact info, optionally linkable. */
export interface ContactItem {
  text: string;
  href?: string;
}

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, "");

/**
 * Build the list of contact items (email, phone, location, site, profiles) once,
 * so each template can render them in its own style without duplicating the
 * conditional logic.
 */
export function contactItems(basics: Basics): ContactItem[] {
  const items: ContactItem[] = [];
  if (basics.email)
    items.push({ text: basics.email, href: `mailto:${basics.email}` });
  if (basics.phone) items.push({ text: basics.phone });
  const loc = formatLocation(basics.location);
  if (loc) items.push({ text: loc });
  if (basics.url)
    items.push({ text: stripProtocol(basics.url), href: basics.url });
  for (const p of basics.profiles) {
    const handle = p.username || (p.url ? stripProtocol(p.url) : "");
    const text = handle ? `${p.network}: ${handle}` : p.network;
    if (text) items.push({ text, href: p.url || undefined });
  }
  return items;
}

/** Which sections actually have content worth rendering. */
export function sectionPresence(data: ResumeData) {
  return {
    summary: !!data.basics.summary,
    work: data.work.some((w) => w.name || w.position || w.highlights.length),
    education: data.education.some((e) => e.institution || e.studyType),
    projects: data.projects.some((p) => p.name || p.description),
    skills: data.skills.some((s) => s.keywords.length || s.name),
    certificates: data.certificates.some((c) => c.name),
  };
}

/** Combine degree + field of study, e.g. "B.S., Computer Science". */
export function degreeLine(studyType: string, area: string): string {
  return [studyType, area].filter(Boolean).join(", ");
}
