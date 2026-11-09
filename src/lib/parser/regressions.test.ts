import { describe, expect, it } from "vitest";

import { sampleResume } from "@/lib/resume/factory";
import { buildResumeDocxBlob } from "@/lib/export/docx";
import { extractDocxFromArrayBuffer } from "@/lib/import/docx";
import { parseResumeText } from "./index";
import { extractDateRange, extractSingleDate } from "./dates";
import { normalizeText } from "./normalize";
import { detectSectionHeader, detectSections } from "./sections";
import { parseSkillsSection } from "./skills";
import { extractPhone } from "./contact";

/**
 * One block per parser bug found in the November 2026 review (each failed
 * before its fix), plus bugs the round-trip harness surfaced. Inputs mirror
 * real resume layouts; expectations are what a careful human would extract.
 */

describe("bug 1 — ALL-CAPS company / institution / project names stay in their section", () => {
  const { data } = parseResumeText(`Rahul Verma
rahul.verma@gmail.com

EXPERIENCE
TATA CONSULTANCY SERVICES
Systems Engineer | Jun 2019 - Present
• Built ETL pipelines for 3 banking clients.
INFOSYS
Intern | Jan 2019 - May 2019
• Automated regression test suites.

EDUCATION
INDIAN INSTITUTE OF TECHNOLOGY
B.Tech in Computer Science | 2015 - 2019

PROJECTS
SMART ATTENDANCE SYSTEM
• Face-recognition attendance for 500 students.
`);

  it("keeps both jobs, with their capitalised employers", () => {
    expect(data.work).toHaveLength(2);
    expect(data.work[0].name).toMatch(/tata consultancy services/i);
    expect(data.work[0].position).toMatch(/systems engineer/i);
    expect(data.work[1].name).toMatch(/^infosys$/i);
    expect(data.work[1].position).toMatch(/intern/i);
  });

  it("keeps the capitalised institution and project", () => {
    expect(data.education[0]?.institution).toMatch(/indian institute of technology/i);
    expect(data.projects[0]?.name).toMatch(/smart attendance system/i);
  });

  it("still isolates real unknown sections", () => {
    const s = detectSections(
      normalizeText("EXPERIENCE\nEngineer at Acme\n• Did things\nPOSITIONS OF RESPONSIBILITY\n• Head, Coding Club"),
    );
    expect(s.experience).not.toMatch(/coding club/i);
  });
});

describe("bug 2 — job titles that start with a section word are not section headings", () => {
  const { data } = parseResumeText(`Asha Rao
asha.rao@gmail.com
Portfolio: asharao.dev

EXPERIENCE
Project Manager - Acme Corp
Jan 2020 - Present
• Delivered 12 projects on time and under budget.
Research Assistant | IIT Delhi
Jun 2018 - Dec 2019
• Co-authored two papers on graph learning.
Training Coordinator, Globex
2016 - 2018
• Improved workplace safety scores by 30%.
• Earned AWS certs for the whole team.
`);

  it("reads all three roles as jobs", () => {
    expect(data.work.map((w) => w.position)).toEqual([
      "Project Manager",
      "Research Assistant",
      "Training Coordinator",
    ]);
    expect(data.work.map((w) => w.name)).toEqual(["Acme Corp", "IIT Delhi", "Globex"]);
  });

  it("keeps bullets that merely contain a section word", () => {
    expect(data.work[2].highlights).toEqual([
      "Improved workplace safety scores by 30%.",
      "Earned AWS certs for the whole team.",
    ]);
  });

  it("treats 'Portfolio: <link>' as a contact line, not a Projects heading", () => {
    expect(data.projects).toEqual([]);
    expect(data.basics.url).toBe("https://asharao.dev");
  });

  it("does not match slang aliases inside ordinary lines", () => {
    expect(detectSectionHeader("Improved workplace safety by 30%")).toBeNull();
    expect(detectSectionHeader("Earned AWS certs")).toBeNull();
    expect(detectSectionHeader("SKILLZ")).toBe("skills");
  });

  it("doesn't read skill category words as headings", () => {
    expect(detectSectionHeader("Frameworks")).toBeNull();
    expect(detectSectionHeader("Technologies used")).toBeNull();
    expect(detectSectionHeader("TOOLS & TECHNOLOGIES")).toBe("skills");
  });

  it("still accepts decorated headings", () => {
    expect(detectSectionHeader("Technical Skills (Backend)")).toBe("skills");
    expect(detectSectionHeader("Education & Certifications")).toBe("education");
    expect(detectSectionHeader("Research Experience")).toBe("experience");
  });
});

