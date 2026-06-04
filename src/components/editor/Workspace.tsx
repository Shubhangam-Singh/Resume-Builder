"use client";

import { FileText, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/pdf/DownloadButton";
import { LivePreview } from "@/components/pdf/LivePreview";
import { useResumeStore } from "@/lib/store";
import { Editor } from "./Editor";

export function Workspace() {
  const resetResume = useResumeStore((s) => s.resetResume);
  const loadSample = useResumeStore((s) => s.loadSample);

  function handleStartBlank() {
    if (
      window.confirm(
        "Clear all fields and start from a blank resume? This can't be undone.",
      )
    ) {
      resetResume();
    }
  }

  function handleLoadSample() {
    if (
      window.confirm("Replace the current resume with the sample content?")
    ) {
      loadSample();
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              ResumeForge
            </h1>
            <p className="text-xs text-muted-foreground">
              Free, private, ATS-friendly resume builder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Runs entirely in your browser
          </span>
          <Button variant="ghost" size="sm" onClick={handleLoadSample}>
            <Sparkles />
            <span className="hidden sm:inline">Sample</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleStartBlank}>
            <RotateCcw />
            <span className="hidden sm:inline">Start blank</span>
          </Button>
          <DownloadButton />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-2">
        {/* Editor */}
        <section className="flex flex-col p-4 lg:min-h-0 lg:overflow-hidden lg:border-r lg:p-6">
          <Editor />
        </section>

        {/* Live preview — the actual PDF, never an HTML approximation */}
        <section className="flex min-h-[70vh] flex-col bg-muted lg:min-h-0">
          <div className="flex items-center justify-between border-b bg-background/60 px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Live preview
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              ATS Classic
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <LivePreview />
          </div>
        </section>
      </div>
    </div>
  );
}
