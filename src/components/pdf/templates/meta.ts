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
];

export const DEFAULT_TEMPLATE_ID = "ats-classic";

export function getTemplateMeta(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
