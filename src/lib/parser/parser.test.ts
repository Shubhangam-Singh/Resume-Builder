import { describe, expect, it } from "vitest";

import { parseResumeText } from "./index";
import { normalizeText } from "./normalize";
import { detectSections } from "./sections";
import { parseSkillsSection } from "./skills";
import { parseMonthYear, extractDateRange } from "./dates";

const STANDARD = `Alex Morgan
Full-Stack Software Engineer
alex.morgan@example.com | +1 (555) 123-4567 | Austin, TX
github.com/alexmorgan | linkedin.com/in/alexmorgan

SUMMARY
Full-stack engineer with 6+ years building reliable web applications.

EXPERIENCE
Senior Software Engineer — Northwind Labs
Mar 2021 - Present | Austin, TX
• Led migration of a legacy monolith, cutting latency by 38%.
• Mentored four engineers.

Software Engineer — Brightwave
Jun 2018 - Feb 2021 | Remote
• Built dashboards used by 20k users.

EDUCATION
University of Texas at Austin
B.S. in Computer Science | 2014 - 2018 | 3.8 GPA

SKILLS
Languages: TypeScript, JavaScript, Python, COBOL
Frameworks: React, Next.js, Node.js
Tools: PostgreSQL, Docker, AWS

PROJECTS
OpenMetrics — Self-hostable analytics dashboard (TypeScript, ClickHouse)
• 1.2k+ GitHub stars.

CERTIFICATIONS
AWS Certified Solutions Architect - Amazon Web Services | 2022
`;

describe("parseResumeText — standard single-column resume", () => {
  const { data, found, isEmpty } = parseResumeText(STANDARD);

  it("is not empty", () => {
    expect(isEmpty).toBe(false);
  });

  it("extracts basic contact info", () => {
    expect(data.basics.name).toBe("Alex Morgan");
    expect(data.basics.email).toBe("alex.morgan@example.com");
    expect(data.basics.phone.replace(/\D/g, "")).toContain("5551234567");
    expect(data.basics.label.toLowerCase()).toContain("engineer");
  });

  it("detects social profiles", () => {
    const networks = data.basics.profiles.map((p) => p.network).sort();
    expect(networks).toEqual(["GitHub", "LinkedIn"]);
  });

  it("captures the summary", () => {
    expect(data.basics.summary).toMatch(/full-stack engineer/i);
    expect(found.summary).toBe(true);
  });

  it("splits work into structured entries", () => {
    expect(data.work.length).toBe(2);
    const [first, second] = data.work;
    expect(first.position).toMatch(/senior software engineer/i);
    expect(first.name).toMatch(/northwind/i);
    expect(first.startDate).toBe("2021-03");
    expect(first.endDate).toBe(""); // Present
    expect(first.highlights.length).toBe(2);

    expect(second.position).toMatch(/software engineer/i);
    expect(second.name).toMatch(/brightwave/i);
    expect(second.startDate).toBe("2018-06");
    expect(second.endDate).toBe("2021-02");
    expect(second.location).toMatch(/remote/i);
  });

  it("parses education with degree, dates and score", () => {
    expect(data.education.length).toBe(1);
    const edu = data.education[0];
    expect(edu.institution).toMatch(/university of texas/i);
    expect(edu.area).toMatch(/computer science/i);
    expect(edu.startDate).toBe("2014");
    expect(edu.endDate).toBe("2018");
    expect(edu.score).toMatch(/3\.8/);
  });

  it("preserves ALL skills, including ones not in the taxonomy", () => {
    const allKeywords = data.skills.flatMap((s) => s.keywords);
    // COBOL is intentionally NOT in the taxonomy and must survive.
    expect(allKeywords).toContain("COBOL");
    // Known tokens are normalized.
    expect(allKeywords).toContain("TypeScript");
    expect(allKeywords).toContain("Next.js");
    const categories = data.skills.map((s) => s.name);
    expect(categories).toContain("Languages");
  });

  it("parses projects with keywords", () => {
    expect(data.projects.length).toBe(1);
    const proj = data.projects[0];
    expect(proj.name).toMatch(/openmetrics/i);
    expect(proj.keywords).toContain("TypeScript");
    expect(proj.highlights.length).toBe(1);
  });

  it("parses certificates", () => {
    expect(data.certificates.length).toBe(1);
    expect(data.certificates[0].name).toMatch(/solutions architect/i);
    expect(data.certificates[0].issuer).toMatch(/amazon/i);
    expect(data.certificates[0].date).toBe("2022");
  });
});

