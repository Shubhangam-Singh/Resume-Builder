"use client";

import { Check, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCENTS, DENSITIES } from "@/lib/resume/theme";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

export function DesignMenu() {
  const themeColor = useResumeStore((s) => s.resume.meta.themeColor);
  const density = useResumeStore((s) => s.resume.meta.density) ?? "standard";
  const setThemeColor = useResumeStore((s) => s.setThemeColor);
  const setDensity = useResumeStore((s) => s.setDensity);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Design: accent color and density">
          <Palette />
          <span className="hidden sm:inline">Design</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Accent color</DropdownMenuLabel>
        <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
          <Swatch
            label="Template default"
            active={!themeColor}
            onClick={() => setThemeColor(undefined)}
          />
          {ACCENTS.map((a) => (
            <Swatch
              key={a.id}
              label={a.label}
              color={a.hex}
              active={themeColor === a.id}
              onClick={() => setThemeColor(a.id)}
            />
          ))}
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Density</DropdownMenuLabel>
        <p className="px-2 pb-1 text-xs text-muted-foreground">
          Squeeze or relax spacing to fit the page.
        </p>
        <div className="flex gap-1 px-2 pb-2">
          {DENSITIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDensity(d.id)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1 text-xs transition-colors",
                density === d.id
                  ? "border-primary bg-accent font-medium"
                  : "hover:bg-accent/50",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Swatch({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow",
        active && "ring-2 ring-ring",
      )}
      style={
        color
          ? { backgroundColor: color }
          : {
              backgroundImage:
                "linear-gradient(135deg, #334155 0 50%, #94a3b8 50% 100%)",
            }
      }
    >
      {active ? <Check className="h-3.5 w-3.5 text-white" /> : null}
    </button>
  );
}
