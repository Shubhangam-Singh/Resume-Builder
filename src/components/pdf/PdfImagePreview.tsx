"use client";

import { useEffect, useRef, useState } from "react";

import { usePdfStore } from "@/lib/pdf-store";
import type { ResumeData } from "@/lib/resume/types";

/**
 * Image-based PDF preview for mobile. Many mobile browsers refuse to render a
 * PDF inside an <iframe> (they show an "Open" prompt instead), so we generate
 * the PDF and rasterize each page to an <img> with pdf.js — reliable on every
 * browser. The exported file is still the same React-PDF document.
 */
export default function PdfImagePreview({ data }: { data: ResumeData }) {
  const setPageCount = usePdfStore((s) => s.setPageCount);
  const [pages, setPages] = useState<string[]>([]);
  const [status, setStatus] = useState<"rendering" | "ready" | "error">(
    "rendering",
  );
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setStatus("rendering");

    (async () => {
      try {
        const [{ renderResumePdf, RenderSuperseded }, pdfjs] = await Promise.all([
          import("@/lib/pdf/render"),
          import("pdfjs-dist"),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const blob = await renderResumePdf(data, { lane: "image-preview" }).catch(
          (err: unknown) => {
            if (err instanceof RenderSuperseded) return null;
            throw err;
          },
        );
        if (!blob) return; // a newer edit took over this lane
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const loadingTask = pdfjs.getDocument({ data: bytes });
        const doc = await loadingTask.promise;
        if (id === reqId.current) setPageCount(doc.numPages);

        const rendered: string[] = [];
        try {
          for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1.6 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            const ctx = canvas.getContext("2d");
            if (ctx) {
              await page.render({ canvas, canvasContext: ctx, viewport }).promise;
              rendered.push(canvas.toDataURL("image/png"));
            }
            page.cleanup();
          }
        } finally {
          await loadingTask.destroy();
        }

        if (id === reqId.current) {
          setPages(rendered);
          setStatus("ready");
        }
      } catch (err) {
        console.error("Image preview failed", err);
        if (id === reqId.current) setStatus("error");
      }
    })();
  }, [data, setPageCount]);

  return (
    <div className="relative h-full w-full overflow-y-auto bg-muted p-3">
      {pages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {status === "error"
            ? "Couldn't render the preview."
            : "Rendering preview…"}
        </div>
      ) : (
        <div className="mx-auto flex max-w-[760px] flex-col gap-3">
          {pages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Résumé page ${i + 1}`}
              className="w-full rounded border bg-white shadow-sm"
            />
          ))}
        </div>
      )}

      {status === "rendering" && pages.length > 0 ? (
        <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground shadow">
          Updating…
        </div>
      ) : null}
    </div>
  );
}