describe("bug 3 — company-first layouts keep each company with its own role", () => {
  const { data } = parseResumeText(`EXPERIENCE
Northwind Labs | Austin, TX
Senior Software Engineer | Mar 2021 - Present
• Led migration of a legacy monolith.
• Mentored four engineers.
Brightwave | Remote
Software Engineer | Jun 2018 - Feb 2021
• Built dashboards used by 20k users.
`);

  it("splits into two entries without leaking the next company into bullets", () => {
    expect(data.work).toHaveLength(2);
    const [a, b] = data.work;
    expect(a).toMatchObject({ name: "Northwind Labs", position: "Senior Software Engineer", location: "Austin, TX" });
    expect(a.highlights).toEqual(["Led migration of a legacy monolith.", "Mentored four engineers."]);
    expect(b).toMatchObject({ name: "Brightwave", position: "Software Engineer", location: "Remote" });
    expect(b.startDate).toBe("2018-06");
  });
});

describe("bug 4 — wrapped bullet lines containing a job word don't start a fake job", () => {
  const { data } = parseResumeText(`EXPERIENCE
Software Engineer - Acme Corp
Jan 2020 - Present
• Partnered with design and the
product manager to ship a new onboarding flow.
• Worked closely with the engineering lead on
lead generation tooling for the sales team.
• Mentored two junior developers.
`);

  it("keeps one job with three bullets", () => {
    expect(data.work).toHaveLength(1);
    expect(data.work[0].highlights).toHaveLength(3);
    expect(data.work[0].highlights[0]).toMatch(/product manager to ship/);
    expect(data.work[0].highlights[1]).toMatch(/lead generation tooling/);
  });
});

describe("bug 5 — Word (.docx) bullets survive import", () => {
  it("reads every bullet of a real .docx as a highlight", async () => {
    const source = sampleResume();
    const blob = await buildResumeDocxBlob(source);
    const text = await extractDocxFromArrayBuffer(await blob.arrayBuffer());
    const { data } = parseResumeText(text);
    expect(data.work).toHaveLength(2);
    expect(data.work[0].highlights).toEqual(source.work[0].highlights);
    expect(data.work[0].summary).toBe("");
    expect(data.work[1].highlights).toEqual(source.work[1].highlights);
  });

  it("reads action-verb lines as bullets when a document has no bullet markers", () => {
    const { data } = parseResumeText(`EXPERIENCE
Data Analyst - Infosys Ltd
Jun 2019 - Present
Built dashboards that cut reporting time by 40%.
Automated the monthly close process for 12 entities.
Partnered with the finance team on forecasting.
`);
    expect(data.work).toHaveLength(1);
    expect(data.work[0].summary).toBe("");
    expect(data.work[0].highlights).toHaveLength(3);
  });
});

