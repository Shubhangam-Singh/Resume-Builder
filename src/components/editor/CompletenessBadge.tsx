"use client";

import { CheckCircle2, Circle, ListChecks } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computeCompleteness } from "@/lib/resume/completeness";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

export function CompletenessBadge() {
  const resume = useResumeStore((s) => s.resume);
  const { score, items, suggestions } = computeCompleteness(resume);

  const tone =
    score >= 85
      ? "text-emerald-600"
      : score >= 60
        ? "text-amber-600"
        : "text-rose-600";
  const bar =
    score >= 85 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
          aria-label={`Resume ${score}% complete — see suggestions`}
        >
          <ListChecks className={cn("h-3.5 w-3.5", tone)} />
          <span className={tone}>{score}%</span>
          <span className="hidden text-muted-foreground sm:inline">complete</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-3">
        <div className="mb-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold">Resume completeness</span>
            <span className={cn("text-sm font-bold", tone)}>{score}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", bar)} style={{ width: `${score}%` }} />
          </div>
        </div>

        {suggestions.length === 0 ? (
          <p className="flex items-center gap-1.5 py-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Looks complete — nice work!
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {items
              .filter((it) => !it.done)
              .map((it) => (
                <li key={it.label} className="flex items-start gap-2 text-xs">
                  <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/50" />
                  <span>{it.label}</span>
                </li>
              ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
