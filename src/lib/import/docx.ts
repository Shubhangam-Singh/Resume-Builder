/**
 * Client-side DOCX text extraction via mammoth. Lazy-loaded so the bundle is
 * only fetched when a user imports a .docx file.
 */
export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value ?? "";
}
