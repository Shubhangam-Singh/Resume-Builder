import type { ResumeData } from "@/lib/resume/types";

/**
 * Print the resume by generating the real PDF and opening the browser's print
 * dialog on it via a hidden iframe — so the printout is pixel-identical to the
 * downloaded file rather than an HTML approximation. Everything stays local.
 */
export async function printResume(resume: ResumeData): Promise<void> {
  const { renderResumePdf } = await import("@/lib/pdf/render");
  const blob = await renderResumePdf(resume);
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");

  const cleanup = () => {
    URL.revokeObjectURL(url);
    iframe.remove();
  };

  iframe.onload = () => {
    // Give the embedded PDF viewer a moment to lay out before printing.
    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // Pop-up/sandbox restrictions — fall back to opening in a new tab.
        window.open(url, "_blank");
      }
      // Best-effort cleanup once the dialog has had time to capture the doc.
      window.setTimeout(cleanup, 60_000);
    }, 300);
  };

  iframe.src = url;
  document.body.appendChild(iframe);
}
