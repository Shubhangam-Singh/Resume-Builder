/**
 * Template metadata — intentionally free of any `@react-pdf/renderer` imports so
 * that lightweight UI (the template switcher) can list templates without pulling
 * the heavy PDF renderer into the initial/SSR bundle. The actual template
 * components live in `registry.ts`, which is only loaded client-side via the
 * dynamically-imported preview/download.
 */

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  /** True for single-column, ATS-safe layouts. */
  atsSafe: boolean;
  /** True if the template renders a profile photo. */
  supportsPhoto?: boolean;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "ats-classic",
    name: "ATS Classic",
    description: "Single column, standard headings. Safest for ATS parsing.",
    atsSafe: true,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Single column with a subtle blue accent. ATS-safe.",
    atsSafe: true,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Denser layout that fits more on one page. ATS-safe.",
    atsSafe: true,
  },
  {
    id: "designer",
    name: "Designer",
    description:
      "Two-column with a tinted sidebar. Best for human reviewers; may reduce ATS compatibility.",
    atsSafe: false,
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description:
      "Profile-card left column with a photo, beside a main column. Photo; may reduce ATS compatibility.",
    atsSafe: false,
    supportsPhoto: true,
  },
  {
    id: "banner",
    name: "Banner",
    description:
      "Bold accent header band with a photo and chip section labels. Photo; may reduce ATS compatibility.",
    atsSafe: false,
    supportsPhoto: true,
  },
  {
    id: "executive",
    name: "Executive",
    description:
      "Structured header (name left, contact right) with accent-underlined headings. ATS-safe.",
    atsSafe: true,
  },
  {
    id: "elegant",
    name: "Elegant",
    description:
      "Centered, airy layout with serif-friendly headings. ATS-safe; pairs nicely with a serif font.",
    atsSafe: true,
  },
  {
    id: "timeline",
    name: "Timeline",
    description:
      "Single column with a vertical timeline down your experience. ATS-safe.",
    atsSafe: true,
  },
  {
    id: "zenith",
    name: "Zenith",
    description:
      "Editorial layout with section labels in a slim left margin. May reduce ATS compatibility.",
    atsSafe: false,
  },
  {
    id: "ivy-league",
    name: "Ivy League",
    description:
      "A highly formal, academic, and corporate-standard template with traditional headings. ATS-safe.",
    atsSafe: true,
  },
  {
    id: "metro",
    name: "Metro Dashboard",
    description:
      "A grid-based layout wrapping major sections in thin card-like borders. May reduce ATS compatibility.",
    atsSafe: false,
  },
];

export const DEFAULT_TEMPLATE_ID = "ats-classic";

export function getTemplateMeta(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
