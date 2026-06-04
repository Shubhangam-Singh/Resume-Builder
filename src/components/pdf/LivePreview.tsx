"use client";

import dynamic from "next/dynamic";

import { useResumeStore } from "@/lib/store";
import { useDebounce } from "@/lib/use-debounce";

// Lazy-load the React-PDF viewer (heavy, browser-only). ssr:false is required
// because @react-pdf/renderer's PDFViewer touches the DOM.
const PdfViewerInner = dynamic(() => import("./PdfViewerInner"), {
  ssr: false,
  loading: () => <PreviewSkeleton message="Loading preview…" />,
});

function PreviewSkeleton({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/40">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function LivePreview() {
  const resume = useResumeStore((s) => s.resume);
  // Debounce so the PDF isn't regenerated on every keystroke.
  const debounced = useDebounce(resume, 400);

  return (
    <div className="h-full w-full">
      <PdfViewerInner data={debounced} />
    </div>
  );
}
