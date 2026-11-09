import { describe, expect, it } from "vitest";

import { parseResumeText } from "./index";
import { isLocationLine } from "./lexicon";
import { normalizeText } from "./normalize";
import { detectSectionsDetailed } from "./sections";

/**
 * Step 3 of the parser hardening: date-anchored job segmentation, layout
 * learning (date-first vs date-last, title/company order, grouped roles),
 * day-first dates, page furniture, places, and field-level clean-ups.
 * Inputs are deliberately different from the hand-built corpus in
 * eval/fixtures.ts, so these pin the mechanisms rather than the corpus.
 */

const work = (text: string) => parseResumeText(`Sam Lee\nsam@lee.dev\n\nEXPERIENCE\n${text}`).data.work;
const education = (text: string) => parseResumeText(`Sam Lee\nsam@lee.dev\n\nEDUCATION\n${text}`).data.education;
const certs = (text: string) => parseResumeText(`Sam Lee\nsam@lee.dev\n\nCERTIFICATIONS\n${text}`).data.certificates;

describe("day-first dates are inferred per document", () => {
  it("reads every full date day-first once one date proves it", () => {
    const [job] = work("12/04/2019 - 30/06/2021\nAnalyst - Deloitte\n• Built models.");
    expect(job.startDate).toBe("2019-04");
    expect(job.endDate).toBe("2021-06");
  });

  it("keeps US month-first dates when a date proves that instead", () => {
    const [job] = work("04/12/2019 - 06/30/2021\nAnalyst - Deloitte\n• Built models.");
    expect(job.startDate).toBe("2019-04");
    expect(job.endDate).toBe("2021-06");
  });

  it("leaves ambiguous dates on the month-first reading", () => {
    expect(normalizeText("01/03/2020 - Present")).toBe("01/03/2020 - Present");
  });

  it("rewrites day-first dates to an unambiguous month/year", () => {
    expect(normalizeText("15/09/2017 - 01/03/2020")).toBe("09/2017 - 03/2020");
  });
});

describe("page furniture is removed", () => {
  it("drops 'Page N of M' and bare 'Page N' lines", () => {
    const out = normalizeText("Education\nPage 1 of 2\nStanford University\nPage 2\nB.S. Physics");
    expect(out).not.toMatch(/page/i);
    expect(out).toContain("Stanford University\nB.S. Physics");
  });

  it("keeps prose that mentions a page", () => {
    expect(normalizeText("Built a landing page of 12 sections")).toContain("landing page");
  });
});

describe("jobs are split at their date ranges", () => {
  it("handles date-first layouts: the lines under a date belong to it", () => {
    const jobs = work(`2021 - Present
Staff Engineer, Datadog
• Scaled the metrics intake tier.
2018 - 2021
Software Engineer, Twilio
• Shipped the SMS routing rewrite.`);
    expect(jobs.map((j) => [j.position, j.name, j.startDate, j.endDate])).toEqual([
      ["Staff Engineer", "Datadog", "2021", ""],
      ["Software Engineer", "Twilio", "2018", "2021"],
    ]);
  });

  it("handles date-last layouts: the lines above a date belong to it", () => {
    const jobs = work(`Staff Engineer, Datadog
2021 - Present
• Scaled the metrics intake tier.
Software Engineer, Twilio
2018 - 2021
• Shipped the SMS routing rewrite.`);
    expect(jobs.map((j) => [j.position, j.name, j.startDate])).toEqual([
      ["Staff Engineer", "Datadog", "2021"],
      ["Software Engineer", "Twilio", "2018"],
    ]);
  });

  it("splits two headers that run together with no bullets between them", () => {
    const jobs = work(`Engineer, Stripe | 2020 - Present
Engineer, Square | 2018 - 2020
• Built the card reader firmware updater.`);
    expect(jobs.map((j) => j.name)).toEqual(["Stripe", "Square"]);
    expect(jobs[1].highlights).toEqual(["Built the card reader firmware updater."]);
  });
});