describe("bug 6 — education: degree-first entries, full degree names, coursework", () => {
  const { data } = parseResumeText(`EDUCATION
Bachelor of Technology in Computer Science and Engineering
XYZ Institute of Technology | 2018 - 2022 | CGPA: 8.6/10
Relevant Coursework: Data Structures, Operating Systems, DBMS
Class XII (CBSE) - Delhi Public School | 2018 | 92%
`);

  it("pairs the degree with the institution that follows it", () => {
    expect(data.education).toHaveLength(2);
    expect(data.education[0]).toMatchObject({
      institution: "XYZ Institute of Technology",
      studyType: "Bachelor of Technology",
      area: "Computer Science and Engineering",
      startDate: "2018",
      endDate: "2022",
    });
    expect(data.education[0].score).toMatch(/8\.6/);
  });

  it("extracts coursework into courses", () => {
    expect(data.education[0].courses).toEqual(["Data Structures", "Operating Systems", "DBMS"]);
  });

  it("reads school-level (Class XII) entries", () => {
    expect(data.education[1].institution).toMatch(/delhi public school/i);
    expect(data.education[1].studyType).toMatch(/class xii/i);
    expect(data.education[1].endDate).toBe("2018");
    expect(data.education[1].score).toBe("92%");
  });

  it("keeps abbreviation dots and splits the field after them", () => {
    const { data: d } = parseResumeText("EDUCATION\nUniversity of Texas at Austin\nB.S., Computer Science\n2014 - 2018");
    expect(d.education[0]).toMatchObject({ studyType: "B.S.", area: "Computer Science" });
  });

  it("splits an institution and degree written on one line", () => {
    const { data: d } = parseResumeText("EDUCATION\nUniversity of Washington - B.S., Computer Science\nSep 2014 - Jun 2018");
    expect(d.education[0]).toMatchObject({
      institution: "University of Washington",
      studyType: "B.S.",
      area: "Computer Science",
    });
  });

  it("doesn't read the English words 'be'/'me' as degrees", () => {
    const { data: d } = parseResumeText("EDUCATION\nState University\nThesis to be submitted in 2025");
    expect(d.education[0].studyType).toBe("");
  });
});

describe("bug 7 — date formats", () => {
  it.each([
    ["Mar-2021 - Jun-2022", "2021-03", "2022-06"],
    ["Jun-2021 to Aug-2021", "2021-06", "2021-08"],
    ["Jan-21 to Mar-22", "2021-01", "2022-03"],
    ["Jan 2020 -- Present", "2020-01", ""],
    ["January 2019 to date", "2019-01", ""],
    ["2021 - Pursuing", "2021", ""],
    ["2021 - Expected 2025", "2021", "2025"],
  ])("reads %s", (line, start, end) => {
    expect(extractDateRange(line)).toMatchObject({ start, end });
  });

  it("reads ranges written with Unicode non-breaking hyphens", () => {
    expect(extractDateRange(normalizeText("2019‑2021"))).toMatchObject({ start: "2019", end: "2021" });
  });

  it("doesn't read the end of a word as a month", () => {
    // "Gram-mar 2019" / "Ku-mar 2019" used to read as March 2019.
    expect(extractSingleDate("Ranked 1st in the Grammar 2019 Olympiad")).toBe("2019");
    expect(extractSingleDate("Mentor: Prof. R. Kumar 2019")).toBe("2019");
  });

  it("anchors a job on a hyphenated month-year range", () => {
    const { data } = parseResumeText("EXPERIENCE\nSoftware Developer - Wipro\nJun-2021 to Aug-2022\n• Shipped features.\nIntern - TCS\nJan-2021 to May-2021\n• Wrote tests.");
    expect(data.work.map((w) => [w.name, w.startDate, w.endDate])).toEqual([
      ["Wipro", "2021-06", "2022-08"],
      ["TCS", "2021-01", "2021-05"],
    ]);
  });
});

describe("bug 8 — department suffixes are not read as 'City, ST'", () => {
  const { data } = parseResumeText(`EXPERIENCE
Software Engineer, QA | Acme Corp
Jan 2020 - Present
• Wrote 300 automated tests.
Executive, HR - Globex
2018 - 2019
• Ran hiring for 40 roles.
`);

  it("keeps the full title and company", () => {
    expect(data.work[0]).toMatchObject({ position: "Software Engineer, QA", name: "Acme Corp", location: "" });
    expect(data.work[1]).toMatchObject({ position: "Executive, HR", name: "Globex", location: "" });
  });

  it("still reads real 'City, ST' locations", () => {
    const { data: d } = parseResumeText("Asha Rao\nasha@x.com | Bengaluru, KA\n\nEXPERIENCE\nEngineer - Acme | Austin, TX\n2020 - 2021");
    expect(d.basics.location).toMatchObject({ city: "Bengaluru", region: "KA" });
    expect(d.work[0].location).toBe("Austin, TX");
  });
});

