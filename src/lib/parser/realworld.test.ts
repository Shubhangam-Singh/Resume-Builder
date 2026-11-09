import { describe, expect, it } from "vitest";

import { parseResumeText } from "./index";
import { normalizeText, normalizeTextDetailed } from "./normalize";
import { parseSkillsSection } from "./skills";

/**
 * A real student résumé (Word → PDF) imported badly, reproduced here with
 * invented details. Each block is one thing that went wrong, as the user saw
 * it in the imported résumé.
 */

const CONT = String.fromCharCode(0x2063); // the PDF extractor's wrapped-bullet mark

const RESUME = `ASHA VERMA
Prayagraj, UP | +91 98765 43210 | asha.verma@example.com | GitHub | Portfolio
PROFESSIONAL SUMMARY
Final year Computer Science undergraduate seeking a Software Engineering internship.
EDUCATION
B.Tech, Computer Science & Engineering — VIT Vellore | 2023 - 2027
CGPA: 9.02 / 10
Class XII — St. Mary's Convent, Prayagraj (CBSE), 2023: 93% | Class X — Boys' High School & College, Prayagraj (ICSE), 2021: 95%
INTERNSHIP EXPERIENCE
Software Engineering Intern — Northwind Technologies, Bengaluru (On-site) | May 2026 - Jul 2026
▪ Built the candidate management module in ASP.NET Core and React.
PROJECTS
ColdChain (PPSC) — Perishable Predictor Smart Cart · ESP32, C++, IoT, WiFi | 2026 - Present
▪ IoT device for real-time food freshness prediction. Live: cold-chain.vercel.app
InsightCrew — Multi-Agent Data Analysis System · Python, LangGraph, LLM APIs | 2026
▪ Achieved 90% accuracy on a 10-question benchmark; an ablation measured a +10 point contribution.
${CONT}Sandboxed LLM-generated code via subprocess isolation and a stripped environment.
Personal Portfolio Website · React.js, JavaScript (Live: ashaverma.dev) | 2026
TECHNICAL SKILLS
Web & Cloud: React.js, Next.js 14, ASP.NET Core, Firebase, AWS (EC2, S3)
AI & Data: LLM API integration, pandas
ACHIEVEMENTS & COMPETITIONS
▪ Flipkart GRID 7.0 — Semi-Finalist (top 5% of 300,000+ participants)
▪ JEE Mains 2023 — 98.43 Percentile | KVPY SA 2022 — AIR 731 | Qualified: PRMO (2019,
2021), NSEJS (2019)`;

const LINKS = ["https://github.com/asha-verma", "https://ashaverma.dev/"];
const { data } = parseResumeText(RESUME, { links: LINKS });

describe("contact block", () => {
  it("reads the city from its own line, never across the name above it", () => {
    expect(data.basics.location.city).toBe("Prayagraj");
    expect(data.basics.location.region).toBe("UP");
  });

  it("takes GitHub from the link, not the next field of the line", () => {
    expect(data.basics.profiles.map((p) => `${p.network}:${p.username}`)).toEqual(["GitHub:asha-verma"]);
  });

  it("reads the website from the link behind “Portfolio”", () => {
    expect(data.basics.url).toBe("https://ashaverma.dev");
  });

  it("never makes a link label a handle", () => {
    const { data: d } = parseResumeText("Asha Verma\nasha@example.com | GitHub | Portfolio\n\nSKILLS\nGo");
    expect(d.basics.profiles).toEqual([]);
  });
});

describe("experience", () => {
  it("keeps the city with the work arrangement and the employer clean", () => {
    const [job] = data.work;
    expect([job.position, job.name, job.location]).toEqual([
      "Software Engineering Intern",
      "Northwind Technologies",
      "Bengaluru (On-site)",
    ]);
  });
});

