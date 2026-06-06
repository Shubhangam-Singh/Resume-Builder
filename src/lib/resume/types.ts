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
  /** Optional profile photo as a data URL. Used by photo templates only. */
  image?: string;
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

/** Sections that can be toggled off (Basics is always shown). */
export type HideableSection =
  | "summary"
  | "work"
  | "education"
  | "skills"
  | "projects"
  | "certificates";

/**
 * A section key as stored in `sectionOrder` / `hiddenSections`. Built-in
 * sections use their `HideableSection` name; user-defined sections use the
 * form `custom:<id>` so they can be ordered and hidden alongside the rest.
 */
export type SectionKey = HideableSection | string;

/** One entry inside a user-defined custom section (e.g. an award, a talk). */
export interface CustomItem {
  id: string;
  name: string; // title, e.g. "Best Paper Award"
  description: string; // subtitle / organization / short note
  date: string; // "YYYY-MM" or free text
  url: string;
  highlights: string[];
}

/** A user-defined section (e.g. "Publications", "Volunteering", "Awards"). */
export interface CustomSection {
  id: string;
  title: string;
  items: CustomItem[];
}

/** How dates render across templates. */
export type DateFormat = "short" | "long" | "numeric" | "iso" | "year";

export interface ResumeMeta {
  template: string;
  lastModified: string;
  /** Sections hidden from the rendered PDF. Absent = nothing hidden. */
  hiddenSections?: SectionKey[];
  /** Order body sections render in. Absent / partial = default order. */
  sectionOrder?: SectionKey[];
  /** Accent color id (see theme.ts ACCENTS). Absent = template default. */
  themeColor?: string;
  /** Layout density preset. Absent = "standard". Quick-sets the spacing below. */
  density?: "compact" | "standard" | "loose";
  /** Font family id (see theme.ts FONTS). Absent = "helvetica". */
  fontFamily?: string;
  /** Fine-grained formatting multipliers (override the density preset). */
  fontScale?: number;
  lineSpacing?: number;
  sectionSpacing?: number;
  paragraphSpacing?: number;
  /** How dates render. Absent = "short" ("Mar 2021"). */
  dateFormat?: DateFormat;
}

export interface ResumeData {
  basics: Basics;
  work: WorkEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  skills: SkillEntry[];
  certificates: CertificateEntry[];
  /** User-defined sections. Absent on documents created before this feature. */
  customSections?: CustomSection[];
  meta: ResumeMeta;
}

/** Keys of the array-shaped sections, used by generic store CRUD. */
export type ArraySectionKey =
  | "work"
  | "education"
  | "projects"
  | "skills"
  | "certificates";
