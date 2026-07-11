import { describe, expect, it } from "vitest";

import { itemsToPageText, type PdfTextItem } from "./pdf";

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
