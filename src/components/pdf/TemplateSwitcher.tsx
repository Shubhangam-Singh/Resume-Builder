"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTemplateMeta, TEMPLATES } from "@/components/pdf/templates/meta";
import { renderResumePdf } from "@/lib/pdf/render";
import type { ResumeData } from "@/lib/resume/types";
import { useAgencyStore } from "@/lib/agency-store";
import { useResumeStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Thumbnails of the user's own resume in every template, keyed by the resume
 * object (a new object per edit, so edits invalidate naturally). Rendering all
 * 12 takes a few seconds in the worker; caching makes reopening instant.
 */
const thumbCache = new WeakMap<object, Map<string, string>>();

async function renderThumb(data: ResumeData): Promise<string> {
  const blob = await renderResumePdf(data);
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  try {
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 0.55 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    page.cleanup();
    return canvas.toDataURL("image/png");
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Template picker — a gallery dialog where every template is previewed with
 * the user's actual resume, like the paid builders do. Thumbnails render
 * sequentially in the PDF worker and fill in as they finish.
 */
export function TemplateSwitcher() {
  const resume = useResumeStore((s) => s.resume);
  const agencyBranding = useAgencyStore((s) => s.branding);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const templateId = resume.meta.template;
  const current = getTemplateMeta(templateId);

  const [open, setOpen] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    let cache = thumbCache.get(resume);
    if (!cache) {
      cache = new Map();
      thumbCache.set(resume, cache);
    }
    const cached = cache;
    setThumbs(Object.fromEntries(cached));

    (async () => {
      // Current template first so the highlighted card fills in immediately.
      const ordered = [...TEMPLATES].sort((a, b) =>
        a.id === templateId ? -1 : b.id === templateId ? 1 : 0,
      );
      for (const t of ordered) {
        if (cancelled) return;
        if (cached.has(t.id)) continue;
        try {
          const url = await renderThumb({
            ...resume,
            meta: { ...resume.meta, template: t.id, agencyBranding },
          });
          cached.set(t.id, url);
          if (!cancelled) setThumbs((prev) => ({ ...prev, [t.id]: url }));
        } catch {
          // Skip templates that fail to render; their card keeps the spinner.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resume, agencyBranding]);

  function choose(id: string) {
    setTemplate(id);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Change template"
        title="Change template"
      >
        {current.atsSafe ? (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
        )}
        <span>{current.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Choose a template</DialogTitle>
            <DialogDescription>
              Every preview shows your actual resume. Rendering happens in your
              browser — nothing is uploaded.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {TEMPLATES.map((t) => {
              const active = t.id === templateId;
              const thumb = thumbs[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => choose(t.id)}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md",
                    active && "ring-2 ring-primary",
                  )}
                >
                  <div className="relative aspect-[17/22] w-full overflow-hidden bg-white">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={`${t.name} template preview`}
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 border-t px-2 py-1.5">
                    <span className="truncate text-xs font-medium">{t.name}</span>
                    {t.atsSafe ? (
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <ShieldAlert
                        className="h-3.5 w-3.5 shrink-0 text-amber-500"
                        aria-label="May reduce ATS compatibility"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