describe("education", () => {
  it("splits two school qualifications packed on one line", () => {
    expect(data.education.map((e) => [e.studyType, e.institution, e.endDate, e.score])).toEqual([
      ["B.Tech", "VIT Vellore", "2027", "CGPA: 9.02 / 10"],
      ["Class XII (CBSE)", "St. Mary's Convent, Prayagraj", "2023", "93%"],
      ["Class X (ICSE)", "Boys' High School & College, Prayagraj", "2021", "95%"],
    ]);
    expect(data.education[0].area).toBe("Computer Science & Engineering");
  });
});

describe("projects", () => {
  const byName = (name: string) => data.projects.find((p) => p.name === name)!;

  it("separates tagline, tech list and dates, keeping the dates", () => {
    const p = byName("ColdChain (PPSC)");
    expect(p.description).toBe("Perishable Predictor Smart Cart · 2026 - Present");
    expect(p.keywords).toEqual(["ESP32", "C++", "IoT", "WiFi"]);
  });

  it("takes the project link from a “Live:” mention in its bullets", () => {
    expect(byName("ColdChain (PPSC)").url).toBe("https://cold-chain.vercel.app");
  });

  it("reads a header with a labelled link in brackets", () => {
    const p = byName("Personal Portfolio Website");
    expect([p.url, p.description]).toEqual(["https://ashaverma.dev", "2026"]);
    expect(p.keywords).toEqual(["React.js", "JavaScript"]);
  });

  it("keeps a bullet's wrapped line in the bullet, even when it starts a sentence", () => {
    expect(byName("InsightCrew").highlights).toEqual([
      "Achieved 90% accuracy on a 10-question benchmark; an ablation measured a +10 point contribution. Sandboxed LLM-generated code via subprocess isolation and a stripped environment.",
    ]);
  });
});

describe("skills", () => {
  it("keeps the user's spelling and bracketed lists", () => {
    const web = data.skills.find((s) => s.name === "Web & Cloud")!;
    expect(web.keywords).toEqual(["React.js", "Next.js 14", "ASP.NET Core", "Firebase", "AWS (EC2, S3)"]);
    expect(data.skills.find((s) => s.name === "AI & Data")!.keywords).toEqual(["LLM API integration", "pandas"]);
  });

  it("still drops duplicates that are the same skill", () => {
    expect(parseSkillsSection("Frontend: React, React.js, reactjs")[0].keywords).toEqual(["React"]);
  });
});

describe("custom sections", () => {
  it("keeps a wrapped achievement whole, with no date taken out of it", () => {
    const s = data.customSections?.find((c) => c.title === "Achievements & Competitions");
    expect(s?.items.map((i) => [i.name, i.date])).toEqual([
      ["Flipkart GRID 7.0 - Semi-Finalist (top 5% of 300,000+ participants)", ""],
      ["JEE Mains 2023 - 98.43 Percentile | KVPY SA 2022 - AIR 731 | Qualified: PRMO (2019, 2021), NSEJS (2019)", ""],
    ]);
  });
});

describe("section headings", () => {
  it("keeps the résumé's own wording for built-in sections", () => {
    expect(data.meta.sectionTitles).toEqual({
      summary: "Professional Summary",
      work: "Internship Experience",
      skills: "Technical Skills",
    });
  });
});

describe("normalization", () => {
  it("joins a wrapped bullet line marked by the PDF extractor", () => {
    expect(normalizeText(`• Built the offline WiFi dash-\n${CONT}board and SD logging.`)).toBe(
      "• Built the offline WiFi dashboard and SD logging.",
    );
  });

  it("restores word breaks in letter-spaced headings", () => {
    const { text, spacedHeadings } = normalizeTextDetailed("O P E N S O U R C E\nW O R K E X P E R I E N C E\nJ O H N D O E");
    expect(text.split("\n")).toEqual(["OPEN SOURCE", "WORK EXPERIENCE", "JOHNDOE"]);
    expect(spacedHeadings).toEqual(["OPEN SOURCE", "WORK EXPERIENCE", "JOHNDOE"]);
  });
});