describe("roles grouped under one employer inherit it", () => {
  it("gives later roles the employer line above them", () => {
    const jobs = work(`Google
Senior Engineer
Jan 2020 - Present
• Led the Ads latency effort.
Engineer
Jan 2018 - Dec 2019
• Built the bidding simulator.
Meta
Engineer
2016 - 2018
• Shipped News Feed ranking experiments.`);
    expect(jobs.map((j) => [j.position, j.name])).toEqual([
      ["Senior Engineer", "Google"],
      ["Engineer", "Google"],
      ["Engineer", "Meta"],
    ]);
  });

  it("does not invent an employer when the role above named its own", () => {
    const jobs = work(`Engineer, Acme | 2019 - 2021
• Built the billing service.
Freelance Developer | 2017 - 2019
• Delivered 12 client sites.`);
    expect(jobs[1].position).toBe("Freelance Developer");
    expect(jobs[1].name).toBe("");
  });
});

describe("layout details", () => {
  it("strips LinkedIn durations next to the dates", () => {
    const [job] = work("Acme Corp\nProduct Manager\nMarch 2020 - Present (2 years 3 months)\n• Grew activation 20%.");
    expect([job.name, job.position, job.startDate, job.summary]).toEqual(["Acme Corp", "Product Manager", "2020-03", ""]);
  });

  it("treats a single date as a role that started and ended then", () => {
    const [job] = work("Research Intern, CERN, Geneva, Switzerland (Summer 2016)\n• Calibrated detector timing.");
    expect([job.startDate, job.endDate]).toEqual(["2016-06", "2016-06"]);
    expect(job.location).toBe("Geneva, Switzerland");
    expect(job.name).toBe("CERN");
  });

  it("follows the résumé's own company-first order for an ambiguous pair", () => {
    const jobs = work(`Acme Technologies, Senior Engineer | 2020 - Present
• Built the payments ledger.
Globex Solutions, Engineer | 2018 - 2020
• Migrated 40 services to Kubernetes.
Hooli, Moonshots | 2016 - 2018
• Prototyped three hardware concepts.`);
    expect(jobs[2].name).toBe("Hooli");
    expect(jobs[2].position).toBe("Moonshots");
  });
});

describe("places", () => {
  it("finds a place after a company name and keeps its country", () => {
    const [job] = work("Data Analyst - Siemens AG, Munich, Germany | 2019 - 2021\n• Built a demand forecast.");
    expect(job.name).toBe("Siemens AG");
    expect(job.location).toBe("Munich, Germany");
  });

  it("keeps a trailing country after a state", () => {
    const [job] = work("Analyst, Infosys\n2019 - 2021\nPune, Maharashtra, India\n• Automated reconciliation.");
    expect(job.location).toBe("Pune, Maharashtra, India");
    expect(job.name).toBe("Infosys");
  });

  it("never runs a city across a line break", () => {
    const { data } = parseResumeText("Asha Rao\nData Analyst\nPune, Maharashtra\nasha@rao.in");
    expect(data.basics.location.city).toBe("Pune");
  });

  it("recognises three-part place lines", () => {
    expect(isLocationLine("Bengaluru, Karnataka, India")).toBe(true);
    expect(isLocationLine("Designer, Acme Corp")).toBe(false);
  });

  it("keeps a sidebar name's headline and place in the header", () => {
    const { sections } = detectSectionsDetailed(
      normalizeText("Contact\nasha@rao.in\nCertifications\nTableau Desktop Specialist\nAsha Rao\nData Analyst at Swiggy\nPune, Maharashtra, India\nSummary\nAnalyst."),
      { headingLines: ["Asha Rao"] },
    );
    expect(sections.header).toContain("Pune, Maharashtra, India");
    expect(sections.certifications).not.toContain("Pune");
  });
});

