import { describe, expect, it } from "vitest";

import { parseResumeText } from "./index";
import { isKnownCity } from "./lexicon";

/**
 * Step 5 of the parser hardening: reference lists (cities, certificate
 * issuers), the "never lose content" net, and review notes for the fields the
 * parser is least sure about.
 */

const parse = (text: string) => parseResumeText(text);
const extra = (text: string) =>
  parse(text).data.customSections?.find((s) => s.title === "Additional Information")?.items.map((i) => i.name) ?? [];

describe("known cities", () => {
  it("matches a whole capitalised field only", () => {
    expect(isKnownCity("Bengaluru")).toBe(true);
    expect(isKnownCity("San Francisco")).toBe(true);
    expect(isKnownCity("bengaluru")).toBe(false);
    expect(isKnownCity("Bengaluru office")).toBe(false);
    // Common words and first names are deliberately not cities.
    expect(isKnownCity("Reading")).toBe(false);
    expect(isKnownCity("Austin")).toBe(false);
  });

  it("reads a city field in a job header as its location, not the employer", () => {
    const [job] = parse("Sam Lee\nsam@lee.dev\n\nEXPERIENCE\nProduct Designer\nCred | Bengaluru | 2022 - Present\n• Redesigned rewards.").data.work;
    expect([job.name, job.location]).toEqual(["Cred", "Bengaluru"]);
  });

  it("reads a trailing city after the employer", () => {
    const [job] = parse("Sam Lee\nsam@lee.dev\n\nEXPERIENCE\nSoftware Engineer, Stripe, Seattle | 2020 - 2022\n• Built payouts.").data.work;
    expect([job.position, job.name, job.location]).toEqual(["Software Engineer", "Stripe", "Seattle"]);
  });

  it("reads a city from the contact line", () => {
    const { data } = parse("Sam Lee\nsam@lee.dev | Hyderabad | +91 98765 43210\n\nSKILLS\nGo");
    expect(data.basics.location.city).toBe("Hyderabad");
  });

  it("keeps an employer that contains a city name", () => {
    const [job] = parse("Sam Lee\nsam@lee.dev\n\nEXPERIENCE\nConsultant | Boston Consulting Group | 2019 - 2021\n• Ran pricing studies.").data.work;
    expect(job.name).toBe("Boston Consulting Group");
    expect(job.location).toBe("");
  });
});

describe("certificate issuers from the name", () => {
  const issuers = (lines: string) =>
    parse(`Sam Lee\nsam@lee.dev\n\nCERTIFICATIONS\n${lines}`).data.certificates.map((c) => c.issuer);

  it("knows the common certification bodies", () => {
    expect(
      issuers(
        "Certified Kubernetes Administrator (CKA)\nCertified ScrumMaster (CSM)\nCISSP\nTableau Desktop Specialist\nMeta Front-End Developer",
      ),
    ).toEqual(["The Linux Foundation", "Scrum Alliance", "ISC2", "Tableau", "Meta"]);
  });

  it("prefers a written-out issuer over an inferred one", () => {
    expect(issuers("Certified Kubernetes Administrator | CNCF | 2023")).toEqual(["CNCF"]);
  });
});

describe("never lose content", () => {
  it("keeps a header line no field took", () => {
    expect(extra("Sam Lee\nsam@lee.dev\nOpen to relocation and visa sponsorship not required\n\nSKILLS\nGo, Rust")).toEqual([
      "Open to relocation and visa sponsorship not required",
    ]);
  });

  it("keeps nothing extra when every line was used", () => {
    const text = `Sam Lee
Backend Engineer
sam@lee.dev | +1 415 555 0134 | linkedin.com/in/samlee

EXPERIENCE
Backend Engineer, Stripe | Mar 2020 - Present | Remote
• Built the payouts ledger in Go.

EDUCATION
University of Michigan
B.S. in Computer Science | 2014 - 2018

SKILLS
Languages: Go, Rust, Python`;
    expect(extra(text)).toEqual([]);
  });

  it("does not resurrect sections dropped on purpose", () => {
    expect(
      extra("Sam Lee\nsam@lee.dev\n\nSKILLS\nGo\n\nDECLARATION\nI hereby declare that the above information is true."),
    ).toEqual([]);
  });

  it("ignores dates and durations when judging a line", () => {
    expect(
      extra("Sam Lee\nsam@lee.dev\n\nEXPERIENCE\nAcme Corp\nEngineer\nMarch 2020 - Present (2 years 3 months)\n• Built billing."),
    ).toEqual([]);
  });
});

describe("review notes", () => {
  const notes = (text: string) => parse(text).review?.map((n) => n.message) ?? [];

  it("names the missing parts of an entry", () => {
    const messages = notes("Sam Lee\nsam@lee.dev\n\nEXPERIENCE\nBackend Engineer\n• Built the payouts ledger in Go.");
    expect(messages).toContain("Backend Engineer: employer, dates not found.");
  });

  it("asks about a title/company split that was a guess", () => {
    const messages = notes("Sam Lee\nsam@lee.dev\n\nEXPERIENCE\nHooli, Moonshots | 2016 - 2018\n• Prototyped three hardware concepts.");
    expect(messages.some((m) => /swapped/.test(m))).toBe(true);
  });

  it("does not ask when the split had evidence", () => {
    const messages = notes("Sam Lee\nsam@lee.dev\n\nEXPERIENCE\nBackend Engineer, Stripe | 2016 - 2018\n• Built payouts.");
    expect(messages.some((m) => /swapped/.test(m))).toBe(false);
  });

  it("reports missing contact details and leftovers", () => {
    const messages = notes("Sam Lee\nOpen to relocation and visa sponsorship not required\n\nSKILLS\nGo");
    expect(messages).toContain("No email or phone number was found.");
    expect(messages.some((m) => /1 line didn't match any field/.test(m))).toBe(true);
  });

  it("stays quiet for a clean résumé", () => {
    const messages = notes(`Sam Lee
sam@lee.dev

EXPERIENCE
Backend Engineer, Stripe | Mar 2020 - Present
• Built the payouts ledger.

EDUCATION
University of Michigan
B.S. in Computer Science | 2014 - 2018`);
    expect(messages).toEqual([]);
  });
});