describe("bug 9 — certificates: levels aren't issuers, dates are fully removed", () => {
  const { data } = parseResumeText(`CERTIFICATIONS
AWS Certified Solutions Architect - Associate
AWS Certified Developer - Associate | Amazon Web Services | 2023
Google Data Analytics Professional Certificate - Coursera | Mar 2022
Certified Scrum Master (CSM) - Scrum Alliance
Nielsen Norman Group UX Certification | Nielsen Norman Group · Oct 2021
`);

  it("keeps the level in the name and infers well-known issuers", () => {
    expect(data.certificates[0]).toMatchObject({
      name: "AWS Certified Solutions Architect - Associate",
      issuer: "Amazon Web Services",
    });
  });

  it("picks the issuer segment, not the level", () => {
    expect(data.certificates[1]).toMatchObject({
      name: "AWS Certified Developer - Associate",
      issuer: "Amazon Web Services",
      date: "2023",
    });
    expect(data.certificates[2]).toMatchObject({
      name: "Google Data Analytics Professional Certificate",
      issuer: "Coursera",
      date: "2022-03",
    });
    expect(data.certificates[3]).toMatchObject({ name: "Certified Scrum Master (CSM)", issuer: "Scrum Alliance" });
  });

  it("removes the whole date, month included", () => {
    expect(data.certificates[4]).toMatchObject({
      name: "Nielsen Norman Group UX Certification",
      issuer: "Nielsen Norman Group",
      date: "2021-10",
    });
  });
});

describe("bug 10 — content the builder can hold is never silently dropped", () => {
  const { data } = parseResumeText(`Priya Nair
priya.nair@gmail.com | +91 98765 43210
Product designer with 6 years of experience crafting accessible fintech apps used by millions of customers.

EXPERIENCE
Product Designer - Paytm
2019 - Present
• Redesigned checkout, lifting conversion 12%.

LANGUAGES
English (Fluent), Hindi (Native)

PUBLICATIONS
• Designing for Trust, UX India 2023

AWARDS
• Winner, Smart India Hackathon 2022

POSITIONS OF RESPONSIBILITY
• Head, Design Club (2017 - 2018)

INTERESTS
Chess, Trekking

DECLARATION
I hereby declare that the above information is true.
`);

  it("uses an un-headed paragraph under the contact block as the summary", () => {
    expect(data.basics.summary).toMatch(/^Product designer with 6 years/);
  });

  it("keeps languages as a skills category", () => {
    const langs = data.skills.find((s) => s.name === "Languages");
    expect(langs?.keywords).toEqual(["English (Fluent)", "Hindi (Native)"]);
  });

  it("keeps other sections as custom sections with their own titles", () => {
    const titles = (data.customSections ?? []).map((s) => s.title);
    expect(titles).toEqual(["Publications", "Awards", "Positions of Responsibility", "Interests"]);
    const awards = data.customSections?.find((s) => s.title === "Awards");
    expect(awards?.items[0].name).toMatch(/smart india hackathon/i);
  });

  it("doesn't file awards as certificates, or keep the declaration", () => {
    expect(data.certificates).toEqual([]);
    expect(JSON.stringify(data)).not.toMatch(/hereby declare/);
  });
});

