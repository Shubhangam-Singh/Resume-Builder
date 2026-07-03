import { renderResumePdf } from "@/lib/pdf/render";
import type { ResumeData } from "@/lib/resume/types";

export function resumePdfFileName(name: string): string {
  const base = (name || "resume")
    .trim()
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "resume"}_Resume.pdf`;
}

/** Render the resume and trigger a browser download of the PDF. */
export async function downloadResumePdf(resume: ResumeData): Promise<void> {
  const blob = await renderResumePdf(resume);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = resumePdfFileName(resume.basics.name);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
