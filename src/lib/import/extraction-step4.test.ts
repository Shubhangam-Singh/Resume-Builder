import { Document, Footer, Header, Packer, PageNumber, Paragraph, TextRun } from "docx";
import { describe, expect, it } from "vitest";

import { parseResumeText } from "@/lib/parser";
import { extractDocxDocument, wordPartLines } from "./docx";
import { htmlToResumeText } from "./html-text";
import {
  extractPagesFromDocument,
  itemsToPageText,
  stripRunningHeadersFooters,
  type PdfDocumentLike,
  type PdfTextItem,
} from "./pdf";

/**
 * Step 4 of the parser hardening: richer extraction. Running headers and
 * footers, bold and size per line (for heading-style learning), one size
 * scale across pages, scanned-PDF detection, and Word page headers.
 */

function run(str: string, x: number, y: number, width: number, font = "regular", size = 10): PdfTextItem {
  return { str, transform: [size, 0, 0, size, x, y], width, fontName: font };
}

/** A pdf.js-like document whose pages are given glyph runs; "bold" is a bold face. */
function fakeDocument(pages: PdfTextItem[][]): PdfDocumentLike {
  return {
    numPages: pages.length,
    getPage: async (n: number) => ({
      getTextContent: async () => ({ items: pages[n - 1] }),
      getOperatorList: async () => ({}),
      commonObjs: {
        has: (id: string) => id === "bold" || id === "regular",
        get: (id: string) => ({ name: id === "bold" ? "ABCDEF+Helvetica-Bold" : "ABCDEF+Helvetica" }),
      },
      cleanup: () => {},
    }),
  };
}

describe("running headers and footers", () => {
  it("keeps page 1's header and drops its copies on later pages", () => {
    const pages = [
      "Jane Doe | jane@doe.dev\nEXPERIENCE\nEngineer, Stripe\n• Built payouts.",
      "Jane Doe | jane@doe.dev\n• Ran the on-call rotation.\nEDUCATION\nMIT",
      "Jane Doe | jane@doe.dev\nSKILLS\nGo, Rust",
    ];
    const out = stripRunningHeadersFooters(pages);
    expect(out[0].startsWith("Jane Doe | jane@doe.dev")).toBe(true);
    expect(out[1]).not.toContain("jane@doe.dev");
    expect(out[2]).not.toContain("jane@doe.dev");
    expect(out[1]).toContain("• Ran the on-call rotation.");
  });

  it("drops a numbered footer from every page, page 1 included", () => {
    const pages = [
      "Jane Doe\nEXPERIENCE\n• Built payouts.\nJane Doe — Résumé — 1",
      "• Ran on-call.\nEDUCATION\nMIT\nJane Doe — Résumé — 2",
    ];
    const out = stripRunningHeadersFooters(pages);
    expect(out.join("\n")).not.toMatch(/Résumé — \d/);
    expect(out[0]).toContain("• Built payouts.");
  });

  it("leaves single-page documents and repeated body lines alone", () => {
    expect(stripRunningHeadersFooters(["A\nB\nC"])).toEqual(["A\nB\nC"]);
    const pages = ["Name\nX1\nX2\nX3\nShared middle line\nY1\nY2\nY3", "Other\nZ1\nZ2\nZ3\nShared middle line\nW1\nW2\nW3"];
    expect(stripRunningHeadersFooters(pages)[1]).toContain("Shared middle line");
  });
});

describe("line styles from the PDF", () => {
  it("marks lines set mostly in a bold face", () => {
    const { lineStyles } = itemsToPageText(
      [run("EXPERIENCE", 50, 700, 70, "bold", 12), run("Engineer at Stripe", 50, 680, 100)],
      new Set(["bold"]),
    );
    expect(lineStyles).toEqual([
      { text: "EXPERIENCE", size: 1.2, bold: true },
      { text: "Engineer at Stripe", size: 1, bold: false },
    ]);
  });

  it("reads bold from the font's real name and scales sizes across pages", async () => {
    const body = (y: number) => run("Shipped the payouts ledger and the reconciliation jobs", 50, y, 300);
    const doc = fakeDocument([
      [run("EXPERIENCE", 50, 700, 70, "bold", 12), body(680), body(666), body(652), body(638)],
      // A short last page whose own median would be the heading size.
      [run("SPEAKING", 50, 700, 60, "bold", 12), run("PyCon", 50, 680, 30)],
    ]);
    const { lineStyles, scanned } = await extractPagesFromDocument(doc);
    const style = (t: string) => lineStyles.find((s) => s.text === t);
    expect(style("EXPERIENCE")).toEqual({ text: "EXPERIENCE", size: 1.2, bold: true });
    expect(style("SPEAKING")).toEqual({ text: "SPEAKING", size: 1.2, bold: true });
    expect(scanned).toBe(false);
  });

  it("flags a PDF with no text layer as scanned", async () => {
    const { scanned, text } = await extractPagesFromDocument(fakeDocument([[], []]));
    expect(text.trim()).toBe("");
    expect(scanned).toBe(true);
  });
});

describe("Word paragraphs", () => {
  it("records bold paragraphs and heading levels as line styles", () => {
    const { lineStyles } = htmlToResumeText(
      "<h2>Skills</h2><p><strong>OPEN SOURCE</strong></p><p>Plain line</p><ul><li>Bullet</li></ul>",
    );
    expect(lineStyles).toEqual([
      { text: "Skills", size: 1.4, bold: true },
      { text: "OPEN SOURCE", size: 1, bold: true },
      { text: "Plain line", size: 1, bold: false },
    ]);
  });

  it("reads header/footer XML: tabs separate fields, field codes are skipped", () => {
    const xml =
      '<w:hdr><w:p><w:r><w:t>Jane Doe</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve">jane@doe.dev &amp; more</w:t></w:r></w:p>' +
      '<w:p><w:r><w:instrText>PAGE</w:instrText></w:r><w:r><w:t>2</w:t></w:r></w:p></w:hdr>';
    expect(wordPartLines(xml)).toEqual(["Jane Doe | jane@doe.dev & more", "2"]);
  });

  it("reads the contact block from a Word page header", async () => {
    const doc = new Document({
      sections: [
        {
          headers: {
            default: new Header({
              children: [new Paragraph("Priya Sharma | priya@sharma.dev | +91 98765 43210")],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({ children: [new TextRun("Page "), new TextRun({ children: [PageNumber.CURRENT] })] })],
            }),
          },
          children: [
            new Paragraph("EXPERIENCE"),
            new Paragraph("Data Scientist, Swiggy | 2021 - Present"),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const { text } = await extractDocxDocument(arrayBuffer);
    expect(text.split("\n")[0]).toBe("Priya Sharma | priya@sharma.dev | +91 98765 43210");
    expect(text).not.toMatch(/^Page/m);

    const { data } = parseResumeText(text);
    expect(data.basics.email).toBe("priya@sharma.dev");
    expect(data.work[0].name).toBe("Swiggy");
  });
});
