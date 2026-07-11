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

  it("isolates unknown ALL-CAPS sections so they don't pollute the previous one", () => {
    const sections = detectSections(
      normalizeText(
        "EXPERIENCE\nEngineer at Acme\n• Did things\nSTRENGTHS\nHard worker, fast learner\nEDUCATION\nState University",
      ),
    );
    expect(sections.experience).not.toMatch(/hard worker/i);
    expect(sections.education).toMatch(/state university/i);
  });

  it("routes Interests/Declaration/References to an ignored bucket", () => {
    const sections = detectSections(
      normalizeText(
        "EXPERIENCE\nEngineer at Acme\nInterests\nCricket, chess\nDeclaration\nI hereby declare the above is true.",
      ),
    );
    expect(sections.experience).not.toMatch(/cricket|hereby/i);
  });

  it("uses extractor heading hints, but never before the first known header", () => {
    const text = normalizeText(
      "Priya Sharma\nProduct Designer\nEXPERIENCE\nDesigner at Studio\nSelected Clients\nAcme, Globex",
    );
    const sections = detectSections(text, {
      headingLines: ["Priya Sharma", "Selected Clients"],
    });
    // Name stays in the header (hint ignored before the first known section)…
    expect(sections.header).toMatch(/priya sharma/i);
    // …while the hinted unknown header after it starts a fresh bucket.
    expect(sections.experience).not.toMatch(/globex/i);
  });
});

describe("expanded date formats", () => {
  it("parses apostrophe years, seasons, full dates and dotted numerics", () => {
    expect(parseMonthYear("Jan '20")).toBe("2020-01");
    expect(parseMonthYear("Summer 2021")).toBe("2021-06");
    expect(parseMonthYear("12 Jan 2020")).toBe("2020-01");
    expect(parseMonthYear("January 12, 2020")).toBe("2020-01");
    expect(parseMonthYear("03.2021")).toBe("2021-03");
    expect(parseMonthYear("12/01/2020")).toBe("2020-12");
  });

  it("parses month–month ranges sharing one year", () => {
    expect(extractDateRange("Jan - Mar 2021")).toMatchObject({
      start: "2021-01",
      end: "2021-03",
    });
  });

  it("expands abbreviated year ranges", () => {
    expect(extractDateRange("2014 - 18")).toMatchObject({
      start: "2014",
      end: "2018",
    });
  });

  it("treats 'Since X' as an open-ended range", () => {
    expect(extractDateRange("Since Jan 2022")).toMatchObject({
      start: "2022-01",
      end: "",
    });
  });
});

const OLD_PDF = `RAHUL VERMA
Senior Data Analyst
rahul.verma@gmail.com | +91 98220 11223
Vellore, Tamil Nadu

EXPERIENCE
Data Analyst | Infosys Ltd | Bengaluru, Karnataka
Jun 2019 - Present
o Built dashboards that reduced reporting
time by 40% across the finance vertical
1. Automated the monthly close process
• Led migration of a legacy
monolith to a modern stack

EDUCATION
Vellore Institute of Technology
B.Tech, Information Technology
2015 - 2019

CERTIFICATIONS
Deep Learning Specialization (Coursera) 2021

SKILLS
Python • SQL · Power BI / Tableau
`;

describe("parseResumeText — old-PDF artifacts", () => {
  const { data } = parseResumeText(OLD_PDF);

  it("reads Word-style 'o' and numbered bullets as highlights", () => {
    const w = data.work[0];
    expect(w.highlights.some((h) => /dashboards/.test(h))).toBe(true);
    expect(w.highlights.some((h) => /monthly close/.test(h))).toBe(true);
  });

  it("re-joins bullets wrapped across PDF line breaks", () => {
    const w = data.work[0];
    const wrapped = w.highlights.find((h) => /reporting time/.test(h));
    expect(wrapped).toBeTruthy();
    const migration = w.highlights.find((h) => /legacy monolith/.test(h));
    expect(migration).toBeTruthy();
  });

  it("extracts Indian city + state locations", () => {
    expect(data.work[0].location).toBe("Bengaluru, Karnataka");
    expect(data.basics.location.city).toBe("Vellore");
    expect(data.basics.location.region).toBe("Tamil Nadu");
  });

  it("keeps the company suffix with the company", () => {
    expect(data.work[0].name).toMatch(/infosys/i);
    expect(data.work[0].position).toMatch(/data analyst/i);
  });

  it("finds the study area after the degree without 'in/of'", () => {
    expect(data.education[0].area).toMatch(/information technology/i);
    expect(data.education[0].studyType).toMatch(/b\.?tech/i);
  });

  it("reads a parenthetical certificate issuer", () => {
    expect(data.certificates[0].name).toMatch(/deep learning/i);
    expect(data.certificates[0].issuer).toMatch(/coursera/i);
    expect(data.certificates[0].date).toBe("2021");
  });

  it("splits skills on bullets, middots and spaced slashes", () => {
    const all = data.skills.flatMap((s) => s.keywords);
    expect(all).toEqual(
      expect.arrayContaining(["Python", "SQL", "Power BI", "Tableau"]),
    );
  });
});

describe("normalization — old-PDF glyphs", () => {
  it("expands ligatures and re-joins hyphenated line wraps", () => {
    const out = normalizeText("Certiﬁed in develop-\nment and workﬂows");
    expect(out).toContain("Certified");
    expect(out).toContain("development");
    expect(out).toContain("workflows");
  });

  it("converts private-use (Wingdings) bullets", () => {
    const out = normalizeText(" Shipped the feature");
    expect(out).toContain("• Shipped the feature");
  });
});
