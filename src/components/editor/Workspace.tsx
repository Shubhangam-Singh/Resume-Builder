"use client";

import { useEffect, useState } from "react";
import { Eye, FileText, Loader2, ShieldCheck, SquarePen } from "lucide-react";

import { DownloadButton } from "@/components/pdf/DownloadButton";
import { DesignMenu } from "@/components/pdf/DesignMenu";
import { LivePreview } from "@/components/pdf/LivePreview";
import { TemplateSwitcher } from "@/components/pdf/TemplateSwitcher";
import { ImportResume } from "@/components/import/ImportResume";
import { AtsChecker } from "@/components/ats/AtsChecker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { useResumePersistence } from "@/lib/persist/useResumePersistence";
import { Wizard, wizardIsDone, markWizardDone } from "@/components/onboarding/Wizard";
import { clearShareParam, decodeResumeFromUrl } from "@/lib/share/url";
import { useResumeStore } from "@/lib/store";
import { CompletenessBadge } from "./CompletenessBadge";
import { Editor } from "./Editor";
import { MoreMenu } from "./MoreMenu";
import { ResumeManager } from "./ResumeManager";
import { SectionsMenu } from "./SectionsMenu";
import { UndoRedo } from "./UndoRedo";

type MobileView = "edit" | "preview";

export function Workspace() {
  const hydrated = useResumePersistence();
  const setResume = useResumeStore((s) => s.setResume);
  const [mobileView, setMobileView] = useState<MobileView>("edit");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [wizardOpen, setWizardOpen] = useState(false);

  // After hydration: (1) load any ?r= shared resume, (2) auto-show wizard for new users.
  useEffect(() => {
    if (!hydrated) return;

    decodeResumeFromUrl().then((shared) => {
      if (shared) {
        setResume(shared);
        clearShareParam();
        // Don't interrupt a shared-link visit with the wizard
        markWizardDone();
        return;
      }
      // Show wizard only for first-time visitors (no IndexedDB data yet)
      if (!wizardIsDone()) {
        setWizardOpen(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  function handleWizardClose(v: boolean) {
    setWizardOpen(v);
    // Mark wizard as seen whether they finished it or skipped it
    if (!v) markWizardDone();
  }

  // Mount the preview only when it's actually visible — on mobile this avoids
  // rasterizing the PDF in the background while the user is editing.
  const showPreview = isDesktop || mobileView === "preview";

  if (!hydrated) {
    return (
      <div
        className="flex h-dvh items-center justify-center text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading your resume…
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b px-3 py-2 sm:px-4 lg:px-6 lg:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground lg:h-9 lg:w-9">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight lg:text-base">
              ResumeForge
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Free, private, ATS-friendly resume builder
            </p>
          </div>
        </div>

        <nav
          aria-label="Resume actions"
          className="flex flex-wrap items-center justify-end gap-1.5"
        >
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 xl:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Runs entirely in your browser
          </span>
          <CompletenessBadge />
          <UndoRedo />
          <ResumeManager />
          <ThemeToggle />
          <ImportResume />
          <AtsChecker />
          <SectionsMenu />
          <MoreMenu />
          <DownloadButton />
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        {/* Editor */}
        <section
          aria-label="Resume editor"
          className={cn(
            "min-h-0 flex-col overflow-hidden p-4 lg:flex lg:border-r lg:p-6",
            mobileView === "edit" ? "flex" : "hidden",
          )}
        >
          <Editor />
        </section>

        {/* Live preview — the actual PDF, never an HTML approximation */}
        <section
          aria-label="Live preview"
          className={cn(
            "min-h-0 flex-col bg-muted lg:flex",
            mobileView === "preview" ? "flex" : "hidden",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b bg-background/60 px-3 py-2 sm:px-4">
            <span className="text-xs font-medium text-muted-foreground">
              Live preview
            </span>
            <div className="flex items-center gap-1">
              <DesignMenu />
              <TemplateSwitcher />
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {showPreview ? <LivePreview useImages={!isDesktop} /> : null}
          </div>
        </section>
      </div>

      {/* Mobile-only Edit / Preview switcher */}
      <nav
        aria-label="Switch between editing and preview"
        className="flex shrink-0 border-t lg:hidden"
      >
        <MobileTab
          active={mobileView === "edit"}
          onClick={() => setMobileView("edit")}
          icon={<SquarePen className="h-4 w-4" />}
          label="Edit"
        />
        <MobileTab
          active={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
          icon={<Eye className="h-4 w-4" />}
          label="Preview"
        />
      </nav>

      {/* Guided wizard — auto-shown for first-time visitors */}
      <Wizard open={wizardOpen} onOpenChange={handleWizardClose} />
    </div>
  );
}

function MobileTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
        active
          ? "border-t-2 border-primary bg-accent/50 text-primary"
          : "border-t-2 border-transparent text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