describe("bug 11 — text clean-up doesn't damage data", () => {
  it("keeps hyphens in URLs wrapped across lines", () => {
    expect(normalizeText("linkedin.com/in/rahul-\nsharma")).toBe("linkedin.com/in/rahul-sharma");
  });

  it("keeps hyphenated compounds wrapped across lines", () => {
    expect(normalizeText("Led cross-\nfunctional teams")).toBe("Led cross-functional teams");
    expect(normalizeText("Built full-\nstack apps")).toBe("Built full-stack apps");
  });

  it("still re-joins words hyphenated by line wrapping", () => {
    expect(normalizeText("develop-\nment")).toBe("development");
  });

  it("folds styled Unicode letters and full-width forms", () => {
    expect(normalizeText("𝗥𝗮𝗵𝘂𝗹 Ｓｈａｒｍａ")).toBe("Rahul Sharma");
  });

  it("collapses letter-spaced headings, including kerned pairs", () => {
    expect(normalizeText("E X P E R I E N C E")).toBe("EXPERIENCE");
    expect(normalizeText("S U M M A RY")).toBe("SUMMARY");
    expect(normalizeText("P RO J E C T S")).toBe("PROJECTS");
  });

  it("splits a letter-spaced margin label from the content beside it", () => {
    const s = detectSections(normalizeText("S K I L L S Languages: TypeScript, Python\nE X P E R I E N C E Engineer - Acme\n2020 - 2021"));
    expect(s.skills).toMatch(/Languages: TypeScript, Python/);
    expect(s.experience).toMatch(/Engineer - Acme/);
  });

  it("leaves initials and short words alone", () => {
    expect(normalizeText("S K Sharma")).toBe("S K Sharma");
    expect(normalizeText("M S in CS")).toBe("M S in CS");
    expect(normalizeText("I am a UX designer")).toBe("I am a UX designer");
  });

  it("matches multi-word letter-spaced headings", () => {
    expect(detectSectionHeader(normalizeText("W O R K E X P E R I E N C E"))).toBe("experience");
  });
});

describe("bug 12 — contact details", () => {
  it("finds a website written without https://", () => {
    expect(parseResumeText("Jo Park\njo@x.com | jopark.dev\n\nSKILLS\nNode.js, ASP.NET").data.basics.url).toBe("https://jopark.dev");
    expect(parseResumeText("Jo Park\nwww.jopark.com\n").data.basics.url).toBe("https://www.jopark.com");
  });

  it("doesn't mistake degrees, frameworks or emails for websites", () => {
    expect(parseResumeText("Jo Park\nB.Tech student | jo@gmail.com\n\nSKILLS\nNode.js, Vue.js").data.basics.url).toBe("");
  });

  it("finds profiles from labels and from more networks", () => {
    const { data } = parseResumeText(
      "Alex Morgan\nGitHub: alexmorgan | LinkedIn: alex-morgan | LeetCode: alex_m\nkaggle.com/alexm | github.com/alexmorgan|",
    );
    const got = Object.fromEntries(data.basics.profiles.map((p) => [p.network, p.username]));
    expect(got).toEqual({ GitHub: "alexmorgan", LinkedIn: "alex-morgan", LeetCode: "alex_m", Kaggle: "alexm" });
  });

  it.each([
    ["Mobile: 07911 123456", "07911123456"],
    ["Tel. 06 12 34 56 78", "0612345678"],
    ["Phone +33 6 12 34 56 78", "33612345678"],
    ["0412 345 678", "0412345678"],
  ])("reads the phone in %s", (line, digits) => {
    expect(extractPhone(line).replace(/\D/g, "")).toBe(digits);
  });

  it("doesn't read date ranges as phones", () => {
    expect(extractPhone("Engineer 2019 - 2021 and 2015 - 2019")).toBe("");
  });

  it("prefers the large-font line as the name in two-column layouts", () => {
    const text = "CONTACT\njordan@x.com\nSeattle, WA\nEDUCATION\nUniversity of Washington\nB.S., Computer Science\nJordan Chen\nFull-Stack Software Engineer\nSUMMARY\nFull-stack engineer.";
    const { data } = parseResumeText(text, { headingLines: ["Jordan Chen"] });
    expect(data.basics.name).toBe("Jordan Chen");
    expect(data.basics.label).toBe("Full-Stack Software Engineer");
    expect(data.education[0].institution).toBe("University of Washington");
  });

  it("doesn't take a 'City, ST' line as the name", () => {
    const { data } = parseResumeText("maya@x.com\nSan Francisco, CA\nMaya Patel | Dribbble: mayapatel\nSenior UX Designer");
    expect(data.basics.name).toBe("Maya Patel");
  });
});

