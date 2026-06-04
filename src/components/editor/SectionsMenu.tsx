"use client";

import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HideableSection } from "@/lib/resume/types";
import { useResumeStore } from "@/lib/store";

const SECTIONS: { key: HideableSection; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "work", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "certificates", label: "Certifications" },
];

export function SectionsMenu() {
  const hidden = useResumeStore((s) => s.resume.meta.hiddenSections ?? []);
  const toggleSection = useResumeStore((s) => s.toggleSection);
  const hiddenSet = new Set(hidden);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Show or hide sections">
          <Eye />
          <span className="hidden sm:inline">Sections</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show in PDF</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SECTIONS.map(({ key, label }) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={!hiddenSet.has(key)}
            onCheckedChange={() => toggleSection(key)}
            onSelect={(e) => e.preventDefault()}
          >
            {label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
