"use client";

import { useRef } from "react";
import { Check, Palette, Trash2, Upload } from "lucide-react";

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
  THEME_PRESETS,
} from "@/lib/resume/theme";
import type { DateFormat } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

const DATE_FORMATS: { id: DateFormat; label: string; example: string }[] = [
  { id: "short", label: "Short month", example: "Mar 2021" },
  { id: "long", label: "Full month", example: "March 2021" },
  { id: "numeric", label: "Numeric", example: "03/2021" },
  { id: "iso", label: "ISO", example: "2021-03" },
  { id: "year", label: "Year only", example: "2021" },
];

export function DesignMenu() {
  const themeColor = useResumeStore((s) => s.resume.meta.themeColor);
  const secondaryColor = useResumeStore((s) => s.resume.meta.secondaryColor);
  const density = useResumeStore((s) => s.resume.meta.density) ?? "standard";
  const fontFamily = useResumeStore((s) => s.resume.meta.fontFamily) ?? "helvetica";
  const uploadedFont = useResumeStore((s) => s.resume.meta.uploadedFont);
  const dateFormat = useResumeStore((s) => s.resume.meta.dateFormat) ?? "short";
  const pageSize = useResumeStore((s) => s.resume.meta.pageSize) ?? "LETTER";
  const fontScaleRaw = useResumeStore((s) => s.resume.meta.fontScale);
  const sectionRaw = useResumeStore((s) => s.resume.meta.sectionSpacing);
  const paragraphRaw = useResumeStore((s) => s.resume.meta.paragraphSpacing);
  const lineRaw = useResumeStore((s) => s.resume.meta.lineSpacing);

  const setThemeColor = useResumeStore((s) => s.setThemeColor);
  const setThemePreset = useResumeStore((s) => s.setThemePreset);
  const setDensity = useResumeStore((s) => s.setDensity);
  const setFontFamily = useResumeStore((s) => s.setFontFamily);
  const setFontScale = useResumeStore((s) => s.setFontScale);
  const setDateFormat = useResumeStore((s) => s.setDateFormat);
  const setSectionSpacing = useResumeStore((s) => s.setSectionSpacing);
  const setParagraphSpacing = useResumeStore((s) => s.setParagraphSpacing);
  const setLineSpacing = useResumeStore((s) => s.setLineSpacing);
  const setUploadedFont = useResumeStore((s) => s.setUploadedFont);
  const setPageSize = useResumeStore((s) => s.setPageSize);

  const fontInputRef = useRef<HTMLInputElement>(null);

  function handleFontFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".ttf")) {
      alert("Only .ttf files are supported by the PDF renderer.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Derive family name from filename: "MyFont-Regular.ttf" → "MyFont-Regular"
      const family = file.name.replace(/\.ttf$/i, "").replace(/[-_]/g, " ");
      setUploadedFont({ family, dataUrl });
      setFontFamily(family);
    };
    reader.readAsDataURL(file);
  }

  function removeCustomFont() {
    setUploadedFont(undefined);
    setFontFamily("helvetica");
  }

  // Effective values: a granular field overrides the active density preset.
  const preset = DENSITY_PRESETS[density];
  const fontScale = fontScaleRaw ?? preset.fontScale;
  const sectionSpacing = sectionRaw ?? preset.sectionSpacing;
  const paragraphSpacing = paragraphRaw ?? preset.paragraphSpacing;
  const lineSpacing = lineRaw ?? preset.lineSpacing;

  return (
    <>
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
        {/* Color theme presets */}
        <DropdownMenuLabel>Color themes</DropdownMenuLabel>
        <div className="grid grid-cols-2 gap-1.5 px-2 pb-2 pt-1">
          {THEME_PRESETS.map((p) => {
            const active = themeColor === p.accent && secondaryColor === p.secondary;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setThemePreset(p.accent, p.secondary)}
                title={p.label}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                  active ? "border-primary bg-accent font-medium" : "hover:bg-accent/50",
                )}
              >
                <span className="flex shrink-0 overflow-hidden rounded-full" style={{ width: 20, height: 20 }}>
                  <span className="flex-1" style={{ background: p.accent }} />
                  <span className="flex-1" style={{ background: p.secondary }} />
                </span>
                <span className="truncate">{p.label}</span>
                {active && <Check className="ml-auto h-3 w-3 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {/* Individual accent swatches */}
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
          {/* Uploaded custom font */}
          {uploadedFont && (
            <div
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1 text-xs",
                fontFamily === uploadedFont.family ? "bg-accent font-medium" : "",
              )}
            >
              <button
                type="button"
                onClick={() => setFontFamily(uploadedFont.family)}
                className="flex-1 text-left"
              >
                <span className="truncate">{uploadedFont.family}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">(custom)</span>
              </button>
              <button
                type="button"
                onClick={removeCustomFont}
                title="Remove custom font"
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
          {/* Upload custom font */}
          <button
            type="button"
            onClick={() => fontInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <Upload className="h-3 w-3" />
            Upload .ttf font…
          </button>
        </div>

        <DropdownMenuSeparator />

        {/* Paper size */}
        <DropdownMenuLabel>Paper size</DropdownMenuLabel>
        <div className="flex gap-1.5 px-2 pb-2 pt-1">
          {(
            [
              { id: "LETTER", label: "US Letter", hint: "8.5 × 11 in" },
              { id: "A4", label: "A4", hint: "210 × 297 mm" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPageSize(p.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md border py-1.5 transition-colors",
                pageSize === p.id ? "border-primary bg-accent font-medium" : "hover:bg-accent/50",
              )}
            >
              <span className="text-xs">{p.label}</span>
              <span className="text-[10px] text-muted-foreground">{p.hint}</span>
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Date format */}
        <DropdownMenuLabel>Date format</DropdownMenuLabel>
        <div className="flex flex-col gap-0.5 px-2 pb-2 pt-1">
          {DATE_FORMATS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDateFormat(d.id)}
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors",
                dateFormat === d.id ? "bg-accent font-medium" : "hover:bg-accent/50",
              )}
            >
              <span>{d.label}</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {d.example}
                </span>
                {dateFormat === d.id && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                )}
              </span>
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

    <input
      ref={fontInputRef}
      type="file"
      accept=".ttf"
      className="hidden"
      onChange={(e) => {
        handleFontFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  </>
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
