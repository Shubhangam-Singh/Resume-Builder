import type { ComponentType } from "react";

import type { ResumeData } from "@/lib/resume/types";
import { AtsClassic } from "./AtsClassic";

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  /** True for single-column, ATS-safe layouts. */
  atsSafe: boolean;
  component: ComponentType<{ data: ResumeData }>;
}

/**
 * Available templates. Phase 1 ships one; the gallery (Phase 3) reads this
 * list, so adding a template is just a new entry here.
 */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: "ats-classic",
    name: "ATS Classic",
    description: "Single column, standard headings. Safest for ATS parsing.",
    atsSafe: true,
    component: AtsClassic,
  },
];

export const DEFAULT_TEMPLATE_ID = "ats-classic";

export function getTemplate(id: string): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
