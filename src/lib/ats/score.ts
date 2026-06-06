import type { ResumeData } from "@/lib/resume/types";

/**
 * A section-by-section ATS readiness score (0–100 each) rolled up into a
 * weighted overall score, with a short reason per section. Pure — complements
 * the round-trip check in check.ts (which proves the PDF is machine-readable).
 */

export interface SectionScore {
  key: string;
  label: string;
  score: number; // 0–100
  weight: number;
  detail: string;
}

export interface ScoreResult {
  overall: number; // 0–100
  sections: SectionScore[];
}

const LONG_BULLET = 240;
const hasNumber = (s: string) => /\d/.test(s);

export function scoreResume(
  resume: ResumeData,
  templateAtsSafe: boolean,
): ScoreResult {
  const { basics, work, education, skills } = resume;

  // Contact
  let contact = 0;
  if (basics.email) contact += 40;
  if (basics.phone) contact += 20;
  if (basics.location.city || basics.location.region) contact += 20;
  if (basics.url || basics.profiles.some((p) => p.url || p.username))
    contact += 20;

  // Summary
  const summaryLen = basics.summary.trim().length;
  const summary = summaryLen >= 40 ? 100 : summaryLen > 0 ? 55 : 0;

  // Experience
  let experience = 0;
  if (work.length > 0) {
    experience += 40;
    const allBulleted = work.every((w) => w.highlights.length > 0);
    if (allBulleted) experience += 30;
    const bullets = work.flatMap((w) => w.highlights);
    const quantified = bullets.filter(hasNumber).length;
    if (bullets.length > 0) {
      experience += Math.round(30 * Math.min(1, quantified / bullets.length / 0.5));
    }
  }
  experience = Math.min(100, experience);

  // Education
  const educationScore = education.some((e) => e.institution || e.studyType)
    ? 100
    : 0;

  // Skills
  const skillCount = skills.reduce((n, s) => n + s.keywords.length, 0);
  const skillsScore =
    skillCount >= 8 ? 100 : skillCount >= 4 ? 70 : skillCount >= 1 ? 40 : 0;

  // Formatting
  let formatting = 0;
  if (templateAtsSafe) formatting += 50;
  const allBullets = [...work.flatMap((w) => w.highlights)];
  const longBullets = allBullets.filter((h) => h.length > LONG_BULLET).length;
  if (longBullets === 0) formatting += 25;
  const datesOk = work.length === 0 || work.every((w) => w.startDate);
  if (datesOk) formatting += 25;

  const sections: SectionScore[] = [
    {
      key: "contact",
      label: "Contact info",
      score: contact,
      weight: 0.2,
      detail:
        contact === 100
          ? "Email, phone, location, and a link — all present."
          : "Add any missing email, phone, location, or profile link.",
    },
    {
      key: "summary",
      label: "Summary",
      score: summary,
      weight: 0.1,
      detail:
        summary === 100
          ? "A solid professional summary is present."
          : summary > 0
            ? "Your summary is quite short — aim for 2–3 sentences."
            : "Add a short professional summary up top.",
    },
    {
      key: "experience",
      label: "Experience",
      score: experience,
      weight: 0.3,
      detail:
        experience >= 90
          ? "Bulleted, quantified experience — great."
          : work.length === 0
            ? "Add your work experience with bullet points."
            : "Add bullets to every role and quantify your impact (numbers, %, $).",
    },
    {
      key: "education",
      label: "Education",
      score: educationScore,
      weight: 0.1,
      detail: educationScore ? "Education is listed." : "Add your education.",
    },
    {
      key: "skills",
      label: "Skills",
      score: skillsScore,
      weight: 0.15,
      detail:
        skillsScore === 100
          ? "A strong list of skills/keywords."
          : "List more relevant skills — ATS match on these keywords.",
    },
    {
      key: "formatting",
      label: "Formatting",
      score: formatting,
      weight: 0.15,
      detail:
        formatting === 100
          ? "ATS-safe layout, clean bullets, dated roles."
          : !templateAtsSafe
            ? "This template is multi-column — switch to an ATS-safe one for online applications."
            : longBullets > 0
              ? "Some bullets are very long — tighten them up."
              : "Add start dates to your roles.",
    },
  ];

  const overall = Math.round(
    sections.reduce((n, s) => n + s.score * s.weight, 0),
  );

  return { overall, sections };
}
