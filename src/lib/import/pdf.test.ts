import { describe, expect, it } from "vitest";

import { extractPagesFromDocument, itemsToPageText, type PdfTextItem } from "./pdf";

/** Build a glyph run: transform = [size, 0, 0, size, x, y]. */
function run(str: string, x: number, y: number, width: number, size = 10): PdfTextItem {
  return { str, transform: [size, 0, 0, size, x, y], width };
}

describe("itemsToPageText — single column", () => {
  it("emits rows top-to-bottom and joins word gaps with spaces", () => {
    const items = [
      run("Alex", 50, 700, 30),
      run("Morgan", 90, 700, 45), // gap > threshold → space
      run("Engineer", 50, 680, 60),
      run("alex@example.com", 50, 660, 110),
    ];
    const { text } = itemsToPageText(items);
    expect(text.split("\n")).toEqual([
      "Alex Morgan",
      "Engineer",
      "alex@example.com",
    ]);
  });

  it("does not split tightly-kerned glyphs", () => {
    const items = [run("al", 50, 700, 12), run("ex@x.com", 62.5, 700, 50)];
    const { text } = itemsToPageText(items);
    expect(text).toBe("alex@x.com");
  });
});

describe("itemsToPageText — two-column sidebar layout", () => {
  // Full-width name header, then a left sidebar (contact/skills) beside the
  // main column (experience). Naive y-order extraction would interleave them.
  const leftX = 40;
  const leftW = 180;
  const rightX = 320;
  const rightW = 220;

  const left = ["CONTACT", "alex@x.com", "+1 555 000", "SKILLS", "Python", "Java", "SQL", "Git"];
  const right = [
    "EXPERIENCE",
    "Engineer - Acme Corp",
    "Jan 2020 - Present",
    "Did impactful things",
    "EDUCATION",
    "State University",
    "B.S. Computer Science",
    "2014 - 2018",
  ];

  const items: PdfTextItem[] = [
    run("ALEX MORGAN", 50, 760, 400, 22), // spans both columns
    ...left.map((s, i) => run(s, leftX, 720 - i * 20, leftW)),
    ...right.map((s, i) => run(s, rightX, 720 - i * 20, rightW)),
  ];

  const { text, headingLines } = itemsToPageText(items);
  const lines = text.split("\n");

  it("emits the full-width header first", () => {
    expect(lines[0]).toBe("ALEX MORGAN");
  });

  it("emits the whole left column before the right column", () => {
    const lastLeft = lines.indexOf("Git");
    const firstRight = lines.indexOf("EXPERIENCE");
    expect(lastLeft).toBeGreaterThan(0);
    expect(firstRight).toBeGreaterThan(lastLeft);
    // Column contents stay contiguous and ordered.
    expect(lines.slice(1, 9)).toEqual(left);
    expect(lines.slice(9)).toEqual(right);
  });

  it("reports large-font lines as heading hints", () => {
    expect(headingLines).toContain("ALEX MORGAN");
    expect(headingLines).not.toContain("Python");
  });
});

describe("itemsToPageText — two columns whose baselines don't line up", () => {
  // Real sidebar layouts use different font sizes / line heights per column,
  // so almost no row has text on both sides at the same y.
  const left = ["CONTACT", "jo@x.com", "Seattle, WA", "SKILLS", "Python", "Java", "SQL", "Git", "Docker", "AWS"];
  const right = [
    "EXPERIENCE",
    "Engineer - Acme Corp",
    "Jan 2020 - Present",
    "Shipped the billing service",
    "Cut latency by 40 percent",
    "EDUCATION",
    "State University",
    "B.S. Computer Science",
  ];
  const items: PdfTextItem[] = [
    run("JO PARK", 50, 780, 300, 22),
    ...left.map((s, i) => run(s, 40, 730 - i * 14, 150, 9)),
    ...right.map((s, i) => run(s, 300, 735 - i * 17, 250, 11)),
  ];
  const lines = itemsToPageText(items).text.split("\n");

  it("still emits each column contiguously", () => {
    expect(lines.slice(1, 1 + left.length)).toEqual(left);
    expect(lines.slice(1 + left.length)).toEqual(right);
  });
});

