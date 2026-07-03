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
import { customIdFromKey, resolveSectionOrder } from "@/lib/resume/sections";
import type { HideableSection } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

const LABELS: Record<HideableSection, string> = {
  summary: "Summary",
  work: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certificates: "Certifications",
};

export function SectionsMenu() {
  const meta = useResumeStore((s) => s.resume.meta);
  const customSections = useResumeStore((s) => s.resume.customSections);
  const toggleSection = useResumeStore((s) => s.toggleSection);
  const moveSection = useResumeStore((s) => s.moveSection);
  const [open, setOpen] = useState(false);

  const order = resolveSectionOrder(meta, customSections ?? []);
  const hidden = new Set(meta.hiddenSections ?? []);

  const labelFor = (key: string): string => {
    const id = customIdFromKey(key);
    if (id) {
      const cs = (customSections ?? []).find((s) => s.id === id);
      return cs?.title?.trim() || "Custom section";
    }
    return LABELS[key as HideableSection] ?? key;
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
            Reorder sections or hide them from the PDF. Basics (your name and
            contact) always shows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {order.map((key, i) => {
            const isHidden = hidden.has(key);
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
                <span
                  className={cn(
                    "flex-1 text-sm font-medium",
                    isHidden && "text-muted-foreground line-through",
                  )}
                >
                  {labelFor(key)}
                </span>
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
