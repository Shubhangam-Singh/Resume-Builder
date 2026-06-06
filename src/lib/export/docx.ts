import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import {
  formatDateRange,
  formatLocation,
  formatMonthYear,
} from "@/lib/resume/format";
import { customIdFromKey, resolveSectionOrder } from "@/lib/resume/sections";
import type { CustomSection, ResumeData } from "@/lib/resume/types";

/**
 * Build a real .docx (Word) file from the resume — single column, standard
 * headings, real text and native bullet lists, so it stays ATS-friendly while
 * being the editable Word format many job portals require. Honors section
 * order, hidden sections, and the chosen date format.
 *
 * This pulls in the (sizable) `docx` library, so it's only ever imported
 * dynamically from the download handler.
 */

const ACCENT = "1F2937";
const MUTED = "444444";

function heading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        color: ACCENT,
        size: 22, // 11pt
        characterSpacing: 20,
      }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 20 })],
  });
}

function titleLine(title: string, subtitle?: string): Paragraph {
  const runs = [new TextRun({ text: title, bold: true, size: 21 })];
  if (subtitle) runs.push(new TextRun({ text: ` — ${subtitle}`, size: 20, color: MUTED }));
  return new Paragraph({ spacing: { before: 120, after: 10 }, children: runs });
}

function metaLine(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 20 },
    children: [new TextRun({ text, size: 18, color: MUTED, italics: true })],
  });
}

function bodyLine(text: string): Paragraph {
  return new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text, size: 20 })] });
}

export function buildResumeDocxBlob(resume: ResumeData): Promise<Blob> {
  const { basics, work, education, projects, skills, certificates } = resume;
  const fmt = resume.meta.dateFormat;
  const hidden = new Set(resume.meta.hiddenSections ?? []);
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
      children: [
        new TextRun({ text: basics.name || "Your Name", bold: true, size: 40 }),
      ],
    }),
  );
  if (basics.label) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [new TextRun({ text: basics.label, size: 22, color: MUTED })],
      }),
    );
  }
  const contact = [
    basics.email,
    basics.phone,
    formatLocation(basics.location),
    basics.url,
    ...basics.profiles.map((p) =>
      p.username || p.url ? `${p.network}: ${p.username || p.url}` : "",
    ),
  ]
    .filter(Boolean)
    .join("  |  ");
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: contact, size: 18, color: MUTED })],
      }),
    );
  }

  const renderBuiltin = (key: string) => {
    switch (key) {
      case "summary":
        if (!hidden.has("summary") && basics.summary) {
          children.push(heading("Summary"), bodyLine(basics.summary));
        }
        break;
      case "work":
        if (!hidden.has("work") && work.some((w) => w.name || w.position)) {
          children.push(heading("Experience"));
          for (const w of work) {
            children.push(titleLine(w.position || w.name, w.position ? w.name : undefined));
            const meta = [formatDateRange(w.startDate, w.endDate, fmt), w.location]
              .filter(Boolean)
              .join("  ·  ");
            if (meta) children.push(metaLine(meta));
            if (w.summary) children.push(bodyLine(w.summary));
            for (const h of w.highlights) children.push(bullet(h));
          }
        }
        break;
      case "education":
        if (
          !hidden.has("education") &&
          education.some((e) => e.institution || e.studyType)
        ) {
          children.push(heading("Education"));
          for (const e of education) {
            const degree = [e.studyType, e.area].filter(Boolean).join(", ");
            children.push(titleLine(e.institution, degree || undefined));
            const meta = [formatDateRange(e.startDate, e.endDate, fmt), e.score]
              .filter(Boolean)
              .join("  ·  ");
            if (meta) children.push(metaLine(meta));
            if (e.courses.length)
              children.push(bodyLine(`Relevant coursework: ${e.courses.join(", ")}`));
          }
        }
        break;
      case "projects":
        if (!hidden.has("projects") && projects.some((p) => p.name || p.description)) {
          children.push(heading("Projects"));
          for (const p of projects) {
            children.push(titleLine(p.name, p.keywords.join(", ") || undefined));
            if (p.description) children.push(bodyLine(p.description));
            for (const h of p.highlights) children.push(bullet(h));
          }
        }
        break;
      case "skills":
        if (!hidden.has("skills") && skills.some((s) => s.keywords.length || s.name)) {
          children.push(heading("Skills"));
          for (const s of skills) {
            const para = new Paragraph({
              spacing: { after: 30 },
              children: s.name
                ? [
                    new TextRun({ text: `${s.name}: `, bold: true, size: 20 }),
                    new TextRun({ text: s.keywords.join(", "), size: 20 }),
                  ]
                : [new TextRun({ text: s.keywords.join(", "), size: 20 })],
            });
            children.push(para);
          }
        }
        break;
      case "certificates":
        if (!hidden.has("certificates") && certificates.some((c) => c.name)) {
          children.push(heading("Certifications"));
          for (const c of certificates) {
            const meta = [c.issuer, formatMonthYear(c.date, fmt)]
              .filter(Boolean)
              .join("  ·  ");
            children.push(
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new TextRun({ text: c.name, bold: true, size: 20 }),
                  ...(meta ? [new TextRun({ text: `  ${meta}`, size: 18, color: MUTED })] : []),
                ],
              }),
            );
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
    children.push(heading(section.title || "Section"));
    for (const it of items) {
      if (it.name || it.date) {
        children.push(titleLine(it.name || "", undefined));
        const date = formatMonthYear(it.date, fmt);
        if (date) children.push(metaLine(date));
      }
      if (it.description) children.push(bodyLine(it.description));
      for (const h of it.highlights) children.push(bullet(h));
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

  const doc = new Document({
    creator: "ResumeForge",
    title: basics.name ? `${basics.name} — Resume` : "Resume",
    styles: {
      default: { document: { run: { font: "Calibri" } } },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

function fileBase(name: string): string {
  return (
    (name || "resume")
      .trim()
      .replace(/[^\w-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "resume"
  );
}

export async function downloadResumeDocx(resume: ResumeData): Promise<void> {
  const blob = await buildResumeDocxBlob(resume);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBase(resume.basics.name)}_Resume.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
