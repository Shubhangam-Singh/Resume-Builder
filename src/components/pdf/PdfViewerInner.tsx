"use client";

import { PDFViewer } from "@react-pdf/renderer";

import type { ResumeData } from "@/lib/resume/types";
import { buildResumeDocument } from "./ResumeDocument";

/**
 * The actual React-PDF viewer. Isolated in its own module so it can be
 * dynamically imported with `ssr: false` — keeping the heavy @react-pdf bundle
 * out of the initial page load and off the server.
 */
export default function PdfViewerInner({ data }: { data: ResumeData }) {
  return (
    <PDFViewer
      showToolbar
      style={{ width: "100%", height: "100%", border: "none" }}
    >
      {buildResumeDocument(data)}
    </PDFViewer>
  );
}
