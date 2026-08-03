"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  customIdFromKey,
  resolveSectionOrder,
  SECTION_LABELS,
} from "@/lib/resume/sections";
import type { HideableSection } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

export function SectionsMenu() {
  const meta = useResumeStore((s) => s.resume.meta);
  const customSections = useResumeStore((s) => s.resume.customSections);
  const toggleSection = useResumeStore((s) => s.toggleSection);
  const moveSection = useResumeStore((s) => s.moveSection);
  const setSectionTitle = useResumeStore((s) => s.setSectionTitle);
  const [open, setOpen] = useState(false);

  const order = resolveSectionOrder(meta, customSections ?? []);
  const hidden = new Set(meta.hiddenSections ?? []);

  const labelFor = (key: string): string => {
    const id = customIdFromKey(key);
    if (id) {
      const cs = (customSections ?? []).find((s) => s.id === id);
      return cs?.title?.trim() || "Custom section";
    }
    return SECTION_LABELS[key as HideableSection] ?? key;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Reorder or hide sections" title="Reorder or hide sections">
          <SlidersHorizontal />
          <span className="hidden sm:inline lg:hidden 2xl:inline">Sections</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sections</DialogTitle>
          <DialogDescription>
            Rename, reorder, or hide sections. Basics (your name and contact)
            always shows. Tip: ATS software looks for standard headings like
            “Experience” — rename with care.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {order.map((key, i) => {
            const isHidden = hidden.has(key);
            const isCustom = customIdFromKey(key) !== null;
            const defaultLabel = SECTION_LABELS[key as HideableSection];
            return (
              <div
                key={key}
                className="flex items-center gap-1 rounded-md border p-1.5"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={isHidden ? `Show ${labelFor(key)}` : `Hide ${labelFor(key)}`}
                  onClick={() => toggleSection(key)}
                >
                  {isHidden ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                {isCustom ? (
                  // Custom sections are renamed in the Custom editor tab.
                  <span
                    className={cn(
                      "flex-1 truncate px-2 text-sm font-medium",
                      isHidden && "text-muted-foreground line-through",
                    )}
                  >
                    {labelFor(key)}
                  </span>
                ) : (
                  <Input
                    value={meta.sectionTitles?.[key] ?? ""}
                    placeholder={defaultLabel}
                    onChange={(e) => setSectionTitle(key, e.target.value)}
                    aria-label={`${defaultLabel} heading`}
                    className={cn(
                      "h-8 flex-1 border-transparent bg-transparent px-2 text-sm font-medium shadow-none hover:border-input focus-visible:border-input",
                      isHidden && "text-muted-foreground line-through",
                    )}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Move ${labelFor(key)} up`}
                  disabled={i === 0}
                  onClick={() => moveSection(key, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Move ${labelFor(key)} down`}
                  disabled={i === order.length - 1}
                  onClick={() => moveSection(key, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
