// TEMPORARY — runs a real PDF through the importer and dumps every stage. Delete before finishing.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { it } from "vitest";

import { extractPagesFromDocument } from "@/lib/import/pdf";
import { parseResumeText } from "@/lib/parser";
import { normalizeText } from "@/lib/parser/normalize";
import { detectSectionsDetailed } from "@/lib/parser/sections";

const require = createRequire(import.meta.url);

it("dumps a real PDF", async () => {
  const input = process.env.REAL_PDF;
  const out = process.env.REAL_OUT;
  if (!input || !out) return;
  const progress: string[] = [];
  const step = (s: string) => {
    progress.push(`${new Date().toISOString()} ${s}`);
    writeFileSync(`${out}.progress`, progress.join("\n"));
  };
  step("start");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
  const fonts = join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";
  const task = pdfjs.getDocument({ data: new Uint8Array(readFileSync(input)), standardFontDataUrl: fonts, verbosity: 0 });
  const doc = await task.promise;
  step(`opened, pages=${doc.numPages}`);
  if (process.env.REAL_STEPS) {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      await page.getTextContent();
      step(`page ${p} text ok`);
      await page.getOperatorList();
      step(`page ${p} operator list ok`);
    }
  }
  const ex = await extractPagesFromDocument(doc);
  step("extracted");
  await task.destroy();
  writeFileSync(`${out}.text`, ex.text);
  const parsed = parseResumeText(ex.text, { headingLines: ex.headingLines, links: ex.links, lineStyles: ex.lineStyles });
  step("parsed");
  const sections = detectSectionsDetailed(normalizeText(ex.text), { headingLines: ex.headingLines, lineStyles: ex.lineStyles });
  writeFileSync(
    out,
    [
      "===== TEXT",
      ex.text,
      "===== LINKS",
      ex.links.join("\n"),
      "===== HINTS",
      ex.headingLines.join(" ¦ "),
      "===== SECTIONS",
      JSON.stringify(sections, null, 2),
      "===== RESULT",
      JSON.stringify({ ...parsed.data, meta: undefined }, null, 2),
      "===== REVIEW",
      JSON.stringify(parsed.review, null, 2),
    ].join("\n"),
  );
});
