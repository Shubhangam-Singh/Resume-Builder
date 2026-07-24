"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Eye, FileText, Highlighter as HighlighterIcon, Loader2, Search, ShieldCheck, SquarePen } from "lucide-react";

const PageCountBadge = dynamic(
  () => import("@/components/pdf/PageCountBadge").then((m) => m.PageCountBadge),
  { ssr: false },
);

import { DownloadButton } from "@/components/pdf/DownloadButton";
import { DesignMenu } from "@/components/pdf/DesignMenu";
import { LivePreview } from "@/components/pdf/LivePreview";
import { TemplateSwitcher } from "@/components/pdf/TemplateSwitcher";
import { ImportResume } from "@/components/import/ImportResume";
import { AtsChecker } from "@/components/ats/AtsChecker";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import { Toaster } from "@/components/Toaster";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { useResumePersistence } from "@/lib/persist/useResumePersistence";
import { prewarmPdfRenderer } from "@/lib/pdf/render";
import { Wizard, wizardIsDone, markWizardDone } from "@/components/onboarding/Wizard";
import { clearShareParam, decodeResumeFromUrl } from "@/lib/share/url";
import { useResumeStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { SaveIndicator } from "./SaveIndicator";
import { ScoreBadge } from "./ScoreDashboard";
import { Editor } from "./Editor";
import { MoreMenu } from "./MoreMenu";
import { ResumeManager } from "./ResumeManager";
import { SectionsMenu } from "./SectionsMenu";
import { UndoRedo } from "./UndoRedo";
import { AgencyBrandingDialog } from "./AgencyBrandingDialog";
import { HighlighterDialog } from "./HighlighterDialog";

const HighlightModePreviewDynamic = dynamic(
  () => import("@/components/pdf/HighlightModePreview").then((m) => m.HighlightModePreview),
  { ssr: false },
);

type MobileView = "edit" | "preview";

export function Workspace() {
  const hydrated = useResumePersistence();
  const setResume = useResumeStore((s) => s.setResume);
  const resume = useResumeStore((s) => s.resume);
  const [mobileView, setMobileView] = useState<MobileView>("edit");
  const [highlightMode, setHighlightMode] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [wizardOpen, setWizardOpen] = useState(false);
  const openDialog = useUiStore((s) => s.openDialog);

  // Boot the PDF worker during idle time so the first preview is instant.
  useEffect(() => {
    prewarmPdfRenderer();
  }, []);

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
      <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b px-3 py-2 sm:px-4 lg:flex-nowrap lg:px-6 lg:py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground lg:h-9 lg:w-9">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold leading-tight lg:text-base">
                ResumeForge
              </h1>
              <AgencyBrandingDialog />
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Free, private, ATS-friendly resume builder
            </p>
          </div>
        </div>

        <nav
          aria-label="Resume actions"
          className="flex flex-wrap items-center justify-end gap-1.5 lg:flex-nowrap"
        >
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 min-[1700px]:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            Runs entirely in your browser
          </span>
          <ScoreBadge />
          <button
            type="button"
            onClick={() => openDialog("palette")}
            title="Command palette (Ctrl+K)"
            aria-label="Open command palette"
            className="hidden items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="hidden rounded border bg-muted px-1 text-[10px] xl:inline">
              Ctrl K
            </kbd>
          </button>
          <UndoRedo />
          <ResumeManager />
          <SaveIndicator />
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

        {/* Live preview — PDF viewer or Highlight Mode */}
        <section
          aria-label="Live preview"
          className={cn(
            "min-h-0 flex-col bg-muted lg:flex",
            mobileView === "preview" ? "flex" : "hidden",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b bg-background/60 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {highlightMode ? "Highlight mode" : "Live preview"}
              </span>
              {!highlightMode && <PageCountBadge />}
            </div>
            <div className="flex items-center gap-1">
              {/* Highlight mode toggle */}
              <button
                type="button"
                onClick={() => setHighlightMode((v) => !v)}
                title={highlightMode ? "Exit highlight mode" : "Enter highlight mode — select text to highlight"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  highlightMode
                    ? "border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-300"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <HighlighterIcon className="h-3.5 w-3.5" />
                Highlight
              </button>
              <HighlighterDialog />
              <DesignMenu />
              <TemplateSwitcher />
            </div>
          </div>
          <div className="min-h-0 flex-1">
            {highlightMode ? (
              <HighlightModePreviewDynamic data={resume} />
            ) : showPreview ? (
              <LivePreview useImages={!isDesktop} />
            ) : null}
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

      {/* Ctrl+K command palette, and the "?" shortcut reference */}
      <CommandPalette />
      <ShortcutsDialog />

      {/* Toast notifications */}
      <Toaster />
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
