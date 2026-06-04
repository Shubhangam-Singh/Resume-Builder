/**
 * Canonical resume data model — the single source of truth.
 *
 * Based on the JSON Resume schema (https://jsonresume.org/schema/) so the
 * exported `.json` is interoperable with the wider ecosystem. The form edits
 * this, every template reads this, and (from Phase 2) the importer fills this.
 *
 * Array entries carry a non-schema `id` purely for stable React keys and
 * drag-to-reorder. It is stripped on JSON Resume export (Phase 5).
 */

export interface Location {
  city: string;
  region: string;
  countryCode: string;
}

export interface Profile {
  id: string;
  network: string; // e.g. "GitHub", "LinkedIn"
  username: string;
  url: string;
}

export interface Basics {
  name: string;
  label: string; // e.g. "Full-Stack Developer"
  email: string;
  phone: string;
  url: string;
  location: Location;
  profiles: Profile[];
  summary: string;
}

export interface WorkEntry {
  id: string;
  name: string; // company
  position: string;
  location: string;
  url: string;
  startDate: string; // "YYYY-MM"
  endDate: string; // "YYYY-MM" or "" = present
  summary: string;
  highlights: string[]; // bullet points
}

export interface EducationEntry {
  id: string;
  institution: string;
  area: string; // field of study
  studyType: string; // degree, e.g. "B.Tech"
  startDate: string;
  endDate: string;
  score: string; // GPA / percentage
  courses: string[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  highlights: string[];
  url: string;
  keywords: string[];
}

export interface SkillEntry {
  id: string;
  name: string; // category, e.g. "Languages"
  keywords: string[]; // e.g. ["Python", "JavaScript"]
}

export interface CertificateEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface ResumeMeta {
  template: string;
  lastModified: string;
}

export interface ResumeData {
  basics: Basics;
  work: WorkEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  certificates: CertificateEntry[];
  meta: ResumeMeta;
}

/** Keys of the array-shaped sections, used by generic store CRUD. */
export type ArraySectionKey =
  | "work"
  | "education"
  | "projects"
  | "skills"
  | "certificates";
