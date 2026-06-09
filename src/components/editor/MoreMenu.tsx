"use client";

import { useRef, useState } from "react";
import {
  Briefcase,
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
import { RoleSamples } from "@/components/editor/RoleSamples";
import { ShareDialog } from "@/components/editor/ShareDialog";
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
import { downloadResumeText } from "@/lib/export/text";
import { downloadResumeJson, parseResumeJson } from "@/lib/persist/json";
import { useResumeStore } from "@/lib/store";

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

  async function handleJsonFile(file: File | undefined) {
    if (!file) return;
    try {
      setResume(parseResumeJson(await file.text()));
    } catch {
      alert("That doesn't look like a valid resume JSON file.");
    }
  }

  async function exportDocx() {
    try {
      const m = await import("@/lib/export/docx");
      await m.downloadResumeDocx(resume);
    } catch (err) {
      console.error("DOCX export failed", err);
      alert("Sorry — something went wrong creating the Word file.");
    }
  }

  async function print() {
    try {
      const m = await import("@/lib/export/print");
      await m.printResume(resume);
    } catch (err) {
      console.error("Print failed", err);
      alert("Sorry — something went wrong preparing the print.");
    }
  }

  function confirmThen(message: string, action: () => void) {
    if (window.confirm(message)) action();
  }

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
              confirmThen(
                "Replace the current resume with the sample content?",
                loadSample,
              )
            }
          >
            <Sparkles />
            Load sample
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              confirmThen(
                "Clear all fields and start from a blank resume? You can undo with Ctrl+Z.",
                resetResume,
              )
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
