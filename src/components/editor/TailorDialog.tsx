"use client";

import { useMemo, useState } from "react";
import { Check, Copy as CopyIcon, Crosshair, Loader2, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { improveBullets } from "@/lib/ai/improve";
import { selectActiveKey, selectActiveModel, useAiStore } from "@/lib/ai/store";
import { analyzeCoverage } from "@/lib/ats/keywords";
import { resumeToPlainText } from "@/lib/ats/resume-text";
import { saveDoc, setActiveId, type SavedDoc } from "@/lib/persist/db";
import { emptyApplication, saveApplication } from "@/lib/persist/tracker";
import { uid } from "@/lib/resume/factory";
import { useResumeStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Stage = "setup" | "tailoring";

/**
 * One flow for tailoring a resume to a specific job: paste the JD, optionally
 * clone the resume (so the original stays general) and log the application in
 * the tracker, then close the keyword gaps with one-click adds and AI bullet
 * tailoring. Everything runs on the active document, undoable as usual.
 */
export function TailorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resume = useResumeStore((s) => s.resume);
  const documentId = useResumeStore((s) => s.documentId);
  const documentName = useResumeStore((s) => s.documentName);
  const loadDocument = useResumeStore((s) => s.loadDocument);
  const addSkillKeyword = useResumeStore((s) => s.addSkillKeyword);
  const updateEntry = useResumeStore((s) => s.updateEntry);

  const provider = useAiStore((s) => s.provider);
  const apiKey = useAiStore(selectActiveKey);
  const model = useAiStore(selectActiveModel);

  const [stage, setStage] = useState<Stage>("setup");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");
  const [cloneFirst, setCloneFirst] = useState(true);
  const [trackIt, setTrackIt] = useState(true);
  const [starting, setStarting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Live coverage: recomputed as keywords are added, so chips flip to
  // "covered" the moment the user clicks +.
  const coverage = useMemo(() => {
    if (stage !== "tailoring" || !jd.trim()) return null;
    return analyzeCoverage(jd, resumeToPlainText(resume));
  }, [stage, jd, resume]);

  function reset() {
    setStage("setup");
    setCompany("");
    setRole("");
    setJd("");
    setCloneFirst(true);
    setTrackIt(true);
    setAiDone(false);
    setAiError(null);
  }

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) reset();
  }

  async function start() {
    if (!jd.trim() || starting) return;
    setStarting(true);
    try {
      let docId = documentId;
      let docName = documentName;

      if (cloneFirst && documentId) {
        // Persist the current doc, then switch to a copy named for the job.
        await saveDoc({
          id: documentId,
          name: documentName,
          updatedAt: Date.now(),
          data: resume,
        });
        const cloneName = `${company.trim() || "Job"} — ${documentName}`;
        const doc: SavedDoc = {
          id: uid(),
          name: cloneName,
          updatedAt: Date.now(),
          data: structuredClone(resume),
        };
        await saveDoc(doc);
        await setActiveId(doc.id);
        loadDocument(doc);
        docId = doc.id;
        docName = cloneName;
      }

      if (trackIt) {
        const app = emptyApplication(docId, docName);
        app.company = company.trim();
        app.role = role.trim();
        app.notes = "Created from Tailor for a job";
        await saveApplication(app);
      }

      setStage("tailoring");
    } finally {
      setStarting(false);
    }
  }

  async function tailorBullets() {
    if (!apiKey || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const jdContext = `Tailor toward this job description, naturally using its key terms where truthful:\n${jd.slice(0, 2000)}`;
      // Read fresh state per entry so earlier updates aren't overwritten.
      const work = useResumeStore.getState().resume.work;
      for (const w of work) {
        const bullets = w.highlights.filter((h) => h.trim());
        if (!bullets.length) continue;
        const context = `${jdContext}\n\nRole being described: ${w.position} at ${w.name}`;
        const improved = await improveBullets(bullets, context, {
          provider,
          apiKey,
          model,
        });
        updateEntry("work", w.id, { highlights: improved });
      }
      setAiDone(true);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setAiBusy(false);
    }
  }

  const missing = coverage?.results.filter((r) => !r.present) ?? [];
  const hasWorkBullets = resume.work.some((w) => w.highlights.some((h) => h.trim()));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crosshair className="h-4 w-4" />
            Tailor for a job
          </DialogTitle>
          <DialogDescription>
            {stage === "setup"
              ? "Paste the job description; optionally clone this resume for the application and log it in the tracker."
              : "Close the keyword gaps below, then optionally let AI rephrase your bullets toward this job."}
          </DialogDescription>
        </DialogHeader>

        {stage === "setup" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tailor-company">Company</Label>
                <Input
                  id="tailor-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tailor-role">Role</Label>
                <Input
                  id="tailor-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Frontend Engineer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tailor-jd">Job description</Label>
              <Textarea
                id="tailor-jd"
                rows={8}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job posting here…"
              />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={cloneFirst}
                onChange={(e) => setCloneFirst(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <CopyIcon className="h-3.5 w-3.5" />
                  Clone this resume first
                </span>
                <span className="text-xs text-muted-foreground">
                  Tailors a copy named “{company.trim() || "Job"} — {documentName}”
                  and keeps the original untouched.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={trackIt}
                onChange={(e) => setTrackIt(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Add to application tracker</span>
                <span className="block text-xs text-muted-foreground">
                  Logs {company.trim() || "this job"} as “Saved”, linked to the
                  resume you tailor.
                </span>
              </span>
            </label>

            <div className="flex justify-end">
              <Button onClick={() => void start()} disabled={!jd.trim() || starting}>
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crosshair className="h-4 w-4" />
                )}
                Start tailoring
              </Button>
            </div>
          </div>
        )}

        {stage === "tailoring" && coverage && (
          <div className="space-y-5">
            {/* Coverage summary */}
            <div className="flex items-center gap-3 rounded-md border p-3">
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  coverage.coverage >= 70
                    ? "text-emerald-600 dark:text-emerald-400"
                    : coverage.coverage >= 40
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400",
                )}
              >
                {coverage.coverage}%
              </span>
              <div className="text-sm">
                <p className="font-medium">
                  {coverage.matched} of {coverage.total} job keywords covered
                </p>
                <p className="text-xs text-muted-foreground">
                  Add the missing ones below — each click puts it under Skills
                  (undoable).
                </p>
              </div>
            </div>

            {/* Missing keyword chips */}
            {missing.length > 0 ? (
              <div className="space-y-1.5">
                <Label>Missing keywords</Label>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((r) => (
                    <button
                      key={r.term}
                      type="button"
                      onClick={() => addSkillKeyword(r.term)}
                      title={`Add "${r.term}" to your skills`}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs transition-colors hover:border-primary hover:bg-accent"
                    >
                      <Plus className="h-3 w-3" />
                      {r.term}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Only add keywords you genuinely have — recruiters ask about
                  everything on the page.
                </p>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Every extracted keyword is covered.
              </p>
            )}

            {/* AI bullet tailoring */}
            <div className="space-y-1.5 rounded-md border p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                AI bullet tailoring
              </p>
              <p className="text-xs text-muted-foreground">
                Rewrites your experience bullets to speak this job&apos;s language
                — without inventing facts. Uses your own API key; one undo step
                per role.
              </p>
              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
              <div className="pt-1">
                {apiKey ? (
                  <Button
                    size="sm"
                    variant={aiDone ? "outline" : "default"}
                    onClick={() => void tailorBullets()}
                    disabled={aiBusy || !hasWorkBullets}
                    title={hasWorkBullets ? undefined : "No experience bullets to tailor yet"}
                  >
                    {aiBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : aiDone ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiBusy ? "Tailoring…" : aiDone ? "Tailored — run again" : "Tailor bullets with AI"}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Set an API key under Tools → AI bullet helper to enable this.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => close(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
