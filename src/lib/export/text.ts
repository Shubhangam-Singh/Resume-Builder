import {
  formatDateRange,
  formatLocation,
  formatMonthYear,
} from "@/lib/resume/format";
import { customIdFromKey, resolveSectionOrder } from "@/lib/resume/sections";
import type { CustomSection, ResumeData } from "@/lib/resume/types";

/**
 * Render the resume as clean, ATS-friendly plain text — ideal for pasting into
 * the plain-text boxes many job portals use. Honors the chosen section order,
 * hidden sections, and date format. No markup, just headings + dashes.
 */

function joinMeta(parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" | ");
}

export function resumeToFormattedText(resume: ResumeData): string {
  const { basics, work, education, projects, skills, certificates } = resume;
  const fmt = resume.meta.dateFormat;
  const hidden = new Set(resume.meta.hiddenSections ?? []);
  const out: string[] = [];

  // Header
  if (basics.name) out.push(basics.name.toUpperCase());
  if (basics.label) out.push(basics.label);
  const contact = joinMeta([
    basics.email,
    basics.phone,
    formatLocation(basics.location),
    basics.url,
    ...basics.profiles.map((p) =>
      p.username || p.url ? `${p.network}: ${p.username || p.url}` : "",
    ),
  ]);
  if (contact) out.push(contact);

  const heading = (title: string) => {
    out.push("", title.toUpperCase());
  };

  const renderBuiltin = (key: string) => {
    switch (key) {
      case "summary":
        if (!hidden.has("summary") && basics.summary) {
          heading("Summary");
          out.push(basics.summary);
        }
        break;
      case "work":
        if (!hidden.has("work") && work.some((w) => w.name || w.position)) {
          heading("Experience");
          for (const w of work) {
            const title = [w.position, w.name].filter(Boolean).join(" — ");
            if (title) out.push("", title);
            const meta = joinMeta([
              formatDateRange(w.startDate, w.endDate, fmt),
              w.location,
            ]);
            if (meta) out.push(meta);
            if (w.summary) out.push(w.summary);
            for (const h of w.highlights) out.push(`- ${h}`);
          }
        }
        break;
      case "education":
        if (
          !hidden.has("education") &&
          education.some((e) => e.institution || e.studyType)
        ) {
          heading("Education");
          for (const e of education) {
            if (e.institution) out.push("", e.institution);
            const degree = [e.studyType, e.area].filter(Boolean).join(", ");
            const meta = joinMeta([
              degree,
              formatDateRange(e.startDate, e.endDate, fmt),
              e.score,
            ]);
            if (meta) out.push(meta);
            if (e.courses.length)
              out.push(`Relevant coursework: ${e.courses.join(", ")}`);
          }
        }
        break;
      case "projects":
        if (
          !hidden.has("projects") &&
          projects.some((p) => p.name || p.description)
        ) {
          heading("Projects");
          for (const p of projects) {
            const title = joinMeta([p.name, p.url]);
            if (title) out.push("", title);
            if (p.keywords.length) out.push(p.keywords.join(", "));
            if (p.description) out.push(p.description);
            for (const h of p.highlights) out.push(`- ${h}`);
          }
        }
        break;
      case "skills":
        if (!hidden.has("skills") && skills.some((s) => s.keywords.length || s.name)) {
          heading("Skills");
          for (const s of skills) {
            const line = s.name
              ? `${s.name}: ${s.keywords.join(", ")}`
              : s.keywords.join(", ");
            if (line) out.push(line);
          }
        }
        break;
      case "certificates":
        if (!hidden.has("certificates") && certificates.some((c) => c.name)) {
          heading("Certifications");
          for (const c of certificates) {
            const line = joinMeta([
              c.name,
              c.issuer,
              formatMonthYear(c.date, fmt),
            ]);
            if (line) out.push(line);
          }
        }
        break;
    }
  };

  const renderCustom = (section: CustomSection) => {
    const items = section.items.filter(
      (it) => it.name || it.description || it.highlights.length,
    );
    if (!section.title.trim() && items.length === 0) return;
    heading(section.title || "Section");
    for (const it of items) {
      const title = joinMeta([it.name, formatMonthYear(it.date, fmt)]);
      if (title) out.push("", title);
      if (it.description) out.push(it.description);
      for (const h of it.highlights) out.push(`- ${h}`);
    }
  };

  for (const key of resolveSectionOrder(resume.meta, resume.customSections ?? [])) {
    const id = customIdFromKey(key);
    if (id) {
      if (hidden.has(key)) continue;
      const cs = (resume.customSections ?? []).find((s) => s.id === id);
      if (cs) renderCustom(cs);
    } else {
      renderBuiltin(key);
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function fileBase(name: string): string {
  return (
    (name || "resume")
      .trim()
      .replace(/[^\w-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "resume"
  );
}

/** Trigger a .txt download of the plain-text resume. */
export function downloadResumeText(resume: ResumeData): void {
  const blob = new Blob([resumeToFormattedText(resume)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBase(resume.basics.name)}_Resume.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
