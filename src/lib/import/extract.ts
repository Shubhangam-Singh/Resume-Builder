/**
 * File → raw text dispatcher. Picks the right client-side extractor by file
 * type and lazy-loads only what's needed. Everything stays in the browser.
 */

export type SupportedKind = "pdf" | "docx" | "txt";

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
export const ACCEPT_ATTR =
  "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.txt";

export function detectKind(file: File): SupportedKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (name.endsWith(".txt") || file.type === "text/plain") return "txt";
  return null;
}

export class UnsupportedFileError extends Error {
  constructor() {
    super("Unsupported file. Please upload a PDF, DOCX, or TXT résumé.");
    this.name = "UnsupportedFileError";
  }
}

export async function extractText(file: File): Promise<string> {
  const kind = detectKind(file);
  if (kind === "pdf") {
    const { extractPdfText } = await import("./pdf");
    return extractPdfText(file);
  }
  if (kind === "docx") {
    const { extractDocxText } = await import("./docx");
    return extractDocxText(file);
  }
  if (kind === "txt") {
    return file.text();
  }
  throw new UnsupportedFileError();
}
