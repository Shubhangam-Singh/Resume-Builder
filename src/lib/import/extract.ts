/**
 * File → raw text dispatcher. Picks the right client-side extractor by file
 * type and lazy-loads only what's needed. Everything stays in the browser.
 */

export type SupportedKind = "pdf" | "docx" | "txt";

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
export const ACCEPT_ATTR =
  "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.txt";

/** Maximum file size we will attempt to parse (5 MB — resumes are rarely over 1–2 MB). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Allowed MIME types — checked in addition to file extension. */
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  // Some operating systems report an empty MIME type for .txt / .docx;
  // we fall back to extension detection in detectKind() for those cases.
  "",
]);

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
    super("Unsupported file. Please upload a PDF, DOCX, or TXT resume.");
    this.name = "UnsupportedFileError";
  }
}

export class FileTooLargeError extends Error {
  constructor(limitMb: number) {
    super(`File is too large. Maximum allowed size is ${limitMb} MB.`);
    this.name = "FileTooLargeError";
  }
}

/**
 * Validates the file before any parsing begins.
 * Throws FileTooLargeError or UnsupportedFileError if the file fails validation.
 */
function validateFile(file: File): void {
  if (file.size > MAX_FILE_BYTES) {
    throw new FileTooLargeError(MAX_FILE_BYTES / (1024 * 1024));
  }

  // If the browser reports a MIME type that is not empty AND is not in our
  // allowlist, reject it immediately — even if the extension looks right.
  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new UnsupportedFileError();
  }

  // Final check: the extension must map to a known kind.
  if (detectKind(file) === null) {
    throw new UnsupportedFileError();
  }
}

export interface ExtractedResume {
  text: string;
  /** Large-font lines (PDF) or Word headings — parser hints for section headers. */
  headingLines?: string[];
  /** Link targets (Word hyperlinks) — profile / website hints. */
  links?: string[];
  /** Size and weight of short lines — lets the parser learn the heading style. */
  lineStyles?: { text: string; size: number; bold: boolean }[];
  /** A PDF whose pages have no text layer (a scan or a picture of a résumé). */
  scanned?: boolean;
}

export async function extractResume(file: File): Promise<ExtractedResume> {
  // Security: validate size and MIME type before doing any real work.
  validateFile(file);

  const kind = detectKind(file)!;
  if (kind === "pdf") {
    const { extractPdfDocument } = await import("./pdf");
    return extractPdfDocument(file);
  }
  if (kind === "docx") {
    const { extractDocxDocument } = await import("./docx");
    return extractDocxDocument(await file.arrayBuffer());
  }
  // kind === "txt"
  return { text: await file.text() };
}
