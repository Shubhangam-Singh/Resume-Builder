"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, FileText, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCoverLetter } from "@/lib/ai/cover-letter";
import { selectActiveKey, selectActiveModel, useAiStore } from "@/lib/ai/store";
import { toast } from "@/lib/toast";
import { useResumeStore } from "@/lib/store";

function letterFileName(name: string, ext: string): string {
  const base = (name || "cover_letter")
    .trim()
    .replace(/[^\w-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || "cover_letter"}_Cover_Letter.${ext}`;
}

/**
 * Cover letter workspace: paste a job description, generate a tailored draft
 * with the user's own AI key (BYOK — same privacy model as the bullet helper),
 * edit it, and export as PDF or plain text. The letter is stored with the
 * resume document so it survives reloads and rides along with duplicates.
 */
export function CoverLetterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resume = useResumeStore((s) => s.resume);
  const setCoverLetter = useResumeStore((s) => s.setCoverLetter);
  const provider = useAiStore((s) => s.provider);
  const apiKey = useAiStore(selectActiveKey);
  const model = useAiStore(selectActiveModel);

  const [jd, setJd] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the saved letter when the dialog opens; edits stay local until close
  // so typing here doesn't churn the live preview or the undo stack.
  useEffect(() => {
    if (!open) return;
    setJd(resume.coverLetter?.jobDescription ?? "");
    setText(resume.coverLetter?.text ?? "");
    setError(null);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function persist() {
    if (jd.trim() || text.trim()) setCoverLetter({ jobDescription: jd, text });
    else setCoverLetter(undefined);
  }

  function close(v: boolean) {
    if (!v) persist();
    onOpenChange(v);
  }

  async function generate() {
    if (!apiKey || busy) return;
    setBusy(true);
    setError(null);
    try {
      const letter = await generateCoverLetter(resume, jd, { provider, apiKey, model });
      if (letter) {
        setText(letter);
        setCoverLetter({ jobDescription: jd, text: letter });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — user can still select the textarea manually.
    }
  }

  function downloadTxt() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = letterFileName(resume.basics.name, "txt");
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    persist();
    try {
      const [{ pdf }, { buildCoverLetterDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/CoverLetterDocument"),
      ]);
      const blob = await pdf(
        buildCoverLetterDocument({ ...resume, coverLetter: { jobDescription: jd, text } }),
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = letterFileName(resume.basics.name, "pdf");
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Cover letter PDF failed", err);
      toast("Something went wrong generating the PDF. Please retry.", "error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Cover letter
          </DialogTitle>
          <DialogDescription>
            Paste the job description, generate a tailored draft with your own
            AI key, then edit and export. Nothing leaves your browser except
            the direct call to your chosen AI provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cl-jd">Job description</Label>
            <Textarea
              id="cl-jd"
              rows={5}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the job posting here…"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void generate()}
              disabled={!apiKey || busy || !jd.trim()}
              title={
                apiKey
                  ? "Generate a tailored cover letter"
                  : "Add your API key in AI bullet helper settings first"
              }
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {busy ? "Generating…" : text ? "Regenerate" : "Generate with AI"}
            </Button>
            {!apiKey && (
              <span className="text-xs text-muted-foreground">
                Set an API key under Tools → AI bullet helper to enable
                generation — or write the letter yourself below.
              </span>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="cl-text">Letter</Label>
            <Textarea
              id="cl-text"
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Dear Hiring Manager, …"
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyText()}
            disabled={!text.trim()}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadTxt}
            disabled={!text.trim()}
          >
            <FileText className="h-3.5 w-3.5" />
            .txt
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void downloadPdf()}
            disabled={!text.trim()}
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
