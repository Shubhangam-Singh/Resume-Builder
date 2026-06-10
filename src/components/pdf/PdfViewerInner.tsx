"use client";

import { useEffect, useMemo } from "react";
import { usePDF } from "@react-pdf/renderer";

import type { ResumeData } from "@/lib/resume/types";
import { usePdfStore } from "@/lib/pdf-store";
import { buildResumeDocument } from "./ResumeDocument";

/**
 * The actual PDF viewer. Uses usePDF to generate the blob once, shows it in an
 * iframe, and extracts the page count from the same blob via pdfjs — avoiding
 * the double-render that caused jitter when PageCountBadge ran its own pdf().
 *
 * LivePreview keys this whole component on the document structure, so it
 * remounts (fresh usePDF / renderer instance) on template or layout changes —
 * sidestepping React-PDF's reconciler bug with reordered sections. Plain text
 * edits keep the same key, so we push those via updateInstance below.
 */
export default function PdfViewerInner({ data }: { data: ResumeData }) {
  const setPageCount = usePdfStore((s) => s.setPageCount);

  // usePDF only renders the document passed at mount; it ignores later changes
  // to the `document` arg. To update, we must call updateInstance in an effect
  // whenever the document changes — exactly what the built-in <PDFViewer> does.
  const doc = useMemo(() => buildResumeDocument(data), [data]);
  const [instance, updateInstance] = usePDF();

  useEffect(() => {
    updateInstance(doc);
  }, [doc, updateInstance]);

  // Count pages from the already-generated blob. No second pdf() call needed.
  useEffect(() => {
    if (!instance.blob) return;
    let cancelled = false;
    const blob = instance.blob;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const pdfjsDoc = await pdfjs.getDocument({ data: bytes }).promise;
        if (!cancelled) setPageCount(pdfjsDoc.numPages);
      } catch {
        // ignore — badge just stays hidden
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instance.blob, setPageCount]);

  if (!instance.url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/40">
        <p className="animate-pulse text-sm text-muted-foreground">
          Generating preview…
        </p>
      </div>
    );
  }

  return (
    <iframe
      src={instance.url}
      title="Resume preview"
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}
