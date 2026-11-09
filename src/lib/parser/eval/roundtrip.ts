/**
 * Round-trip corpus for the parser: every built-in sample resume is exported
 * through each of the app's own output paths (12 PDF templates, Word, plain
 * text), read back with the same extraction code the importer uses, parsed,
 * and scored against the ResumeData it came from. The source data is the
 * ground truth, so this corpus labels itself.
 *
 * Node-only (react-pdf's Node renderer + pdf.js legacy build); used by tests.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { renderToBuffer } from "@react-pdf/renderer";

import { buildResumeDocument } from "@/components/pdf/ResumeDocument";
import { buildResumeDocxBlob } from "@/lib/export/docx";
import { resumeToFormattedText } from "@/lib/export/text";
import { extractDocxDocument } from "@/lib/import/docx";
import { extractPagesFromDocument, type PdfExtraction } from "@/lib/import/pdf";
import { parseResumeText, type ParseResult } from "@/lib/parser";
import { sampleResume } from "@/lib/resume/factory";
import { ROLE_SAMPLES } from "@/lib/resume/role-samples";
import type { ResumeData } from "@/lib/resume/types";

export interface Sample {
  id: string;
  data: () => ResumeData;
}

/**
 * The sample résumé plus two sections whose headings no vocabulary knows —
 * they only survive if the parser recognises a heading by how it is set.
 */
function withUnknownSections(): ResumeData {
  const data = sampleResume();
  const item = (name: string, description: string, date: string) => ({
    id: "",
    name,
    description,
    date,
    url: "",
    highlights: [],
  });
  data.customSections = [
    {
      id: "open-source",
      title: "Open Source",
      items: [
        item("Apache Airflow", "Contributed the pod retry fix used by 2,000+ deployments", "2023"),
        item("Pandas", "Fixed timezone handling in read_csv", "2022"),
      ],
    },
    {
      id: "speaking",
      title: "Speaking",
      items: [item("PyCon India", "Scaling data pipelines without a scheduler", "2022")],
    },
  ];
  return data;
}

export const SAMPLES: Sample[] = [
  { id: "sample", data: sampleResume },
  ...ROLE_SAMPLES.map((r) => ({ id: r.id, data: r.data })),
  { id: "unknown-sections", data: withUnknownSections },
];

const require = createRequire(import.meta.url);
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsPromise: Promise<PdfJs> | null = null;

function loadNodePdfjs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
        require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
      ).href;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

const STANDARD_FONTS =
  join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";

/** Render with the résumé's template → PDF bytes → what the importer extracts. */
export async function pdfExtract(data: ResumeData): Promise<PdfExtraction> {
  const buffer = await renderToBuffer(buildResumeDocument(data));
  const pdfjs = await loadNodePdfjs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: STANDARD_FONTS,
    verbosity: 0,
  });
  try {
    return await extractPagesFromDocument(await task.promise);
  } finally {
    await task.destroy();
  }
}

/** Render with a template → PDF bytes → extracted text → parse. */
export async function pdfRoundTrip(data: ResumeData): Promise<{ text: string; parsed: ParseResult }> {
  const { text, headingLines, links, lineStyles } = await pdfExtract(data);
  return { text, parsed: parseResumeText(text, { headingLines, links, lineStyles }) };
}

/** Our Word export → the importer's DOCX extraction → parse. */
export async function docxRoundTrip(data: ResumeData): Promise<{ text: string; parsed: ParseResult }> {
  const blob = await buildResumeDocxBlob(data);
  const { text, headingLines, links, lineStyles } = await extractDocxDocument(await blob.arrayBuffer());
  return { text, parsed: parseResumeText(text, { headingLines, links, lineStyles }) };
}

/** Our plain-text export → parse. */
export function txtRoundTrip(data: ResumeData): { text: string; parsed: ParseResult } {
  const text = resumeToFormattedText(data);
  return { text, parsed: parseResumeText(text) };
}
