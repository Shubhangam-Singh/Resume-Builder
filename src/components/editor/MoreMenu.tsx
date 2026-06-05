"use client";

import { useRef, useState } from "react";
import {
  Download,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";

import { AiSettings } from "@/components/ai/AiSettings";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadResumeJson, parseResumeJson } from "@/lib/persist/json";
import { useResumeStore } from "@/lib/store";

export function MoreMenu() {
  const resume = useResumeStore((s) => s.resume);
  const setResume = useResumeStore((s) => s.setResume);
  const loadSample = useResumeStore((s) => s.loadSample);
  const resetResume = useResumeStore((s) => s.resetResume);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aiOpen, setAiOpen] = useState(false);

  async function handleJsonFile(file: File | undefined) {
    if (!file) return;
    try {
      setResume(parseResumeJson(await file.text()));
    } catch {
      alert("That doesn't look like a valid résumé JSON file.");
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
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Data</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => downloadResumeJson(resume)}>
            <Download />
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <Upload />
            Import from JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              confirmThen(
                "Replace the current résumé with the sample content?",
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
                "Clear all fields and start from a blank résumé? This can't be undone.",
                resetResume,
              )
            }
          >
            <RotateCcw />
            Start blank
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAiOpen(true)}>
            <Wand2 />
            AI bullet helper…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AiSettings open={aiOpen} onOpenChange={setAiOpen} />

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
