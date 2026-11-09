// TEMPORARY — prints raw pdf.js items for a letter-spaced heading. Delete before finishing.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { renderToBuffer } from "@react-pdf/renderer";
import { it } from "vitest";

import { buildResumeDocument } from "@/components/pdf/ResumeDocument";
import { SAMPLES } from "./roundtrip";

const require = createRequire(import.meta.url);

it("prints runs", async () => {
  const out = process.env.RUNS_OUT;
  if (!out) return;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs")).href;
  const fonts = join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";
  const data = SAMPLES.find((s) => s.id === "unknown-sections")!.data();
  data.meta.template = "modern";
  const buffer = await renderToBuffer(buildResumeDocument(data));
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), standardFontDataUrl: fonts, verbosity: 0 });
  const doc = await task.promise;
  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items as { str: string; transform: number[]; width: number }[]) {
      if (!/^[A-Z](?:\s+[A-Z]){3,}/.test(it.str)) continue;
      lines.push(`${JSON.stringify(it.str)} x=${it.transform[4].toFixed(2)} y=${it.transform[5].toFixed(1)} w=${it.width.toFixed(2)} size=${it.transform[0]}`);
    }
  }
  await task.destroy();
  writeFileSync(out, lines.join("\n"));
});
