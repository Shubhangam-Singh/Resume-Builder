import type { ParseResult } from "@/lib/parser";
import type { ResumeData } from "@/lib/resume/types";

/**
 * ATS self-check helpers (pure). The heavy part — generating the PDF and
 * re-extracting its text — happens in the client component; these functions
 * compare the round-tripped parse against the original and flag structural
 * ATS issues.
 */

export interface FieldCheck {
  field: string;
  expected: boolean; // the user actually provided this
  recovered: boolean; // the parser recovered it from the generated PDF
}

const tokenize = (s: string) =>
  s.toLowerCase().split(/\s+/).filter((t) => t.length > 1);

function shareToken(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bt = new Set(tokenize(b));
  return tokenize(a).some((t) => bt.has(t));
}

const digits = (s: string) => s.replace(/\D/g, "");

function phoneMatches(original: string, recovered: string): boolean {
  const o = digits(original);
  const g = digits(recovered);
  if (o.length < 7 || !g) return false;
  return g.includes(o.slice(-7));
}

/** Compare what the user entered against what the parser recovered from the PDF. */
export function compareRoundTrip(
  resume: ResumeData,
  parsed: ParseResult,
): FieldCheck[] {
  const b = resume.basics;
  const p = parsed.data.basics;
  return [
    {
      field: "Name",
      expected: !!b.name,
      recovered: !!b.name && shareToken(b.name, p.name),
    },
    {
      field: "Email",
      expected: !!b.email,
      recovered: !!b.email && p.email.toLowerCase() === b.email.toLowerCase(),
    },
    {
      field: "Phone",
      expected: !!b.phone,
      recovered: !!b.phone && phoneMatches(b.phone, p.phone),
    },
    {
      field: "Experience",
      expected: resume.work.length > 0,
      recovered: parsed.found.work > 0,
    },
    {
      field: "Education",
      expected: resume.education.length > 0,
      recovered: parsed.found.education > 0,
    },
    {
      field: "Skills",
      expected: resume.skills.length > 0,
      recovered: parsed.found.skills > 0,
    },
  ];
}

/** True when every field the user provided survived the PDF round-trip. */
export function roundTripReadable(checks: FieldCheck[]): boolean {
  return checks.every((c) => !c.expected || c.recovered);
}

export interface Issue {
  level: "error" | "warn" | "info";
  message: string;
}

const LONG_BULLET = 240;

function countLongLines(resume: ResumeData): number {
  let n = 0;
  if (resume.basics.summary.length > 600) n++;
  for (const w of resume.work) {
    for (const h of w.highlights) if (h.length > LONG_BULLET) n++;
  }
  for (const p of resume.projects) {
    for (const h of p.highlights) if (h.length > LONG_BULLET) n++;
  }
  return n;
}

/**
 * Flag structural ATS issues from the resume data, the chosen template, and
 * (optionally) the text extracted from the generated PDF.
 */
export function computeIssues(
  resume: ResumeData,
  templateAtsSafe: boolean,
  extractedText?: string,
): Issue[] {
  const issues: Issue[] = [];

  if (!resume.basics.email) {
    issues.push({
      level: "error",
      message: "No email address — most ATS require one to contact you.",
    });
  }
  if (!resume.basics.phone) {
    issues.push({ level: "warn", message: "No phone number found." });
  }
  if (!templateAtsSafe) {
    issues.push({
      level: "warn",
      message:
        "This template is multi-column. Many ATS read multi-column layouts out of order — switch to an ATS-safe template for online applications.",
    });
  }

  const longLines = countLongLines(resume);
  if (longLines > 0) {
    issues.push({
      level: "info",
      message: `${longLines} very long ${
        longLines === 1 ? "line" : "lines"
      } — consider tightening for readability.`,
    });
  }

  if (
    extractedText !== undefined &&
    extractedText.replace(/\s/g, "").length < 40
  ) {
    issues.push({
      level: "error",
      message:
        "The exported PDF produced almost no selectable text — it may be rendering as an image, which ATS cannot read.",
    });
  }

  return issues;
}
