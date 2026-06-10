import { formatLocation } from "@/lib/resume/format";
import type { Basics, ResumeData, AgencyBranding } from "@/lib/resume/types";

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
export function contactItems(basics: Basics, agencyBranding?: AgencyBranding): ContactItem[] {
  if (agencyBranding?.enabled) {
    return [];
  }

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

export function agencyContactLine(branding?: AgencyBranding): string {
  if (!branding?.enabled) return "";
  const parts = [];
  if (branding.hrEmail) parts.push(branding.hrEmail);
  if (branding.hrPhone) parts.push(branding.hrPhone);
  if (parts.length === 0) return "";
  return "Sourced via: " + parts.join("  |  ");
}

/**
 * Which sections should render: they need content AND must not be toggled off
 * via `meta.hiddenSections`. All templates use this, so visibility is honored
 * everywhere.
 */
export function sectionPresence(data: ResumeData) {
  const hidden = new Set(data.meta.hiddenSections ?? []);
  return {
    summary: !hidden.has("summary") && !!data.basics.summary,
    work:
      !hidden.has("work") &&
      data.work.some((w) => w.name || w.position || w.highlights.length),
    education:
      !hidden.has("education") &&
      data.education.some((e) => e.institution || e.studyType),
    projects:
      !hidden.has("projects") &&
      data.projects.some((p) => p.name || p.description),
    skills:
      !hidden.has("skills") &&
      data.skills.some((s) => s.keywords.length || s.name),
    certificates:
      !hidden.has("certificates") &&
      data.certificates.some((c) => c.name),
  };
}

/** Combine degree + field of study, e.g. "B.S., Computer Science". */
export function degreeLine(studyType: string, area: string): string {
  return [studyType, area].filter(Boolean).join(", ");
}
