/**
 * Accent colors, fonts, and layout density for the resume templates. Stored in
 * `resume.meta` and resolved here into concrete values (colors, font family,
 * and scaling functions) the templates apply.
 */
import type { ResumeMeta } from "./types";

export interface AccentOption {
  id: string;
  label: string;
  hex: string;
}

/** Curated, print-readable accents (dark enough to read on white). */
export const ACCENTS: AccentOption[] = [
  { id: "charcoal", label: "Charcoal", hex: "#1f2937" },
  { id: "royal-blue", label: "Royal Blue", hex: "#2563eb" },
  { id: "indigo", label: "Indigo", hex: "#4f46e5" },
  { id: "emerald", label: "Emerald", hex: "#047857" },
  { id: "teal", label: "Teal", hex: "#0e7490" },
  { id: "amber", label: "Amber", hex: "#b45309" },
  { id: "coral", label: "Coral", hex: "#e11d48" },
];

export function resolveAccent(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return ACCENTS.find((a) => a.id === id)?.hex ?? fallback;
}

// ---- Fonts ----------------------------------------------------------------
// Built-in PDF fonts need no files; the rest are bundled TTFs in public/fonts,
// registered lazily (fonts.ts / ensureFontRegistered) so they embed in the PDF
// and work offline.

export interface FontOption {
  id: string;
  label: string;
  regular: string;
  bold: string;
}

export const FONTS: FontOption[] = [
  // ── Built-in PDF fonts (no registration, no files) ───────────────────────
  { id: "helvetica", label: "Helvetica (Sans)", regular: "Helvetica", bold: "Helvetica-Bold" },
  { id: "times", label: "Times (Serif)", regular: "Times-Roman", bold: "Times-Bold" },
  { id: "courier", label: "Courier (Mono)", regular: "Courier", bold: "Courier-Bold" },
  // ── Bundled TTFs (public/fonts), registered via ensureFontRegistered ──────
  { id: "lato", label: "Lato (Sans)", regular: "Lato", bold: "Lato-Bold" },
  { id: "poppins", label: "Poppins (Sans)", regular: "Poppins", bold: "Poppins-Bold" },
  { id: "crimson", label: "Crimson (Serif)", regular: "Crimson Text", bold: "Crimson Text-Bold" },
];

export interface ResolvedFont {
  regular: string;
  bold: string;
}

export function resolveFont(id: string | undefined): ResolvedFont {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

// ---- Font size tiers (Small / Normal / Large) -----------------------------

export const FONT_SIZES: { id: string; label: string; scale: number }[] = [
  { id: "small", label: "Small", scale: 0.92 },
  { id: "normal", label: "Normal", scale: 1 },
  { id: "large", label: "Large", scale: 1.1 },
];

// ---- Density presets (quick-set the spacing sliders) ----------------------

export type Density = "compact" | "standard" | "loose";

export const DENSITIES: { id: Density; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "standard", label: "Standard" },
  { id: "loose", label: "Loose" },
];

interface Preset {
  fontScale: number;
  lineSpacing: number;
  sectionSpacing: number;
  paragraphSpacing: number;
}

export const DENSITY_PRESETS: Record<Density, Preset> = {
  compact: { fontScale: 0.92, lineSpacing: 0.92, sectionSpacing: 0.78, paragraphSpacing: 0.82 },
  standard: { fontScale: 1, lineSpacing: 1, sectionSpacing: 1, paragraphSpacing: 1 },
  loose: { fontScale: 1.06, lineSpacing: 1.08, sectionSpacing: 1.25, paragraphSpacing: 1.22 },
};

/** Slider ranges (min / max) for the manual spacing controls. */
export const SPACING_RANGE = { min: 0.6, max: 1.5 } as const;
export const LINE_RANGE = { min: 0.85, max: 1.5 } as const;

// ---- Scaling --------------------------------------------------------------

export interface Scale {
  /** font size (font-size tier) */
  f: (n: number) => number;
  /** line height (line-spacing slider) */
  l: (n: number) => number;
  /** section-level + general spacing (section-spacing slider) */
  s: (n: number) => number;
  /** paragraph/entry spacing (paragraph-spacing slider) */
  sp: (n: number) => number;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Build the scaling functions from `meta`. Each granular field overrides the
 * active density preset, so old (density-only) resumes still scale sensibly.
 */
export function makeScale(meta: ResumeMeta): Scale {
  const preset = DENSITY_PRESETS[meta.density ?? "standard"] ?? DENSITY_PRESETS.standard;
  const fontScale = clamp(meta.fontScale ?? preset.fontScale, 0.8, 1.25);
  const line = clamp(meta.lineSpacing ?? preset.lineSpacing, LINE_RANGE.min, LINE_RANGE.max);
  const section = clamp(meta.sectionSpacing ?? preset.sectionSpacing, SPACING_RANGE.min, SPACING_RANGE.max);
  const para = clamp(meta.paragraphSpacing ?? preset.paragraphSpacing, SPACING_RANGE.min, SPACING_RANGE.max);
  const round = (n: number, p = 10) => Math.round(n * p) / p;
  return {
    f: (n) => round(n * fontScale),
    l: (n) => round(n * line, 100),
    s: (n) => round(n * section),
    sp: (n) => round(n * para),
  };
}
