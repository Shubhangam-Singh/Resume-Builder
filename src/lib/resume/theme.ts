/**
 * Accent colors + layout density for the résumé templates. Stored in
 * `resume.meta` (themeColor / density) and resolved here into concrete values
 * the templates apply to section titles, links, borders, fonts and spacing.
 */

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

/** Resolve a stored accent id to a hex, falling back to a template default. */
export function resolveAccent(id: string | undefined, fallback: string): string {
  if (!id) return fallback;
  return ACCENTS.find((a) => a.id === id)?.hex ?? fallback;
}

export type Density = "compact" | "standard" | "loose";

export const DENSITIES: { id: Density; label: string }[] = [
  { id: "compact", label: "Compact" },
  { id: "standard", label: "Standard" },
  { id: "loose", label: "Loose" },
];

interface DensityScale {
  font: number; // multiplies every font size
  space: number; // multiplies margins / padding
  line: number; // multiplies line heights
}

const DENSITY_SCALE: Record<Density, DensityScale> = {
  compact: { font: 0.9, space: 0.76, line: 0.94 },
  standard: { font: 1, space: 1, line: 1 },
  loose: { font: 1.06, space: 1.26, line: 1.07 },
};

export interface Scale {
  /** font size */
  f: (n: number) => number;
  /** spacing (margin / padding) */
  s: (n: number) => number;
  /** line height */
  l: (n: number) => number;
}

/** Build the scaling functions a template applies to its base style values. */
export function makeScale(density: Density | undefined): Scale {
  const d = DENSITY_SCALE[density ?? "standard"];
  const round = (n: number, p = 10) => Math.round(n * p) / p;
  return {
    f: (n) => round(n * d.font),
    s: (n) => round(n * d.space),
    l: (n) => round(n * d.line, 100),
  };
}
