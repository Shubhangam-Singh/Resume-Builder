import { resolveSectionOrder } from "@/lib/resume/sections";
import type { ResumeData } from "@/lib/resume/types";

/**
 * A key that changes only when the document *structure* changes (template,
 * section order/visibility, or layout styling) — not on plain text edits.
 *
 * Used to remount the PDF viewer on structural change: React-PDF reconciles
 * updates against one persistent renderer instance, and its reconciler
 * mishandles reordering keyed siblings (sections), duplicating them. A fresh
 * mount sidesteps that. Lives in its own lightweight module so LivePreview can
 * import it without pulling in the heavy @react-pdf bundle.
 */
export function structureKey(data: ResumeData): string {
  const m = data.meta;
  return [
    m.template,
    resolveSectionOrder(m).join(","),
    (m.hiddenSections ?? []).join(","),
    m.themeColor ?? "",
    m.secondaryColor ?? "",
    m.density ?? "",
    m.fontFamily ?? "",
    m.fontScale ?? "",
    m.lineSpacing ?? "",
    m.sectionSpacing ?? "",
    m.paragraphSpacing ?? "",
  ].join("|");
}