describe("education fields", () => {
  it("separates field and institution on one comma line", () => {
    const [e] = education("M.A. Economics, Jawaharlal Nehru University, 2018");
    expect([e.studyType, e.area, e.institution, e.endDate]).toEqual(["M.A.", "Economics", "Jawaharlal Nehru University", "2018"]);
  });

  it("drops a trailing country but keeps a city in the name", () => {
    const [de] = education("B.Sc. in Chemistry - Universität Heidelberg, Germany, 2016");
    expect(de.institution).toBe("Universität Heidelberg");
    const [inCity] = education("Ph.D. in Biology, Indian Institute of Science, Bengaluru, 2020");
    expect(inCity.institution).toBe("Indian Institute of Science, Bengaluru");
  });

  it("drops a place set apart from the institution", () => {
    const [e] = education("Stanford University | Stanford, CA\nB.S. in Physics | 2012 - 2016");
    expect(e.institution).toBe("Stanford University");
    expect(e.area).toBe("Physics");
  });

  it("reads LinkedIn's repeated abbreviation and keeps the field", () => {
    const [e] = education("University of Michigan\nMaster of Science - MS, Data Science · (2019 - 2021)");
    expect([e.studyType, e.area, e.startDate, e.endDate]).toEqual(["Master of Science", "Data Science", "2019", "2021"]);
  });

  it("keeps a field that only repeats the degree", () => {
    const [e] = education("Columbia Business School\nMBA in MBA | 2015 - 2017");
    expect(e.area).toBe("MBA");
  });

  it("keeps a degree's own abbreviation and drops a repeat after the field", () => {
    const [arch] = education("Bachelor of Architecture (B.Arch)\nCEPT University | 2014 - 2019");
    expect(arch.studyType).toBe("Bachelor of Architecture (B.Arch)");
    const [bio] = education("Bachelor of Science in Biology (BS) | 2015\nUniversity of Florida");
    expect(bio.area).toBe("Biology");
  });

  it("allows a comma inside the field", () => {
    const [e] = education("Bachelor of Arts in History, Minor in French | 2010 - 2014\nBoston College");
    expect(e.area).toBe("History, Minor in French");
  });
});

describe("certificate fields", () => {
  it("reads an issuer after a comma when it is an organisation", () => {
    const [c] = certs("CPR Certification, American Red Cross | 2022");
    expect([c.name, c.issuer, c.date]).toEqual(["CPR Certification", "American Red Cross", "2022"]);
  });

  it("does not split a name at a comma without an organisation", () => {
    const [c] = certs("Six Sigma Green Belt, Lean Methods");
    expect(c.name).toBe("Six Sigma Green Belt, Lean Methods");
  });

  it("leaves no empty brackets after a parenthesised year", () => {
    const [c] = certs("Azure Fundamentals (2021)");
    expect([c.name, c.issuer, c.date]).toEqual(["Azure Fundamentals", "Microsoft", "2021"]);
  });

  it("keeps a level after a dash in the name", () => {
    const [c] = certs("AWS Certified Machine Learning - Specialty (2023)");
    expect([c.name, c.issuer]).toEqual(["AWS Certified Machine Learning - Specialty", "Amazon Web Services"]);
  });
});

describe("headline under the name", () => {
  const label = (header: string) => parseResumeText(`${header}\n\nSKILLS\nPython`).data.basics.label;

  it("takes the role field from a packed contact line", () => {
    expect(label("Jane Doe\nData Scientist | jane@doe.io | 555-123-4567")).toBe("Data Scientist");
  });

  it("skips a degree field", () => {
    expect(label("Arjun Mehta\nM.Tech (AI) | Graduate Researcher\narjun@iitb.ac.in")).toBe("Graduate Researcher");
  });

  it("keeps only the role from a long affiliation line", () => {
    expect(label("Wei Chen\nAssistant Professor, School of Computing, National University of Singapore\nwei@nus.edu.sg")).toBe(
      "Assistant Professor",
    );
  });
});

describe("section vocabulary", () => {
  const sec = (heading: string) => detectSectionsDetailed(normalizeText(`Jane Doe\nEDUCATION\nMIT\n${heading}\nAlpha, Beta`));

  it("keeps Research Interests as its own section, apart from Publications", () => {
    const { sections, titles } = sec("RESEARCH INTERESTS");
    const key = Object.keys(titles).find((k) => titles[k] === "Research Interests");
    expect(key).toMatch(/^other:/);
    expect(sections.publications).toBeUndefined();
  });

  it.each(["Top Skills", "Digital skills"])("reads %s as skills", (heading) => {
    expect(sec(heading).sections.skills).toContain("Alpha, Beta");
  });
});
