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
];

export const DEFAULT_TEMPLATE_ID = "ats-classic";

export function getTemplateMeta(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
