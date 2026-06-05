"use client";

import { PDFViewer } from "@react-pdf/renderer";

import { resolveSectionOrder } from "@/lib/resume/sections";
import type { ResumeData } from "@/lib/resume/types";
import { buildResumeDocument } from "./ResumeDocument";

/**
 * The actual React-PDF viewer. Isolated in its own module so it can be
 * dynamically imported with `ssr: false` — keeping the heavy @react-pdf bundle
 * out of the initial page load and off the server.
 *
 * React-PDF reuses one renderer instance and reconciles updates; its reconciler
 * mishandles reordering keyed siblings (sections), duplicating them. We force a
 * clean remount whenever the document *structure* changes (template, section
 * order, or visibility) via `key`. Plain text edits don't change the key, so
 * typing stays smooth.
 */
function structureKey(data: ResumeData): string {
  const m = data.meta;
  return [
    m.template,
    resolveSectionOrder(m).join(","),
    (m.hiddenSections ?? []).join(","),
    m.themeColor ?? "",
    m.density ?? "",
    m.fontFamily ?? "",
    m.fontScale ?? "",
    m.lineSpacing ?? "",
    m.sectionSpacing ?? "",
    m.paragraphSpacing ?? "",
  ].join("|");
}

export default function PdfViewerInner({ data }: { data: ResumeData }) {
  return (
    <PDFViewer
      key={structureKey(data)}
      showToolbar
      style={{ width: "100%", height: "100%", border: "none" }}
    >
      {buildResumeDocument(data)}
    </PDFViewer>
  );
}
