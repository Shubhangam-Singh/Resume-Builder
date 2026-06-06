import type { ResumeData } from "./types";

/**
 * Resume completeness: a weighted checklist of the fields recruiters expect,
 * yielding a 0–100 score plus actionable suggestions for what's still missing.
 * Pure and cheap, so it can run on every keystroke.
 */

export interface CompletenessItem {
  label: string;
  done: boolean;
  weight: number;
}

export interface CompletenessResult {
  score: number; // 0–100
  done: number;
  total: number;
  items: CompletenessItem[];
  suggestions: string[]; // labels of unmet items, most important first
}

export function computeCompleteness(resume: ResumeData): CompletenessResult {
  const { basics, work, education, skills, projects } = resume;

  const hasOnlinePresence =
    !!basics.url || basics.profiles.some((p) => p.url || p.username);
  const workWithBullets = work.filter((w) => w.highlights.length > 0);
  const workWithDates = work.filter((w) => w.startDate);

  const items: CompletenessItem[] = [
    { label: "Add your name", done: !!basics.name.trim(), weight: 2 },
    {
      label: "Add a professional headline (e.g. “Frontend Engineer”)",
      done: !!basics.label.trim(),
      weight: 1,
    },
    { label: "Add an email address", done: !!basics.email.trim(), weight: 2 },
    { label: "Add a phone number", done: !!basics.phone.trim(), weight: 1 },
    {
      label: "Add your location",
      done: !!(basics.location.city || basics.location.region),
      weight: 1,
    },
    {
      label: "Add a LinkedIn, GitHub, or portfolio link",
      done: hasOnlinePresence,
      weight: 1,
    },
    {
      label: "Write a professional summary",
      done: basics.summary.trim().length >= 40,
      weight: 1,
    },
    { label: "Add at least one work experience", done: work.length > 0, weight: 2 },
    {
      label: "Add bullet points to every experience",
      done: work.length > 0 && workWithBullets.length === work.length,
      weight: 2,
    },
    {
      label: "Add start dates to your experience",
      done: work.length > 0 && workWithDates.length === work.length,
      weight: 1,
    },
    { label: "Add your education", done: education.length > 0, weight: 1 },
    {
      label: "List your skills",
      done: skills.some((s) => s.keywords.length > 0),
      weight: 2,
    },
    {
      label: "Showcase a project (optional but recommended)",
      done: projects.length > 0,
      weight: 1,
    },
  ];

  const total = items.reduce((n, it) => n + it.weight, 0);
  const done = items.reduce((n, it) => n + (it.done ? it.weight : 0), 0);
  const score = total ? Math.round((done / total) * 100) : 0;
  const suggestions = items
    .filter((it) => !it.done)
    .sort((a, b) => b.weight - a.weight)
    .map((it) => it.label);

  return { score, done, total, items, suggestions };
}
