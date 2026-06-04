import type { ComponentType } from "react";

import type { ResumeData } from "@/lib/resume/types";
import { AtsClassic } from "./AtsClassic";
import { Compact } from "./Compact";
import { Designer } from "./Designer";
import { Modern } from "./Modern";

/**
 * Maps a template id to its React-PDF component. This module imports
 * `@react-pdf/renderer` (via the templates), so it must only ever be reached
 * through the dynamically-imported preview/download — never from SSR'd UI. UI
 * that just needs names/badges should import `./meta` instead.
 */
const COMPONENTS: Record<string, ComponentType<{ data: ResumeData }>> = {
  "ats-classic": AtsClassic,
  modern: Modern,
  compact: Compact,
  designer: Designer,
};

export function getTemplateComponent(
  id: string,
): ComponentType<{ data: ResumeData }> {
  return COMPONENTS[id] ?? AtsClassic;
}
