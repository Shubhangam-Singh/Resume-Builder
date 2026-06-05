"use client";

import { FileText, Loader2, ShieldCheck } from "lucide-react";

import { DownloadButton } from "@/components/pdf/DownloadButton";
import { LivePreview } from "@/components/pdf/LivePreview";
import { TemplateSwitcher } from "@/components/pdf/TemplateSwitcher";
import { ImportResume } from "@/components/import/ImportResume";
import { AtsChecker } from "@/components/ats/AtsChecker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useResumePersistence } from "@/lib/persist/useResumePersistence";
import { Editor } from "./Editor";
import { MoreMenu } from "./MoreMenu";
import { ResumeManager } from "./ResumeManager";
import { SectionsMenu } from "./SectionsMenu";

export function Workspace() {
  const hydrated = useResumePersistence();

  if (!hydrated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading your résumé…
      </div>
    );
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

        <nav
          aria-label="Resume actions"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 lg:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Runs entirely in your browser
          </span>
          <ResumeManager />
          <ThemeToggle />
          <ImportResume />
          <AtsChecker />
          <SectionsMenu />
          <MoreMenu />
          <DownloadButton />
        </nav>
      </header>

      <div className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-2">
        {/* Editor */}
        <section
          aria-label="Resume editor"
          className="flex flex-col p-4 lg:min-h-0 lg:overflow-hidden lg:border-r lg:p-6"
        >
          <Editor />
        </section>

        {/* Live preview — the actual PDF, never an HTML approximation */}
        <section
          aria-label="Live preview"
          className="flex min-h-[70vh] flex-col bg-muted lg:min-h-0"
        >
          <div className="flex items-center justify-between border-b bg-background/60 px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              Live preview
            </span>
            <TemplateSwitcher />
          </div>
          <div className="min-h-0 flex-1">
            <LivePreview />
          </div>
        </section>
      </div>
    </div>
  );
}
