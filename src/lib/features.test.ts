import { describe, expect, it } from "vitest";

import { scoreResume } from "./ats/score";
import { highlightMatches } from "./ats/keywords";
import { resumeToFormattedText } from "./export/text";
import { computeCompleteness } from "./resume/completeness";
import { diffResumes } from "./resume/diff";
import { emptyCustomSection, emptyResume, sampleResume } from "./resume/factory";
import { formatDateRange, formatMonthYear } from "./resume/format";
import { customKey, resolveSectionOrder } from "./resume/sections";
import { getTemplateMeta } from "@/components/pdf/templates/meta";
import { checkWriting } from "./writing/check";

describe("date formats", () => {
  it("formats a month/year in each style", () => {
    expect(formatMonthYear("2021-03", "short")).toBe("Mar 2021");
    expect(formatMonthYear("2021-03", "long")).toBe("March 2021");
    expect(formatMonthYear("2021-03", "numeric")).toBe("03/2021");
    expect(formatMonthYear("2021-03", "iso")).toBe("2021-03");
    expect(formatMonthYear("2021-03", "year")).toBe("2021");
  });

  it("defaults to short and handles ranges + present", () => {
    expect(formatMonthYear("2021-03")).toBe("Mar 2021");
    expect(formatDateRange("2021-03", "", "numeric")).toBe("03/2021 – Present");
    expect(formatDateRange("2021-03", "2022-01", "iso")).toBe("2021-03 – 2022-01");
  });
});

describe("custom sections ordering", () => {
  it("appends custom section keys to the resolved order", () => {
    const cs = emptyCustomSection("Awards");
    const order = resolveSectionOrder({ template: "x", lastModified: "" }, [cs]);
    expect(order).toContain(customKey(cs.id));
    // built-in keys still present exactly once
    expect(order.filter((k) => k === "work")).toHaveLength(1);
  });
});

describe("completeness", () => {
  it("scores an empty resume low and the sample high", () => {
    expect(computeCompleteness(emptyResume()).score).toBeLessThan(20);
    const full = computeCompleteness(sampleResume());
    expect(full.score).toBeGreaterThan(80);
  });

  it("suggests adding a name when missing", () => {
    const r = emptyResume();
    expect(computeCompleteness(r).suggestions.join(" ")).toMatch(/name/i);
  });
});

describe("ATS score breakdown", () => {
  it("returns six weighted sections and a 0–100 overall", () => {
    const result = scoreResume(sampleResume(), true);
    expect(result.sections).toHaveLength(6);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    const sum = result.sections.reduce((n, s) => n + s.weight, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("penalizes a non-ATS template's formatting", () => {
    const safe = scoreResume(sampleResume(), true);
    const unsafe = scoreResume(sampleResume(), false);
    const f = (r: typeof safe) =>
      r.sections.find((s) => s.key === "formatting")!.score;
    expect(f(unsafe)).toBeLessThan(f(safe));
  });
});

describe("writing check", () => {
  it("flags pronouns, weak openers, and typos", () => {
    const r = emptyResume();
    r.basics.name = "Test";
    r.work = [
      {
        id: "1",
        name: "Acme",
        position: "Dev",
        location: "",
        url: "",
        startDate: "2020-01",
        endDate: "",
        summary: "",
        highlights: ["Responsible for I managed teh project"],
      },
    ];
    const issues = checkWriting(r);
    const messages = issues.map((i) => i.message).join(" ");
    expect(messages).toMatch(/first-person/i);
    expect(messages).toMatch(/weak phrasing/i);
    expect(messages.toLowerCase()).toContain("the");
  });

  it("is quiet on clean sample content", () => {
    // The sample uses strong, quantified bullets; expect few/no warnings.
    const warns = checkWriting(sampleResume()).filter((i) => i.severity === "warn");
    expect(warns).toHaveLength(0);
  });
});

describe("diff", () => {
  it("reports a changed name and added experience", () => {
    const a = sampleResume();
    const b = sampleResume();
    b.basics.name = "Changed Name";
    b.work = b.work.slice(0, 1);
    const lines = diffResumes(a, b);
    const labels = lines.map((l) => l.label);
    expect(labels).toContain("Name");
    expect(labels).toContain("Experience");
  });
});

describe("plain-text export", () => {
  it("includes the name and section headings", () => {
    const text = resumeToFormattedText(sampleResume());
    expect(text).toContain("ALEX MORGAN");
    expect(text).toContain("EXPERIENCE");
    expect(text).toContain("SKILLS");
  });

  it("omits hidden sections", () => {
    const r = sampleResume();
    r.meta.hiddenSections = ["skills"];
    expect(resumeToFormattedText(r)).not.toContain("SKILLS");
  });
});

describe("keyword highlighting", () => {
  it("marks matched terms boundary-aware", () => {
    const segs = highlightMatches("I use React and Node.js daily", ["react", "node.js"]);
    const matched = segs.filter((s) => s.match).map((s) => s.text.toLowerCase());
    expect(matched).toContain("react");
    expect(matched).toContain("node.js");
    // reconstructs the original text
    expect(segs.map((s) => s.text).join("")).toBe("I use React and Node.js daily");
  });
});

describe("template metadata is intact", () => {
  it("still resolves a known template", () => {
    expect(getTemplateMeta("ats-classic").atsSafe).toBe(true);
  });
});
