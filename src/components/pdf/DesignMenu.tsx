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
import {
  ACCENTS,
  DENSITIES,
  DENSITY_PRESETS,
  FONTS,
  FONT_SIZES,
  LINE_RANGE,
  SPACING_RANGE,
} from "@/lib/resume/theme";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

export function DesignMenu() {
  const themeColor = useResumeStore((s) => s.resume.meta.themeColor);
  const density = useResumeStore((s) => s.resume.meta.density) ?? "standard";
  const fontFamily = useResumeStore((s) => s.resume.meta.fontFamily) ?? "helvetica";
  const fontScaleRaw = useResumeStore((s) => s.resume.meta.fontScale);
  const sectionRaw = useResumeStore((s) => s.resume.meta.sectionSpacing);
  const paragraphRaw = useResumeStore((s) => s.resume.meta.paragraphSpacing);
  const lineRaw = useResumeStore((s) => s.resume.meta.lineSpacing);

  const setThemeColor = useResumeStore((s) => s.setThemeColor);
  const setDensity = useResumeStore((s) => s.setDensity);
  const setFontFamily = useResumeStore((s) => s.setFontFamily);
  const setFontScale = useResumeStore((s) => s.setFontScale);
  const setSectionSpacing = useResumeStore((s) => s.setSectionSpacing);
  const setParagraphSpacing = useResumeStore((s) => s.setParagraphSpacing);
  const setLineSpacing = useResumeStore((s) => s.setLineSpacing);

  // Effective values: a granular field overrides the active density preset.
  const preset = DENSITY_PRESETS[density];
  const fontScale = fontScaleRaw ?? preset.fontScale;
  const sectionSpacing = sectionRaw ?? preset.sectionSpacing;
  const paragraphSpacing = paragraphRaw ?? preset.paragraphSpacing;
  const lineSpacing = lineRaw ?? preset.lineSpacing;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Design: color, font, and spacing">
          <Palette />
          <span className="hidden sm:inline">Design</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="max-h-[80vh] w-72 overflow-y-auto"
      >
        {/* Accent color */}
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

        {/* Font size */}
        <DropdownMenuLabel>Font size</DropdownMenuLabel>
        <div className="flex gap-1.5 px-2 pb-2 pt-1">
          {FONT_SIZES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFontScale(t.scale)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md border py-1.5 transition-colors",
                Math.abs(fontScale - t.scale) < 0.02
                  ? "border-primary bg-accent"
                  : "hover:bg-accent/50",
              )}
            >
              <span
                className="font-semibold leading-none"
                style={{ fontSize: t.id === "small" ? 13 : t.id === "large" ? 21 : 17 }}
              >
                A
              </span>
              <span className="text-[10px] text-muted-foreground">{t.label}</span>
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Font family */}
        <DropdownMenuLabel>Font</DropdownMenuLabel>
        <div className="flex flex-col gap-0.5 px-2 pb-2 pt-1">
          {FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFontFamily(f.id)}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors",
                fontFamily === f.id ? "bg-accent font-medium" : "hover:bg-accent/50",
              )}
            >
              <span>{f.label}</span>
              {fontFamily === f.id && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Spacing presets + manual sliders */}
        <DropdownMenuLabel>Spacing</DropdownMenuLabel>
        <div className="flex gap-1 px-2 pb-1 pt-1">
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

        <Slider
          label="Section spacing"
          value={sectionSpacing}
          min={SPACING_RANGE.min}
          max={SPACING_RANGE.max}
          onChange={setSectionSpacing}
        />
        <Slider
          label="Paragraph spacing"
          value={paragraphSpacing}
          min={SPACING_RANGE.min}
          max={SPACING_RANGE.max}
          onChange={setParagraphSpacing}
        />
        <Slider
          label="Line spacing"
          value={lineSpacing}
          min={LINE_RANGE.min}
          max={LINE_RANGE.max}
          onChange={setLineSpacing}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="px-2 pb-2 pt-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
        aria-label={label}
      />
    </div>
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
