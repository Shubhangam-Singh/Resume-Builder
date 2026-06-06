"use client";

import dynamic from "next/dynamic";

import { useResumeStore } from "@/lib/store";
import { useDebounce } from "@/lib/use-debounce";

// Lazy-load the renderers (heavy, browser-only). ssr:false is required because
// both touch the DOM / @react-pdf internals.
const PdfViewerInner = dynamic(() => import("./PdfViewerInner"), {
  ssr: false,
  loading: () => <PreviewSkeleton message="Loading preview…" />,
});
const PdfImagePreview = dynamic(() => import("./PdfImagePreview"), {
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

/**
 * `useImages` renders the PDF as page images (reliable on mobile, where many
 * browsers won't show a PDF in an iframe). Desktop uses the interactive
 * `<PDFViewer>` iframe with its zoom/scroll controls.
 */
export function LivePreview({ useImages = false }: { useImages?: boolean }) {
  const resume = useResumeStore((s) => s.resume);
  // Debounce so the PDF isn't regenerated on every keystroke.
  const debounced = useDebounce(resume, 400);

  return (
    <div className="h-full w-full">
      {useImages ? (
        <PdfImagePreview data={debounced} />
      ) : (
        <PdfViewerInner data={debounced} />
      )}
    </div>
  );
}
