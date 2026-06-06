"use client";

import { useState } from "react";
import { Link2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { selectActiveKey, selectActiveModel, useAiStore } from "@/lib/ai/store";
import { parseResumeJson } from "@/lib/persist/json";
import { parseResumeText, type ParseResult } from "@/lib/parser";
import { useResumeStore } from "@/lib/store";

/**
 * Import from LinkedIn. LinkedIn has no public API and blocks scraping, so we
 * can't fetch a profile from a URL — instead the user pastes their profile text
 * (or a JSON Resume export from their data archive), which we parse locally or,
 * optionally, with their own AI key. Privacy-first: nothing is uploaded unless
 * the user explicitly chooses AI parsing.
 */
export function LinkedInImport({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setResume = useResumeStore((s) => s.setResume);
  const provider = useAiStore((s) => s.provider);
  const apiKey = useAiStore(selectActiveKey);
  const aiModel = useAiStore(selectActiveModel);

  const [text, setText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setText("");
    setResult(null);
    setBusy(false);
    setError("");
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  function parseLocal() {
    setError("");
    const trimmed = text.trim();
    if (!trimmed) return;
    // If it looks like JSON (a data export), try the JSON coercion first.
    if (trimmed.startsWith("{")) {
      try {
        const data = parseResumeJson(trimmed);
        const skills = data.skills.reduce((n, s) => n + s.keywords.length, 0);
        setResult({
          data,
          found: {
            name: !!data.basics.name,
            email: !!data.basics.email,
            phone: !!data.basics.phone,
            summary: !!data.basics.summary,
            work: data.work.length,
            education: data.education.length,
            projects: data.projects.length,
            certificates: data.certificates.length,
            skills,
          },
          isEmpty: !data.basics.name && data.work.length === 0,
        });
        return;
      } catch {
        // fall through to text parsing
      }
    }
    setResult(parseResumeText(trimmed));
  }

  async function parseAi() {
    if (!apiKey || !text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { parseResumeWithAi } = await import("@/lib/ai/parse");
      setResult(
        await parseResumeWithAi(text, { provider, apiKey, model: aiModel }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI parsing failed.");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (result) {
      const currentMeta = useResumeStore.getState().resume.meta;
      setResume({
        ...result.data,
        meta: { ...currentMeta, lastModified: new Date().toISOString() },
      });
    }
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[#0a66c2]" />
            Import from LinkedIn
          </DialogTitle>
          <DialogDescription>
            LinkedIn has no public import API. Open your profile, select the page
            text and copy it, then paste below. (You can also paste a JSON Resume
            export from your LinkedIn data archive.)
          </DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Open your LinkedIn profile in the browser.</li>
          <li>Select all (Ctrl/Cmd+A) and copy (Ctrl/Cmd+C).</li>
          <li>Paste it here and click Parse.</li>
        </ol>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your LinkedIn profile text (or JSON export) here…"
          className="min-h-[160px]"
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={parseLocal} disabled={!text.trim()}>
            Parse locally
          </Button>
          {apiKey ? (
            <Button onClick={parseAi} disabled={busy || !text.trim()}>
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles className="text-amber-300" />
              )}
              {busy ? "Parsing…" : "Parse with AI"}
            </Button>
          ) : null}
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {result && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            {result.isEmpty ? (
              <p className="text-muted-foreground">
                We couldn&apos;t read much from that text. Try copying more of the
                profile, or use AI parsing.
              </p>
            ) : (
              <p>
                Found{" "}
                <span className="font-medium">
                  {[
                    result.found.name && "name",
                    result.found.work > 0 && `${result.found.work} roles`,
                    result.found.education > 0 &&
                      `${result.found.education} education`,
                    result.found.skills > 0 && `${result.found.skills} skills`,
                  ]
                    .filter(Boolean)
                    .join(", ") || "some details"}
                </span>
                . Nothing is saved until you confirm.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!result}>
            Use this resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
