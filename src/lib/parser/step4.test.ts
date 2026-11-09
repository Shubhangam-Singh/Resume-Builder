import { describe, expect, it } from "vitest";

import { parseCustomItems } from "./entries";
import { parseResumeText } from "./index";
import { normalizeText } from "./normalize";
import { detectSectionsDetailed, type LineStyleHint } from "./sections";

/**
 * Heading-style learning: a heading the vocabulary doesn't know is still a
 * heading when the document sets it exactly like the headings it does know.
 */

const style = (text: string, size: number, bold = true): LineStyleHint => ({ text, size, bold });
const titlesOf = (text: string, lineStyles?: LineStyleHint[]) =>
  Object.values(detectSectionsDetailed(normalizeText(text), { lineStyles }).titles);

const DOC = `Jane Doe
EXPERIENCE
Engineer, Stripe | 2020 - Present
• Built payouts.
EDUCATION
MIT | 2014 - 2018
OPEN SOURCE
Apache Airflow | 2023
SPEAKING
PyCon India | 2022`;

describe("heading-style learning", () => {
  it("opens a section at an unknown heading set like the known ones", () => {
    const titles = titlesOf(DOC, [
      style("EXPERIENCE", 1.2),
      style("EDUCATION", 1.2),
      style("OPEN SOURCE", 1.2),
      style("SPEAKING", 1.2),
      style("Engineer, Stripe | 2020 - Present", 1, false),
    ]);
    expect(titles).toEqual(expect.arrayContaining(["Open Source", "Speaking"]));
  });

  it("ignores an unknown line set differently from the known headings", () => {
    const titles = titlesOf(DOC, [
      style("EXPERIENCE", 1.2),
      style("EDUCATION", 1.2),
      style("OPEN SOURCE", 1),
      style("SPEAKING", 1),
    ]);
    expect(titles).not.toContain("Open Source");
  });

  it("learns one style per column in a two-column layout", () => {
    const titles = titlesOf(`Jane Doe
SKILLS
Go, Rust
EDUCATION
MIT | 2014 - 2018
EXPERIENCE
Engineer, Stripe | 2020 - Present
PROJECTS
Ledger | 2021
OPEN SOURCE
Apache Airflow | 2023`, [
      style("SKILLS", 1),
      style("EDUCATION", 1),
      style("EXPERIENCE", 1.2),
      style("PROJECTS", 1.2),
      style("OPEN SOURCE", 1.2),
    ]);
    expect(titles).toContain("Open Source");
  });

  it("never treats bold mixed-case text at body size as a heading style", () => {
    const titles = titlesOf(`Jane Doe
Experience
Stripe
Engineer | 2020 - Present
Education
Harvard
Open Source
Apache Airflow | 2023`, [
      style("Experience", 1),
      style("Education", 1),
      style("Stripe", 1),
      style("Harvard", 1),
      style("Open Source", 1),
    ]);
    expect(titles).not.toContain("Open Source");
    expect(titles).not.toContain("Stripe");
  });

  it("switches off when too many other lines share the heading style", () => {
    // Employers set in the same bold caps as the headings.
    const titles = titlesOf(`Jane Doe
EXPERIENCE
STRIPE
Engineer | 2020 - Present
SQUARE
Engineer | 2018 - 2020
PAYPAL
Engineer | 2016 - 2018
EDUCATION
HARVARD`, [
      style("EXPERIENCE", 1),
      style("EDUCATION", 1),
      style("STRIPE", 1),
      style("SQUARE", 1),
      style("PAYPAL", 1),
      style("HARVARD", 1),
    ]);
    expect(titles).toEqual(["Experience", "Education"]);
  });

  it("treats letter-spacing as a heading style (headings set in a margin)", () => {
    const { data } = parseResumeText(`Jane Doe
jane@doe.dev
S U M M A R Y | Backend engineer with six years of payments experience.
E X P E R I E N C E | Engineer, Stripe | 2020 - Present
• Built payouts.
E D U C A T I O N | MIT | 2014 - 2018
O P E N  S O U R C E | Apache Airflow | 2023`);
    expect(data.customSections?.map((s) => s.title)).toEqual(["Open Source"]);
    expect(data.customSections?.[0].items.map((i) => i.name)).toEqual(["Apache Airflow"]);
    expect(data.education[0].institution).toBe("MIT");
  });

  it("learns plain text headings from the blank lines around them", () => {
    const { data } = parseResumeText(`JANE DOE
jane@doe.dev

EXPERIENCE

Engineer, Stripe | 2020 - Present
- Built payouts.

EDUCATION

MIT
B.S. in Physics | 2014 - 2018

OPEN SOURCE

Apache Airflow | 2023
Contributed the pod retry fix used by thousands of teams
`);
    expect(data.customSections?.map((s) => s.title)).toEqual(["Open Source"]);
    expect(data.education[0].institution).toBe("MIT");
  });
});

describe("custom section items", () => {
  it("groups a title line with its own date and description lines", () => {
    const items = parseCustomItems("Apache Airflow\n2023\nContributed the pod retry fix used by thousands\nPandas | 2022\nFixed timezone handling in read_csv");
    expect(items.map((i) => [i.name, i.date, i.description])).toEqual([
      ["Apache Airflow", "2023", "Contributed the pod retry fix used by thousands"],
      ["Pandas", "2022", "Fixed timezone handling in read_csv"],
    ]);
  });

  it("keeps one-line items separate", () => {
    expect(parseCustomItems("Cricket\nReading\nChess").map((i) => i.name)).toEqual(["Cricket", "Reading", "Chess"]);
    expect(
      parseCustomItems("Won the Smart India Hackathon 2023.\nSolved 400+ problems on LeetCode.").length,
    ).toBe(2);
    expect(
      parseCustomItems("INSPIRE Fellowship, DST, 2014\nBest Thesis Award, IISc, 2020").map((i) => i.date),
    ).toEqual(["2014", "2020"]);
  });
});
