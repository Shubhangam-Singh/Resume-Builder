"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Gauge,
  Info,
  Loader2,
  Minus,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getTemplateMeta } from "@/components/pdf/templates/meta";
import {
  compareRoundTrip,
  computeIssues,
  roundTripReadable,
  type FieldCheck,
  type Issue,
} from "@/lib/ats/check";
import { analyzeCoverage, type CoverageResult } from "@/lib/ats/keywords";
import { resumeToPlainText } from "@/lib/ats/resume-text";
import { parseResumeText } from "@/lib/parser";
import { cn } from "@/lib/utils";
import { useResumeStore } from "@/lib/store";

type SelfStatus = "idle" | "running" | "done" | "error";

interface SelfReport {
  checks: FieldCheck[];
  readable: boolean;
  issues: Issue[];
}

export function AtsChecker() {
  const resume = useResumeStore((s) => s.resume);
  const template = getTemplateMeta(resume.meta.template);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SelfStatus>("idle");
  const [report, setReport] = useState<SelfReport | null>(null);

  const [jd, setJd] = useState("");
  const [coverage, setCoverage] = useState<CoverageResult | null>(null);

  async function runSelfCheck(isCancelled?: () => boolean) {
    setStatus("running");
    setReport(null);
    try {
      // Dogfood: render the real PDF, read its text back, and re-parse it.
      const [{ pdf }, { buildResumeDocument }, { extractPdfTextFromData }] =
        await Promise.all([
          import("@react-pdf/renderer"),
          import("@/components/pdf/ResumeDocument"),
          import("@/lib/import/pdf"),
        ]);
      const blob = await pdf(buildResumeDocument(resume)).toBlob();
      const text = await extractPdfTextFromData(
        new Uint8Array(await blob.arrayBuffer()),
      );
      const parsed = parseResumeText(text);
      const checks = compareRoundTrip(resume, parsed);
      if (isCancelled?.()) return; // dialog was closed mid-check
      setReport({
        checks,
        readable: roundTripReadable(checks),
        issues: computeIssues(resume, template.atsSafe, text),
      });
      setStatus("done");
    } catch (err) {
      if (isCancelled?.()) return;
      console.error("ATS self-check failed", err);
      setStatus("error");
    }
  }

  // Auto-run the self-check each time the dialog opens (reflects latest edits).
  // The cancellation flag prevents a check that's still running when the dialog
  // closes from writing stale results.
  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setReport(null);
      return;
    }
    let cancelled = false;
    void runSelfCheck(() => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function runJdMatch() {
    if (!jd.trim()) return;
    setCoverage(analyzeCoverage(jd, resumeToPlainText(resume)));
  }

  const hasErrors = report?.issues.some((i) => i.level === "error");
  const badgeGood = report?.readable && !hasErrors;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="ATS check">
          <Gauge />
          <span className="hidden sm:inline">ATS check</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ATS check</DialogTitle>
          <DialogDescription>
            Everything runs in your browser. We render your actual PDF, read the
            text back, and re-parse it — exactly what an ATS would do.
          </DialogDescription>
        </DialogHeader>

        {/* Self-check */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Can an ATS read your résumé?</h3>
            {status === "done" && (
              <Button variant="ghost" size="sm" onClick={() => runSelfCheck()}>
                Re-run
              </Button>
            )}
          </div>

          {status === "running" && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating your PDF and reading it back…
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <span>Couldn&apos;t run the check.</span>
              <Button variant="outline" size="sm" onClick={() => runSelfCheck()}>
                Retry
              </Button>
            </div>
          )}

          {status === "done" && report && (
            <div className="space-y-3">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md border p-3 text-sm font-medium",
                  badgeGood
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800",
                )}
              >
                {badgeGood ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TriangleAlert className="h-5 w-5 text-amber-600" />
                )}
                {badgeGood
                  ? "ATS-readable — every field survived a round-trip."
                  : "Needs attention — some fields may not parse cleanly."}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {report.checks.map((c) => (
                  <FieldRow key={c.field} check={c} />
                ))}
              </div>

              {report.issues.length > 0 && (
                <ul className="space-y-1.5 border-t pt-3">
                  {report.issues.map((issue, i) => (
                    <IssueRow key={i} issue={issue} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* JD match */}
        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">Match a job description</h3>
          <p className="text-xs text-muted-foreground">
            Paste a job post to see which of its keywords your résumé already
            covers.
          </p>
          <Textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the job description here…"
            className="min-h-[120px]"
          />
          <div className="flex justify-end">
            <Button onClick={runJdMatch} disabled={!jd.trim()}>
              Check match
            </Button>
          </div>

          {coverage && coverage.total > 0 && (
            <CoveragePanel coverage={coverage} />
          )}
          {coverage && coverage.total === 0 && (
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t pull any keywords from that text — try a longer
              job description.
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ check }: { check: FieldCheck }) {
  const { field, expected, recovered } = check;
  let icon = <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />;
  let label = "not provided";
  let tone = "text-muted-foreground";
  if (expected && recovered) {
    icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    label = "readable";
    tone = "text-foreground";
  } else if (expected && !recovered) {
    icon = <CircleAlert className="h-3.5 w-3.5 text-amber-600" />;
    label = "unclear";
    tone = "text-amber-700";
  }
  return (
    <div className="flex items-center gap-1.5 text-sm">
      {icon}
      <span className="font-medium">{field}</span>
      <span className={cn("text-xs", tone)}>· {label}</span>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const icon =
    issue.level === "error" ? (
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
    ) : issue.level === "warn" ? (
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
    ) : (
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    );
  return (
    <li className="flex gap-2 text-xs text-muted-foreground">
      {icon}
      <span>{issue.message}</span>
    </li>
  );
}

function CoveragePanel({ coverage }: { coverage: CoverageResult }) {
  const { results, matched, total } = coverage;
  const pct = coverage.coverage;
  const tone =
    pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-destructive";

  const present = results.filter((r) => r.present);
  const missing = results.filter((r) => !r.present);

  return (
    <div className="space-y-3 rounded-md border bg-muted/40 p-3">
      <div className="flex items-baseline gap-2">
        <span className={cn("text-3xl font-bold", tone)}>{pct}%</span>
        <span className="text-sm text-muted-foreground">
          keyword coverage — matched {matched} of {total}
        </span>
      </div>

      {present.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-emerald-700">
            Matched ({present.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {present.map((r) => (
              <Chip key={r.term} tone="good">
                {r.term}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Missing ({missing.length}) — weave in any you genuinely have
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((r) => (
              <Chip key={r.term} tone="muted">
                {r.term}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  tone,
}: {
  children: string;
  tone: "good" | "muted";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs",
        tone === "good"
          ? "bg-emerald-100 text-emerald-800"
          : "border bg-background text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
