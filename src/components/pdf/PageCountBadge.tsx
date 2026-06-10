"use client";

import { usePdfStore } from "@/lib/pdf-store";
import { cn } from "@/lib/utils";

/**
 * Shows a page-count badge ("1 page ✓", "2 pages", "3+ pages ⚠").
 * Reads from usePdfStore which PdfViewerInner/PdfImagePreview populate after
 * their own render — no second pdf() call, no jitter.
 */
export function PageCountBadge() {
  const pageCount = usePdfStore((s) => s.pageCount);

  if (pageCount === null) return null;

  const p = pageCount;
  const label = p === 1 ? "1 page" : `${p} pages`;
  const icon = p === 1 ? "✓" : p >= 3 ? "⚠" : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
        p === 1
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : p === 2
            ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      )}
    >
      {label}
      {icon && <span>{icon}</span>}
    </span>
  );
}