describe("itemsToPageText — one column with right-aligned dates", () => {
  // A certificates-style page: every row is "title ........ year". The years
  // share a left edge, but they're metadata, not a second column.
  const items: PdfTextItem[] = [];
  for (let i = 0; i < 10; i++) {
    items.push(run(`Certificate number ${i + 1} in cloud computing`, 50, 700 - i * 16, 220));
    items.push(run(`20${10 + i}`, 520, 700 - i * 16, 22));
  }
  const lines = itemsToPageText(items).text.split("\n");

  it("keeps each date on its own row", () => {
    expect(lines).toHaveLength(10);
    expect(lines[0]).toBe("Certificate number 1 in cloud computing | 2010");
  });
});

describe("itemsToPageText — one column with a contact block and dates on the right", () => {
  // Executive-style: name left with contact lines stacked on the right, then
  // full-width text, then job titles whose dates sit a little lower on the
  // right. Nothing here is a second column.
  const items: PdfTextItem[] = [
    run("Jordan Chen", 50, 760, 160, 22),
    ...["jordan@x.com", "+1 415 555 0192", "Seattle, WA", "jordan.dev", "GitHub: jordan", "LinkedIn: jordan"].map(
      (s, i) => run(s, 420, 770 - i * 12, 110, 9),
    ),
    run("Full-stack engineer with five years shipping production software and APIs.", 50, 680, 480),
    run("Senior Engineer - Verdigris Systems", 50, 650, 200),
    run("Jul 2021 - Present · Seattle, WA", 400, 645, 140, 9),
    run("Re-architected the ingestion pipeline, reducing P99 latency by an order of magnitude.", 50, 630, 480),
    run("Software Engineer - Cascade Digital", 50, 600, 200),
    run("Sep 2018 - Jun 2021 · Remote", 420, 595, 120, 9),
    run("Built a real-time collaboration feature used by thirty thousand active users.", 50, 580, 470),
    // A skills block of short lines: lots of rows that cross nothing.
    ...Array.from({ length: 15 }, (_, i) => run(`Skill group ${i + 1}`, 50, 560 - i * 14, 90)),
  ];
  const lines = itemsToPageText(items).text.split("\n");

  it("keeps each date right after its job title", () => {
    expect(lines.indexOf("Sep 2018 - Jun 2021 · Remote")).toBe(lines.indexOf("Software Engineer - Cascade Digital") + 1);
  });
});

/** A run with a font id (pdf.js `fontName`), for wrap tests. */
function frun(str: string, x: number, y: number, width: number, font: string, size = 10): PdfTextItem {
  return { str, transform: [size, 0, 0, size, x, y], width, fontName: font };
}

