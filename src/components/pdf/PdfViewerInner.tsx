"use client";

import { useEffect, useRef, useState } from "react";

import { renderResumePdf, RenderSuperseded } from "@/lib/pdf/render";
import { usePdfStore } from "@/lib/pdf-store";
import type { ResumeData } from "@/lib/resume/types";

/**
 * Desktop PDF preview. The PDF is generated in a Web Worker (renderResumePdf)
 * so react-pdf's layout work never blocks typing, then shown in an iframe.
 * The page count is read from the same blob via pdfjs — one render feeds both
 * the preview and the page badge.
 */
export default function PdfViewerInner({ data }: { data: ResumeData }) {
  const setPageCount = usePdfStore((s) => s.setPageCount);
  const [url, setUrl] = useState<string | null>(null);
  const reqId = useRef(0);
  const urlRef = useRef<string | null>(null); // latest object URL, for cleanup

  useEffect(() => {
    const id = ++reqId.current;
    (async () => {
      try {
        const blob = await renderResumePdf(data, { lane: "preview" });
        if (id !== reqId.current) return; // superseded by a newer edit
        const prev = urlRef.current;
        urlRef.current = URL.createObjectURL(blob);
        setUrl(urlRef.current);
        if (prev) URL.revokeObjectURL(prev);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (id === reqId.current) setPageCount(doc.numPages);
      } catch (err) {
        if (err instanceof RenderSuperseded) return; // a newer edit took over
        // Keep showing the last good preview rather than blanking the panel.
        console.error("Preview render failed", err);
      }
    })();
  }, [data, setPageCount]);

  // On unmount: invalidate in-flight renders and revoke the last object URL.
  useEffect(() => {
    const req = reqId;
    const lastUrl = urlRef;
    return () => {
      req.current++;
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      lastUrl.current = null;
    };
  }, []);

  if (!url) {
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
      src={url}
      title="Resume preview"
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}
