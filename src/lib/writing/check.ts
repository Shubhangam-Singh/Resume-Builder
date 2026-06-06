import type { ResumeData } from "@/lib/resume/types";

/**
 * A lightweight, fully-offline writing checker tuned for resumes. It won't catch
 * everything a grammar engine would, but it flags the high-signal mistakes that
 * weaken resumes: first-person pronouns, weak/passive openers, filler words,
 * missing quantification, common typos, and formatting slips. No network, no
 * data leaves the browser.
 */

export type WritingSeverity = "warn" | "info";

export interface WritingIssue {
  severity: WritingSeverity;
  where: string; // human-readable location, e.g. "Experience · Acme"
  message: string;
  text: string; // the offending snippet
}

// Weak ways to open a bullet — prefer a strong action verb instead.
const WEAK_OPENERS = [
  "responsible for",
  "worked on",
  "helped with",
  "helped to",
  "assisted with",
  "assisted in",
  "duties included",
  "tasked with",
  "in charge of",
  "involved in",
];

const FILLER = [
  "very",
  "really",
  "a lot",
  "lots of",
  "things",
  "stuff",
  "various",
  "successfully",
  "basically",
  "literally",
];

// A small, curated set of typos that show up a lot on resumes.
const COMMON_TYPOS: Record<string, string> = {
  recieve: "receive",
  recieved: "received",
  acheive: "achieve",
  acheived: "achieved",
  acheivement: "achievement",
  managment: "management",
  enviroment: "environment",
  developement: "development",
  experiance: "experience",
  responsibilites: "responsibilities",
  responsibile: "responsible",
  succesful: "successful",
  successfull: "successful",
  collaboratin: "collaboration",
  comunication: "communication",
  knowlege: "knowledge",
  profesional: "professional",
  leadership: "leadership",
  analize: "analyze",
  analyse: "analyze",
  oragnized: "organized",
  optmize: "optimize",
  begining: "beginning",
  occured: "occurred",
  seperate: "separate",
  definately: "definitely",
  teh: "the",
  adn: "and",
};

const PRONOUNS = /\b(i|me|my|mine|myself)\b/i;

function checkText(text: string, where: string): WritingIssue[] {
  const issues: WritingIssue[] = [];
  const trimmed = text.trim();
  if (!trimmed) return issues;
  const lower = trimmed.toLowerCase();

  if (PRONOUNS.test(trimmed)) {
    issues.push({
      severity: "warn",
      where,
      message: "Avoid first-person pronouns (I, me, my) — start with an action verb.",
      text: trimmed,
    });
  }

  for (const opener of WEAK_OPENERS) {
    if (lower.startsWith(opener) || lower.includes(` ${opener}`)) {
      issues.push({
        severity: "warn",
        where,
        message: `Weak phrasing “${opener}” — lead with a strong verb (Built, Led, Shipped, Reduced…).`,
        text: trimmed,
      });
      break;
    }
  }

  for (const word of FILLER) {
    if (new RegExp(`\\b${word}\\b`, "i").test(trimmed)) {
      issues.push({
        severity: "info",
        where,
        message: `Filler word “${word}” adds little — consider cutting it.`,
        text: trimmed,
      });
      break;
    }
  }

  const words = lower.match(/[a-z']+/g) ?? [];
  for (const w of words) {
    if (COMMON_TYPOS[w]) {
      issues.push({
        severity: "warn",
        where,
        message: `Possible typo: “${w}” → “${COMMON_TYPOS[w]}”.`,
        text: trimmed,
      });
      break;
    }
  }

  // Repeated word, e.g. "the the"
  const dup = /\b(\w+)\s+\1\b/i.exec(trimmed);
  if (dup) {
    issues.push({
      severity: "warn",
      where,
      message: `Repeated word “${dup[1]}”.`,
      text: trimmed,
    });
  }

  if (/ {2,}/.test(text)) {
    issues.push({
      severity: "info",
      where,
      message: "Double space — tidy up the spacing.",
      text: trimmed,
    });
  }

  if (trimmed.length > 240) {
    issues.push({
      severity: "info",
      where,
      message: "Very long line — split it or tighten for readability.",
      text: trimmed,
    });
  }

  return issues;
}

/** Run the writing check across the summary and every bullet. */
export function checkWriting(resume: ResumeData): WritingIssue[] {
  const issues: WritingIssue[] = [];
  const { basics, work, projects } = resume;

  if (basics.summary) issues.push(...checkText(basics.summary, "Summary"));

  for (const w of work) {
    const label = `Experience · ${w.position || w.name || "Role"}`;
    for (const h of w.highlights) issues.push(...checkText(h, label));
  }
  for (const p of projects) {
    const label = `Project · ${p.name || "Project"}`;
    if (p.description) issues.push(...checkText(p.description, label));
    for (const h of p.highlights) issues.push(...checkText(h, label));
  }
  for (const cs of resume.customSections ?? []) {
    const label = cs.title || "Custom section";
    for (const it of cs.items) {
      for (const h of it.highlights) issues.push(...checkText(h, label));
    }
  }

  // Quantification nudge: only when there's experience but few numbers.
  const bullets = work.flatMap((w) => w.highlights);
  if (bullets.length >= 2) {
    const quantified = bullets.filter((b) => /\d/.test(b)).length;
    if (quantified / bullets.length < 0.3) {
      issues.push({
        severity: "info",
        where: "Experience",
        message:
          "Few bullets include numbers. Quantify impact where you can (%, $, time saved, scale).",
        text: "",
      });
    }
  }

  return issues;
}