describe("itemsToPageText — fields wrapped inside their box", () => {
  it("re-joins a title wrapped beside a right-aligned date", () => {
    const { text } = itemsToPageText([
      frun("Senior Product Designer — Lumen", 50, 700, 245, "regular"),
      frun("Mar 2020 – Present", 330, 700, 100, "regular"),
      frun("Health", 50, 686, 32, "regular"),
    ]);
    expect(text).toBe("Senior Product Designer — Lumen Health | Mar 2020 – Present");
  });

  it("re-joins a word hyphenated across the wrap", () => {
    const { text } = itemsToPageText([
      frun("Senior Software Engineer — Verdigris Sys-", 50, 700, 250, "regular"),
      frun("Jul 2021 – Present", 330, 700, 90, "regular"),
      frun("tems", 50, 686, 22, "regular"),
    ]);
    expect(text).toBe("Senior Software Engineer — Verdigris Systems | Jul 2021 – Present");
  });

  it("keeps a separate line that would have fitted (a company under its title)", () => {
    const { text } = itemsToPageText([
      frun("Senior Software Engineer", 50, 700, 130, "regular"),
      frun("Mar 2021 – Present", 400, 700, 100, "regular"),
      frun("Northwind Labs", 50, 686, 75, "regular"),
    ]);
    expect(text.split("\n")).toEqual(["Senior Software Engineer | Mar 2021 – Present", "Northwind Labs"]);
  });

  it("re-joins a title whose date sits close by in a smaller size", () => {
    // Designer-style: the title box fills up to 12pt from the date.
    const { text } = itemsToPageText([
      frun("Senior Product Designer", 50, 700, 130, "bold", 10.5),
      frun(" — Lumen", 180, 700, 40, "regular"),
      frun("Mar 2020 – Present", 232, 700, 80, "regular", 9),
      frun("Health", 50, 685, 32, "regular"),
    ]);
    expect(text).toBe("Senior Product Designer — Lumen Health | Mar 2020 – Present");
  });

  it("never splits a justified paragraph at a wide word gap", () => {
    const { text } = itemsToPageText([
      frun("Full-stack engineer with", 50, 700, 120, "regular"),
      frun("six years of shipping", 182, 700, 110, "regular"),
      frun("web apps", 50, 686, 45, "regular"),
    ]);
    expect(text.split("\n")).toEqual(["Full-stack engineer with six years of shipping", "web apps"]);
  });

  it("keeps a line in another font (a bold label) or a bullet separate", () => {
    const { text } = itemsToPageText([
      frun("Senior Product Designer — Lumen", 50, 700, 245, "regular"),
      frun("Mar 2020 – Present", 330, 700, 100, "regular"),
      frun("Health", 50, 686, 32, "bold"),
      frun("Product Designer — Harbour Studio", 50, 660, 245, "regular"),
      frun("2017 – 2020", 330, 660, 60, "regular"),
      frun("• Shipped", 50, 646, 40, "regular"),
    ]);
    expect(text.split("\n")).toEqual([
      "Senior Product Designer — Lumen | Mar 2020 – Present",
      "Health",
      "Product Designer — Harbour Studio | 2017 – 2020",
      "• Shipped",
    ]);
  });
});

describe("extractPagesFromDocument — link annotations", () => {
  it("collects web and mail link targets, ignoring internal links", async () => {
    const page = {
      getTextContent: async () => ({ items: [run("Alex Morgan", 50, 700, 80)] }),
      getAnnotations: async () => [
        { subtype: "Link", url: "https://github.com/alexm" },
        { subtype: "Link", url: "mailto:alex@x.com" },
        { subtype: "Link", dest: "page2" },
        { subtype: "Widget", url: "https://example.com/form" },
      ],
      cleanup: () => undefined,
    };
    const result = await extractPagesFromDocument({ numPages: 1, getPage: async () => page });
    expect(result.links).toEqual(["https://github.com/alexm", "mailto:alex@x.com"]);
  });
});

describe("itemsToPageText — layout details", () => {
  it("marks a wide gap inside a row (right-aligned dates) with a separator", () => {
    const { text } = itemsToPageText([
      run("Software", 50, 700, 45),
      run("Engineer", 98, 700, 45),
      run("Jan 2020 - Present", 420, 700, 90),
    ]);
    expect(text).toBe("Software Engineer | Jan 2020 - Present");
  });

  it("orders heading hints largest font first (the name)", () => {
    // The heading reads first (it's higher on the page); the name is bigger.
    const { headingLines } = itemsToPageText([
      run("EXPERIENCE", 50, 790, 80, 13),
      run("Jordan Chen", 50, 760, 120, 24),
      ...["one", "two", "three", "four"].map((s, i) => run(s, 50, 680 - i * 12, 30, 10)),
    ]);
    expect(headingLines[0]).toBe("Jordan Chen");
  });
});