describe("harness-found — bullet tails wrapped onto their own line", () => {
  it("joins a short tail ('SEO.') and a lowercase section word ('projects.')", () => {
    const { data } = parseResumeText(`EXPERIENCE
Marketing Manager - Acme
2020 - 2023
• Grew organic traffic 5x through content strategy and technical
SEO.
• Achieved WCAG 2.1 AA compliance on all delivered
projects.
• Managed a $1.2M paid media budget.
`);
    expect(data.work[0].highlights).toEqual([
      "Grew organic traffic 5x through content strategy and technical SEO.",
      "Achieved WCAG 2.1 AA compliance on all delivered projects.",
      "Managed a $1.2M paid media budget.",
    ]);
    expect(data.projects).toEqual([]);
  });
});

describe("harness-found — certificates in narrow columns and Word", () => {
  it("re-joins a name wrapped after a dash and reads the issuer/date line under it", () => {
    const { data } = parseResumeText(
      "CERTIFICATIONS\nAWS Certified Solutions Architect –\nAssociate\nAmazon Web Services · Sep 2022",
    );
    expect(data.certificates).toEqual([
      expect.objectContaining({
        name: "AWS Certified Solutions Architect - Associate",
        issuer: "Amazon Web Services",
        date: "2022-09",
      }),
    ]);
  });

  it("splits a level glued to the issuer", () => {
    const { data } = parseResumeText(
      "CERTIFICATIONS\nAWS Certified Solutions Architect - Associate Amazon Web Services · Sep 2022",
    );
    expect(data.certificates[0]).toMatchObject({
      name: "AWS Certified Solutions Architect - Associate",
      issuer: "Amazon Web Services",
    });
  });

  it("separates a bold Word title from the metadata after it", async () => {
    const { htmlToResumeText } = await import("@/lib/import/html-text");
    const { text } = htmlToResumeText(
      "<p><strong>Nielsen Norman Group UX Certification</strong>  Nielsen Norman Group  ·  Oct 2021</p>",
    );
    const { data } = parseResumeText(`CERTIFICATIONS\n${text}`);
    expect(data.certificates[0]).toMatchObject({
      name: "Nielsen Norman Group UX Certification",
      issuer: "Nielsen Norman Group",
      date: "2021-10",
    });
  });

  it("rebuilds a letter-spaced heading hyphenated across two lines", () => {
    expect(normalizeText("C E R T I F I C A- AWS Certified\nT I O N S")).toBe("CERTIFICATIONS\nAWS Certified");
  });
});

describe("harness-found — education without an institution keyword", () => {
  const { data } = parseResumeText(`EDUCATION
MIT | Sep 2016 - Jun 2018
M.Eng., Electrical Engineering & Computer Science
IIT Bombay | Aug 2012 - May 2016 · 9.1/10 GPA
B.Tech., Computer Science
`);

  it("splits on the second date range and keeps both institutions", () => {
    expect(data.education.map((e) => [e.institution, e.studyType, e.endDate])).toEqual([
      ["MIT", "M.Eng.", "2018-06"],
      ["IIT Bombay", "B.Tech.", "2016-05"],
    ]);
    expect(data.education[1].score).toBe("9.1/10 GPA");
  });
});

describe("harness-found — job titles and wrapped company names", () => {
  it("reads 'Senior Software Engineer' as a title, not an employer", () => {
    const { data } = parseResumeText(
      "EXPERIENCE\nSenior Software Engineer | Mar 2021 - Present · Austin, TX\nNorthwind Labs\n• Led the migration.",
    );
    expect(data.work[0]).toMatchObject({ position: "Senior Software Engineer", name: "Northwind Labs" });
  });

  it("re-attaches a company name's last word wrapped onto the next line", () => {
    const { data } = parseResumeText(
      "EXPERIENCE\nSenior Software Engineer - Northwind | Mar 2021 - Present\nLabs\n• Led the migration.",
    );
    expect(data.work[0].name).toBe("Northwind Labs");
  });
});

describe("harness-found — Word list items", () => {
  it("turns <li> into bullets, including items wrapped in <p>", async () => {
    const { htmlToResumeText } = await import("@/lib/import/html-text");
    const { text } = htmlToResumeText(
      "<h1>Jo Park</h1><ul><li>Built X</li><li><p>Led Y</p></li></ul><p>Next &amp; last</p><table><tr><td>Python</td><td>Expert</td></tr></table>",
    );
    expect(text.split("\n")).toEqual(["Jo Park", "• Built X", "• Led Y", "Next & last", "Python | Expert"]);
  });
});

