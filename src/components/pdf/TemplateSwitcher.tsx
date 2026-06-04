"use client";

import { ChevronDown, ShieldAlert, ShieldCheck } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTemplateMeta, TEMPLATES } from "@/components/pdf/templates/meta";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

export function TemplateSwitcher() {
  const templateId = useResumeStore((s) => s.resume.meta.template);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const current = getTemplateMeta(templateId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Change template"
        >
          {current.atsSafe ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>{current.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Template</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={templateId} onValueChange={setTemplate}>
          {TEMPLATES.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id}>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{t.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                      t.atsSafe
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {t.atsSafe ? "ATS-safe" : "May reduce ATS"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t.description}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
