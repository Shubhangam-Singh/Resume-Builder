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
import {
  analyzeCoverage,
  highlightMatches,
  type CoverageResult,
} from "@/lib/ats/keywords";
import { resumeToPlainText } from "@/lib/ats/resume-text";
import { scoreResume, type ScoreResult } from "@/lib/ats/score";
import { checkWriting, type WritingIssue } from "@/lib/writing/check";
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
  const score = scoreResume(resume, template.atsSafe);
  const writing = checkWriting(resume);

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

        {/* Score breakdown */}
        <ScoreBreakdown score={score} />

        {/* Self-check */}
        <section className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Can an ATS read your resume?</h3>
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
            Paste a job post to see which of its keywords your resume already
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
            <CoveragePanel
              coverage={coverage}
              resumeText={resumeToPlainText(resume)}
            />
          )}
          {coverage && coverage.total === 0 && (
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t pull any keywords from that text — try a longer
              job description.
            </p>
          )}
        </section>

        {/* Writing check */}
        <WritingPanel issues={writing} />
      </DialogContent>
    </Dialog>
  );
}

function ScoreBreakdown({ score }: { score: ScoreResult }) {
  const tone = (n: number) =>
    n >= 80 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";
  const bar = (n: number) =>
    n >= 80 ? "bg-emerald-500" : n >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">ATS readiness score</h3>
        <span className={cn("text-2xl font-bold", tone(score.overall))}>
          {score.overall}
          <span className="text-sm font-normal text-muted-foreground">/100</span>
        </span>
      </div>
      <div className="space-y-2">
        {score.sections.map((s) => (
          <div key={s.key}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span className="font-medium">{s.label}</span>
              <span className={cn("tabular-nums", tone(s.score))}>{s.score}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", bar(s.score))}
                style={{ width: `${s.score}%` }}
              />
            </div>
            {s.score < 100 && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.detail}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function WritingPanel({ issues }: { issues: WritingIssue[] }) {
  const warns = issues.filter((i) => i.severity === "warn");
  const infos = issues.filter((i) => i.severity === "info");
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">Writing check</h3>
      {issues.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> No writing issues found — clean and
          on-point.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {warns.length} suggestion{warns.length === 1 ? "" : "s"} and{" "}
            {infos.length} tip{infos.length === 1 ? "" : "s"}. These run entirely
            offline.
          </p>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">
            {[...warns, ...infos].map((issue, i) => (
              <li key={i} className="flex gap-2 text-xs">
                {issue.severity === "warn" ? (
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                ) : (
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span>
                  <span className="font-medium text-muted-foreground">
                    {issue.where}:
                  </span>{" "}
                  {issue.message}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
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

function CoveragePanel({
  coverage,
  resumeText,
}: {
  coverage: CoverageResult;
  resumeText: string;
}) {
  const { results, matched, total } = coverage;
  const pct = coverage.coverage;
  const tone =
    pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-destructive";

  const present = results.filter((r) => r.present);
  const missing = results.filter((r) => !r.present);
  const segments = highlightMatches(
    resumeText,
    present.map((r) => r.term),
  );

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

      {present.length > 0 && (
        <details className="rounded-md border bg-background p-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
            Tailored view — see matched keywords highlighted in your resume
          </summary>
          <p className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-snug">
            {segments.map((seg, i) =>
              seg.match ? (
                <mark
                  key={i}
                  className="rounded bg-emerald-200 px-0.5 text-emerald-900"
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>
        </details>
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
