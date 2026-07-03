"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/lib/store";
import { useAgencyStore } from "@/lib/agency-store";

export function DownloadButton() {
  const resume = useResumeStore((s) => s.resume);
  const agencyBranding = useAgencyStore((s) => s.branding);
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      // Lazy-load the renderer only when the user actually downloads.
      const { downloadResumePdf } = await import("@/lib/export/pdf");
      await downloadResumePdf({
        ...resume,
        meta: { ...resume.meta, agencyBranding },
      });
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