describe("harness-found — sidebar layouts (category labels, keywords above names)", () => {
  it("re-joins a word hyphenated by wrapping even after a compound-like prefix", () => {
    expect(normalizeText("A/B test-\ning, Survey design")).toBe("A/B testing, Survey design");
  });

  it("reads a label line above a list as a skills category, not a section", () => {
    const { data } = parseResumeText(
      "SKILLS\nDesign tools\nFigma, Sketch, Framer\nResearch\nUser interviews, Usability testing\nOther\nDesign systems, WCAG 2.1,\nPrototyping\nEXPERIENCE\nDesigner - Acme\n2020 - 2021",
    );
    expect(data.skills.map((s) => [s.name, s.keywords])).toEqual([
      ["Design tools", ["Figma", "Sketch", "Framer"]],
      ["Research", ["User interviews", "Usability testing"]],
      ["Other", ["Design systems", "WCAG 2.1", "Prototyping"]],
    ]);
    expect(data.customSections).toEqual([]);
    expect(data.work).toHaveLength(1);
  });

  it("gives a tech list printed above a project name to that project", () => {
    const { data } = parseResumeText(
      "PROJECTS\nPython, PyTorch, statsmodels\nTimeSeries Bench\nOpen-source benchmark suite comparing 12 forecasting algorithms on 40 datasets.",
    );
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0]).toMatchObject({ name: "TimeSeries Bench", keywords: ["Python", "PyTorch", "statsmodels"] });
  });

  it("takes an entry's first line as the institution when it has no keyword", () => {
    const { data } = parseResumeText(
      "EDUCATION\nMIT\nM.Eng., Electrical Engineering\nSep 2016 - Jun 2018\nIIT Bombay\nB.Tech., Computer Science\n2012 - 2016",
    );
    expect(data.education.map((e) => e.institution)).toEqual(["MIT", "IIT Bombay"]);
  });

  it("takes the text before the degree as the institution", () => {
    const { data } = parseResumeText("EDUCATION\nNYU Stern - MBA, Product Management | 2014 - 2016");
    expect(data.education[0]).toMatchObject({ institution: "NYU Stern", studyType: "MBA" });
  });

  it("starts a new education entry at a plain institution line after a complete one", () => {
    const { data } = parseResumeText(
      "EDUCATION\nColumbia Business School\nMBA | Sep 2015 - May 2017\nNYU Stern\nB.S., Finance & Information Systems | Sep 2011 - May 2015",
    );
    expect(data.education.map((e) => [e.institution, e.studyType])).toEqual([
      ["Columbia Business School", "MBA"],
      ["NYU Stern", "B.S."],
    ]);
  });

  it("keeps a skills-type heading inside Skills as a category", () => {
    const { data } = parseResumeText(
      "SKILLS\nTools\nHubSpot, Semrush,\nSalesforce, Looker\nCompetencies\nDemand generation, Brand strategy",
    );
    expect(data.skills.map((s) => [s.name, s.keywords])).toEqual([
      ["Tools", ["HubSpot", "Semrush", "Salesforce", "Looker"]],
      ["Competencies", ["Demand generation", "Brand strategy"]],
    ]);
  });

  it("doesn't split an education entry at a wrapped field of study", () => {
    const { data } = parseResumeText(
      "EDUCATION\nMIT\nM.Eng., Electrical Engineering & Computer\nScience\nSep 2016 - Jun 2018\nIIT Bombay\nB.Tech., Computer Science\nAug 2012 - May 2016",
    );
    expect(data.education.map((e) => [e.institution, e.startDate])).toEqual([
      ["MIT", "2016-09"],
      ["IIT Bombay", "2012-08"],
    ]);
  });

  it("re-joins a skills list wrapped mid-item in a narrow column", () => {
    const { data } = parseResumeText(
      "SKILLS\nML / AI\nPyTorch, scikit-learn, XGBoost, Hugging\nFace, MLflow\nData & Cloud\nApache Spark, AWS Sage-\nMaker, Airflow",
    );
    const all = data.skills.flatMap((s) => s.keywords);
    expect(all).toEqual(expect.arrayContaining(["Hugging Face", "MLflow", "AWS SageMaker", "Airflow"]));
    expect(data.skills.map((s) => s.name)).toEqual(["ML / AI", "Data & Cloud"]);
  });

  it("keeps a company's parenthetical wrapped onto the next line", () => {
    const { data } = parseResumeText("EXPERIENCE\nMarketing Manager - Stackfire | 2021 - Present\n(SaaS)\n• Grew pipeline.");
    expect(data.work[0].name).toBe("Stackfire (SaaS)");
  });
});

