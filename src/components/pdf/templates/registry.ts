import type { ComponentType } from "react";

import type { ResumeData } from "@/lib/resume/types";
import { AtsClassic } from "./AtsClassic";
import { Banner } from "./Banner";
import { Compact } from "./Compact";
import { Designer } from "./Designer";
import { Elegant } from "./Elegant";
import { Executive } from "./Executive";
import { Modern } from "./Modern";
import { Sidebar } from "./Sidebar";
import { Timeline } from "./Timeline";
import { Zenith } from "./Zenith";

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
  sidebar: Sidebar,
  banner: Banner,
  executive: Executive,
  elegant: Elegant,
  timeline: Timeline,
  zenith: Zenith,
};

export function getTemplateComponent(
  id: string,
): ComponentType<{ data: ResumeData }> {
  return COMPONENTS[id] ?? AtsClassic;
}
