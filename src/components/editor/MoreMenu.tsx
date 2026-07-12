"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Crosshair,
  Download,
  FileText,
  FileType,
  History,
  LayoutTemplate,
  Link2,
  MoreHorizontal,
  Printer,
  RotateCcw,
  Share2,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";

import { AiSettings } from "@/components/ai/AiSettings";
import { ApplyTracker } from "@/components/editor/ApplyTracker";
import { CoverLetterDialog } from "@/components/editor/CoverLetterDialog";
import { RoleSamples } from "@/components/editor/RoleSamples";
import { ShareDialog } from "@/components/editor/ShareDialog";
import { TailorDialog } from "@/components/editor/TailorDialog";
import { VersionHistory } from "@/components/editor/VersionHistory";
import { LinkedInImport } from "@/components/import/LinkedInImport";
import { Wizard } from "@/components/onboarding/Wizard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { downloadResumeText } from "@/lib/export/text";
import { downloadResumeJson, parseResumeJson } from "@/lib/persist/json";
import { toast } from "@/lib/toast";
import { useResumeStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";

export function MoreMenu() {
  const resume = useResumeStore((s) => s.resume);
  const setResume = useResumeStore((s) => s.setResume);
  const loadSample = useResumeStore((s) => s.loadSample);
  const resetResume = useResumeStore((s) => s.resetResume);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [roleSamplesOpen, setRoleSamplesOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [tailorOpen, setTailorOpen] = useState(false);

  // The command palette requests dialogs through the UI store; consume the
  // request here since this component owns the dialog instances.
  const dialogRequest = useUiStore((s) => s.dialog);
  const closeDialogRequest = useUiStore((s) => s.closeDialog);
  useEffect(() => {
    if (!dialogRequest) return;
    const openers: Partial<Record<string, () => void>> = {
      share: () => setShareOpen(true),
      "version-history": () => setVersionOpen(true),
      "apply-tracker": () => setTrackerOpen(true),
      "ai-settings": () => setAiOpen(true),
      "cover-letter": () => setCoverLetterOpen(true),
      "linkedin-import": () => setLinkedinOpen(true),
      "role-samples": () => setRoleSamplesOpen(true),
      wizard: () => setWizardOpen(true),
      tailor: () => setTailorOpen(true),
    };
    const opener = openers[dialogRequest];
    if (opener) {
      opener();
      closeDialogRequest();
    }
  }, [dialogRequest, closeDialogRequest]);

  async function handleJsonFile(file: File | undefined) {
    if (!file) return;
    try {
      setResume(parseResumeJson(await file.text()));
      toast("Resume imported.", "success");
    } catch {
      toast("That doesn't look like a valid resume JSON file.", "error");
    }
  }

  async function exportDocx() {
    try {
      const m = await import("@/lib/export/docx");
      await m.downloadResumeDocx(resume);
    } catch (err) {
      console.error("DOCX export failed", err);
      toast("Something went wrong creating the Word file.", "error");
    }
  }

  async function print() {
    try {
      const m = await import("@/lib/export/print");
      await m.printResume(resume);
    } catch (err) {
      console.error("Print failed", err);
      toast("Something went wrong preparing the print.", "error");
    }
  }

  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    action: () => void;
  } | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 max-h-[85vh] overflow-y-auto"
        >
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => void exportDocx()}>
            <FileType />
            Export as Word (.docx)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => downloadResumeText(resume)}>
            <FileText />
            Export as plain text
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void print()}>
            <Printer />
            Print…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => downloadResumeJson(resume)}>
            <Download />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setShareOpen(true)}>
            <Share2 />
            Share as link…
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Import</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <Upload />
            Import from JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLinkedinOpen(true)}>
            <Link2 />
            Import from LinkedIn…
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Tools</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setVersionOpen(true)}>
            <History />
            Version history…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTrackerOpen(true)}>
            <Briefcase />
            Application tracker…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAiOpen(true)}>
            <Wand2 />
            AI bullet helper…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTailorOpen(true)}>
            <Crosshair />
            Tailor for a job…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCoverLetterOpen(true)}>
            <FileText />
            Cover letter…
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Start fresh</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setWizardOpen(true)}>
            <Wand2 />
            Resume wizard (guided)…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRoleSamplesOpen(true)}>
            <LayoutTemplate />
            Start from a role template…
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              setConfirm({
                title: "Load the sample resume?",
                description: "This replaces your current resume with the sample content. You can undo with Ctrl+Z.",
                action: loadSample,
              })
            }
          >
            <Sparkles />
            Load sample
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              setConfirm({
                title: "Start from a blank resume?",
                description: "This clears every field. You can undo with Ctrl+Z.",
                action: resetResume,
              })
            }
          >
            <RotateCcw />
            Start blank
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AiSettings open={aiOpen} onOpenChange={setAiOpen} />
      <VersionHistory open={versionOpen} onOpenChange={setVersionOpen} />
      <ApplyTracker open={trackerOpen} onOpenChange={setTrackerOpen} />
      <LinkedInImport open={linkedinOpen} onOpenChange={setLinkedinOpen} />
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      <RoleSamples open={roleSamplesOpen} onOpenChange={setRoleSamplesOpen} />
      <Wizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <CoverLetterDialog open={coverLetterOpen} onOpenChange={setCoverLetterOpen} />
      <TailorDialog open={tailorOpen} onOpenChange={setTailorOpen} />
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
        title={confirm?.title ?? ""}
        description={confirm?.description}
        onConfirm={() => confirm?.action()}
      />

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void handleJsonFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}