describe("links behind the text (PDF annotations, Word hyperlinks)", () => {
  it("reads profiles from link targets when only the username is printed", () => {
    const { data } = parseResumeText("Alex Morgan\nalex@x.com | alexm | alex-morgan", {
      links: [
        "https://github.com/alexm",
        "https://linkedin.com/in/alex-morgan",
        "https://kaggle.com/datasets/alexm/flights",
        "https://github.com/alexm/openmetrics",
      ],
    });
    expect(data.basics.profiles.map((p) => [p.network, p.username])).toEqual([
      ["LinkedIn", "alex-morgan"],
      ["GitHub", "alexm"],
    ]);
  });

  it("uses a link only to confirm the website shown in the contact area", () => {
    const shown = parseResumeText("Jo Park\njo@x.com | jopark.dev", {
      links: ["https://openmetrics.io", "https://jopark.dev/"],
    });
    expect(shown.data.basics.url).toBe("https://jopark.dev");
    const projectOnly = parseResumeText("Jo Park\njo@x.com", { links: ["https://openmetrics.io"] });
    expect(projectOnly.data.basics.url).toBe("");
  });

  it("falls back to a mailto link for the email", () => {
    const { data } = parseResumeText("Jo Park\nEmail | LinkedIn", { links: ["mailto:jo@park.dev"] });
    expect(data.basics.email).toBe("jo@park.dev");
  });

  it("re-joins a field of study wrapped onto its own line", () => {
    const { data } = parseResumeText("EDUCATION\nMIT\nM.Eng., Electrical Engineering & Computer\nScience\n2016 - 2018");
    expect(data.education[0].area).toBe("Electrical Engineering & Computer Science");
  });
});

describe("harness-found — skills written as repeated 'Category: value' chips", () => {
  it("splits each chip into its category", () => {
    const entries = parseSkillsSection("Languages: TypeScript | Languages: Go | Tools: Docker | Tools: AWS");
    expect(entries.map((e) => [e.name, e.keywords])).toEqual([
      ["Languages", ["TypeScript", "Go"]],
      ["Tools", ["Docker", "AWS"]],
    ]);
  });
});

describe("harness-found — project descriptions and tech lists", () => {
  const { data } = parseResumeText(`PROJECTS
OpenMetrics | TypeScript, Next.js, ClickHouse
An open-source, self-hostable analytics dashboard with a privacy-first design.
• 1.2k+ GitHub stars.
Smart Attendance System
Built a face-recognition attendance system for 500 students.
Tech Stack: Python, OpenCV, Flask
`);

  it("keeps one project per header", () => {
    expect(data.projects.map((p) => p.name)).toEqual(["OpenMetrics", "Smart Attendance System"]);
  });

  it("reads tech lists as keywords and prose as the description", () => {
    expect(data.projects[0].keywords).toEqual(["TypeScript", "Next.js", "ClickHouse"]);
    expect(data.projects[0].description).toMatch(/^An open-source/);
    expect(data.projects[0].highlights).toEqual(["1.2k+ GitHub stars."]);
    expect(data.projects[1].description).toMatch(/^Built a face-recognition/);
    expect(data.projects[1].keywords).toEqual(["Python", "OpenCV", "Flask"]);
  });
});
