import { createElement, type ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";

import { prepareUploadedFont } from "@/lib/resume/fonts";
import type { ResumeData } from "@/lib/resume/types";
import { getTemplateComponent } from "./templates/registry";

/**
 * Renders the resume as a React-PDF <Document> using the template selected in
 * `data.meta.template`. This component is the single source rendered by BOTH
 * the live preview and the file download, guaranteeing they never diverge.
 */
export function ResumeDocument({ data }: { data: ResumeData }) {
  prepareUploadedFont(data.meta.uploadedFont);
  const Template = getTemplateComponent(data.meta.template);
  return <Template data={data} />;
}

/**
 * Build the document element typed as React-PDF expects. The wrapper component
 * ultimately returns a <Document>, but its props are `{ data }`, so we assert
 * the element type that `pdf()` and `<PDFViewer>` require.
 */
export function buildResumeDocument(
  data: ResumeData,
): ReactElement<DocumentProps> {
  return createElement(ResumeDocument, { data }) as unknown as ReactElement<
    DocumentProps
  >;
}
