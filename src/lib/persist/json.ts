import { emptyResume, uid } from "@/lib/resume/factory";
import type { HideableSection, ResumeData } from "@/lib/resume/types";

/**
 * Export / import the résumé as JSON. Internal `id` fields are stripped on
 * export for cleaner, JSON Resume-friendly output, and regenerated on import.
 * Import is tolerant: it coerces our own export *or* a standard JSON Resume file
 * (or a partial one) into a valid ResumeData, filling missing fields.
 */

function omitId<T extends { id: string }>(item: T): Omit<T, "id"> {
  const copy = { ...item };
  delete (copy as { id?: string }).id;
  return copy;
}

export function serializeResume(resume: ResumeData): unknown {
  return {
    basics: {
      ...resume.basics,
      profiles: resume.basics.profiles.map(omitId),
    },
    work: resume.work.map(omitId),
    education: resume.education.map(omitId),
    projects: resume.projects.map(omitId),
    skills: resume.skills.map(omitId),
    certificates: resume.certificates.map(omitId),
    meta: resume.meta,
  };
}

function makeJsonName(name: string): string {
  const base = (name || "resume")
    .trim()
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "resume"}.json`;
}

export function downloadResumeJson(resume: ResumeData): void {
  const json = JSON.stringify(serializeResume(resume), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = makeJsonName(resume.basics.name);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- import / coercion ---------------------------------------------------

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => list(v).map(str).filter(Boolean);

const HIDEABLE: HideableSection[] = [
  "summary",
  "work",
  "education",
  "skills",
  "projects",
  "certificates",
];

function coerceResume(raw: unknown): ResumeData {
  const root = obj(raw);
  const out = emptyResume();
  const b = obj(root.basics);
  const loc = obj(b.location);

  out.basics = {
    name: str(b.name),
    label: str(b.label),
    email: str(b.email),
    phone: str(b.phone),
    url: str(b.url) || str(b.website),
    location: {
      city: str(loc.city),
      region: str(loc.region),
      countryCode: str(loc.countryCode),
    },
    summary: str(b.summary),
    profiles: list(b.profiles).map((p) => {
      const o = obj(p);
      return {
        id: uid(),
        network: str(o.network),
        username: str(o.username),
        url: str(o.url),
      };
    }),
  };

  out.work = list(root.work).map((w) => {
    const o = obj(w);
    return {
      id: uid(),
      name: str(o.name) || str(o.company),
      position: str(o.position),
      location: str(o.location),
      url: str(o.url),
      startDate: str(o.startDate),
      endDate: str(o.endDate),
      summary: str(o.summary),
      highlights: strList(o.highlights),
    };
  });

  out.education = list(root.education).map((e) => {
    const o = obj(e);
    return {
      id: uid(),
      institution: str(o.institution),
      area: str(o.area),
      studyType: str(o.studyType),
      startDate: str(o.startDate),
      endDate: str(o.endDate),
      score: str(o.score) || str(o.gpa),
      courses: strList(o.courses),
    };
  });

  out.projects = list(root.projects).map((p) => {
    const o = obj(p);
    return {
      id: uid(),
      name: str(o.name),
      description: str(o.description),
      highlights: strList(o.highlights),
      url: str(o.url),
      keywords: strList(o.keywords),
    };
  });

  out.skills = list(root.skills).map((s) => {
    const o = obj(s);
    return { id: uid(), name: str(o.name), keywords: strList(o.keywords) };
  });

  out.certificates = list(root.certificates ?? root.certifications).map((c) => {
    const o = obj(c);
    return {
      id: uid(),
      name: str(o.name),
      issuer: str(o.issuer),
      date: str(o.date),
      url: str(o.url),
    };
  });

  const meta = obj(root.meta);
  out.meta = {
    template: str(meta.template) || out.meta.template,
    lastModified: new Date().toISOString(),
    hiddenSections: strList(meta.hiddenSections).filter((s): s is HideableSection =>
      (HIDEABLE as string[]).includes(s),
    ),
  };

  return out;
}

/** Parse a JSON string into a ResumeData (throws on invalid JSON). */
export function parseResumeJson(text: string): ResumeData {
  return coerceResume(JSON.parse(text));
}