const SLANG = `JORDAN LEE
jordan.lee@gmail.com
+91 98765 43210

ABOUT
Backend developer who loves distributed systems.

EXP.
Backend Engineer at Acme Corp
01/2020 - 03/2022
• Scaled the payments service to 5k rps.

SKILLZ
Go, Rust, Kafka, Postgres

EDUCASHUN
National Institute of Technology
B.Tech, Information Technology, 2015 - 2019
`;

describe("parseResumeText — slang/abbreviated headers & Indian phone", () => {
  const { data } = parseResumeText(SLANG);

  it("handles slang section headers", () => {
    expect(data.basics.summary).toMatch(/distributed systems/i);
    expect(data.work.length).toBe(1);
    expect(data.skills.flatMap((s) => s.keywords)).toContain("Go");
    expect(data.education.length).toBe(1);
  });

  it("extracts the Indian mobile number and gmail", () => {
    expect(data.basics.email).toBe("jordan.lee@gmail.com");
    expect(data.basics.phone.replace(/\D/g, "")).toContain("9876543210");
  });

  it("parses the work entry with numeric dates", () => {
    const w = data.work[0];
    expect(w.position).toMatch(/backend engineer/i);
    expect(w.name).toMatch(/acme/i);
    expect(w.startDate).toBe("2020-01");
    expect(w.endDate).toBe("2022-03");
  });
});

describe("date parsing", () => {
  it("normalizes varied month formats to YYYY-MM", () => {
    expect(parseMonthYear("Mar 2021")).toBe("2021-03");
    expect(parseMonthYear("March 2021")).toBe("2021-03");
    expect(parseMonthYear("03/2021")).toBe("2021-03");
    expect(parseMonthYear("2021-03")).toBe("2021-03");
    expect(parseMonthYear("2021")).toBe("2021");
    expect(parseMonthYear("Sept 2019")).toBe("2019-09");
  });

  it("detects ranges and present markers", () => {
    expect(extractDateRange("Jan 2020 - Present")).toMatchObject({
      start: "2020-01",
      end: "",
    });
    expect(extractDateRange("2018 - 2020")).toMatchObject({
      start: "2018",
      end: "2020",
    });
  });
});

describe("skill preservation", () => {
  it("keeps unknown skills and normalizes known ones", () => {
    const entries = parseSkillsSection(
      "Backend: nodejs, fastify, Crystal-lang\nOther: Fortran, Blender",
    );
    const all = entries.flatMap((e) => e.keywords);
    expect(all).toContain("Node.js"); // normalized
    expect(all).toContain("Crystal-lang"); // unknown, preserved
    expect(all).toContain("Fortran"); // unknown, preserved
    expect(all).toContain("Blender"); // unknown, preserved
  });
});

describe("normalization keeps line structure", () => {
  it("collapses spaces but preserves newlines", () => {
    const out = normalizeText("a    b\n\n\n c   d");
    expect(out).toBe("a b\n\nc d");
  });

  it("normalizes bullets and dashes", () => {
    const out = normalizeText("▪ item one\n— dash");
    expect(out).toContain("• item one");
    expect(out).toContain("- dash");
  });
});

describe("graceful degradation", () => {
  it("returns an empty (not crashing) result for junk input", () => {
    const { isEmpty } = parseResumeText("###  ---  ***");
    expect(isEmpty).toBe(true);
  });

  it("handles empty input", () => {
    const { isEmpty, data } = parseResumeText("");
    expect(isEmpty).toBe(true);
    expect(data.work).toEqual([]);
  });
});

describe("section detection sanity", () => {
  it("buckets lines under the right sections", () => {
    const sections = detectSections(
      normalizeText("EXPERIENCE\nDid things\nSKILLS\nPython"),
    );
    expect(sections.experience).toMatch(/did things/i);
    expect(sections.skills).toMatch(/python/i);
  });
});
