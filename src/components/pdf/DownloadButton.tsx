"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/lib/store";
import { useAgencyStore } from "@/lib/agency-store";

function makeFileName(name: string): string {
  const base = (name || "resume")
    .trim()
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "resume"}_Resume.pdf`;
}

export function DownloadButton() {
  const resume = useResumeStore((s) => s.resume);
  const agencyBranding = useAgencyStore((s) => s.branding);
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      // Lazy-load the renderer only when the user actually downloads.
      const [{ pdf }, { buildResumeDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ResumeDocument"),
      ]);
      const mergedResume = {
        ...resume,
        meta: { ...resume.meta, agencyBranding },
      };
      const blob = await pdf(buildResumeDocument(mergedResume)).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = makeFileName(resume.basics.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      // Best-effort: surface a minimal message without a heavy toast system.
      alert("Sorry — something went wrong generating the PDF. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={busy}
      aria-label="Download PDF"
    >
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      <span className="hidden sm:inline">
        {busy ? "Generating…" : "Download PDF"}
      </span>
    </Button>
  );
}
