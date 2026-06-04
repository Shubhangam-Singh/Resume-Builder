import { describe, expect, it } from "vitest";

import { emptyResume, sampleResume } from "@/lib/resume/factory";
import { analyzeCoverage, extractKeywords } from "./keywords";
import { computeIssues } from "./check";
import { resumeToPlainText } from "./resume-text";

describe("resumeToPlainText", () => {
  it("includes skills, highlights, and project keywords", () => {
    const text = resumeToPlainText(sampleResume());
    expect(text).toMatch(/TypeScript/);
    expect(text).toMatch(/legacy monolith/i); // a work highlight
    expect(text).toMatch(/ClickHouse/); // a project keyword
  });
});

describe("extractKeywords", () => {
  it("surfaces known skills and meaningful terms, drops boilerplate", () => {
    const jd =
      "We are looking for a React and Node.js engineer with strong experience in PostgreSQL and Kubernetes. Responsibilities include mentoring and roadmap planning.";
    const kw = extractKeywords(jd);
    const lower = kw.map((k) => k.toLowerCase());
    expect(lower).toContain("react");
    expect(lower).toContain("node.js");
    expect(lower).toContain("postgresql");
    expect(lower).toContain("kubernetes");
    // Boilerplate must be excluded.
    expect(lower).not.toContain("experience");
    expect(lower).not.toContain("responsibilities");
    expect(lower).not.toContain("looking");
  });
});

describe("analyzeCoverage", () => {
  it("computes matched/missing and a coverage score", () => {
    const jd =
      "Seeking a developer skilled in React, Python, Kubernetes, and Terraform.";
    const resumeText = "Built apps with React and Python. Used Docker daily.";
    const { results, matched, total, coverage } = analyzeCoverage(
      jd,
      resumeText,
    );

    const present = results.filter((r) => r.present).map((r) => r.term.toLowerCase());
    const missing = results.filter((r) => !r.present).map((r) => r.term.toLowerCase());

    expect(present).toContain("react");
    expect(present).toContain("python");
    expect(missing).toContain("kubernetes");
    expect(missing).toContain("terraform");
    expect(coverage).toBe(Math.round((matched / total) * 100));
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThan(100);
  });

  it("does not match substrings inside other words", () => {
    // "go" must not match inside "google"
    const { results } = analyzeCoverage("Experience with Go.", "I use google.");
    const go = results.find((r) => r.term.toLowerCase() === "go");
    expect(go?.present).toBe(false);
  });
});

describe("computeIssues", () => {
  it("flags a missing email as an error and a non-ATS template as a warning", () => {
    const resume = emptyResume(); // no email/phone
    const issues = computeIssues(resume, false);
    expect(issues.some((i) => i.level === "error" && /email/i.test(i.message))).toBe(
      true,
    );
    expect(
      issues.some((i) => i.level === "warn" && /multi-column/i.test(i.message)),
    ).toBe(true);
  });

  it("flags near-empty extracted text as a likely image", () => {
    const issues = computeIssues(sampleResume(), true, "   ");
    expect(
      issues.some((i) => i.level === "error" && /image/i.test(i.message)),
    ).toBe(true);
  });

  it("is clean for a complete resume on an ATS-safe template", () => {
    const issues = computeIssues(sampleResume(), true);
    expect(issues.filter((i) => i.level === "error")).toHaveLength(0);
  });
});
