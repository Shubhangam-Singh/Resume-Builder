"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Info,
  ListChecks,
  PenLine,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTemplateMeta } from "@/components/pdf/templates/meta";
import { scoreResume } from "@/lib/ats/score";
import { computeCompleteness } from "@/lib/resume/completeness";
import { checkWriting, type WritingIssue } from "@/lib/writing/check";
import { useResumeStore } from "@/lib/store";
import { useUiStore, type EditorTab } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

/**
 * One unified resume score: ATS readiness + completeness + writing quality
 * rolled into a letter grade, with every issue linking straight to the editor
 * tab where it can be fixed. The header badge (ScoreBadge) opens it.
 */

function writingScore(issues: WritingIssue[]): number {
  const warns = issues.filter((i) => i.severity === "warn").length;
  const infos = issues.length - warns;
  return Math.max(0, 100 - warns * 10 - infos * 4);
}

function gradeOf(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 88) return "A";
  if (score >= 80) return "B+";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

function toneOf(score: number): string {
  return score >= 80
    ? "text-emerald-600 dark:text-emerald-400"
    : score >= 55
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";
}

function barOf(score: number): string {
  return score >= 80 ? "bg-emerald-500" : score >= 55 ? "bg-amber-500" : "bg-rose-500";
}

/** Where in the editor a completeness suggestion is fixed. */
function tabForSuggestion(label: string): EditorTab {
  if (/experience|bullet|start date/i.test(label)) return "work";
  if (/education/i.test(label)) return "education";
  if (/skill/i.test(label)) return "skills";
  if (/project/i.test(label)) return "projects";
  return "basics";
}

/** Where in the editor a writing issue lives (from its "where" label). */
function tabForIssue(where: string): EditorTab {
  if (where.startsWith("Experience")) return "work";
  if (where.startsWith("Project")) return "projects";
  return "basics";
}

const ATS_SECTION_TABS: Record<string, EditorTab> = {
  contact: "basics",
  summary: "basics",
  experience: "work",
  education: "education",
  skills: "skills",
};

export function ScoreBadge() {
  const resume = useResumeStore((s) => s.resume);
  const [open, setOpen] = useState(false);

  // Open on request from the command palette.
  const dialogRequest = useUiStore((s) => s.dialog);
  const closeDialogRequest = useUiStore((s) => s.closeDialog);
  useEffect(() => {
    if (dialogRequest === "score") {
      setOpen(true);
      closeDialogRequest();
    }
  }, [dialogRequest, closeDialogRequest]);

  const { overall } = useMemo(() => {
    const template = getTemplateMeta(resume.meta.template);
    const ats = scoreResume(resume, template.atsSafe).overall;
    const completeness = computeCompleteness(resume).score;
    const writing = writingScore(checkWriting(resume));
    return { overall: Math.round(ats * 0.5 + completeness * 0.3 + writing * 0.2) };
  }, [resume]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
        aria-label={`Resume score ${overall} out of 100 — see details`}
        title="Resume score — click for the full breakdown"
      >
        <Gauge className={cn("h-3.5 w-3.5", toneOf(overall))} />
        <span className={toneOf(overall)}>
          {gradeOf(overall)} · {overall}
        </span>
        <span className="hidden text-muted-foreground sm:inline">score</span>
      </button>

      <ScoreDashboard open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ScoreDashboard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resume = useResumeStore((s) => s.resume);
  const setEditorTab = useUiStore((s) => s.setEditorTab);

  const data = useMemo(() => {
    if (!open) return null;
    const template = getTemplateMeta(resume.meta.template);
    const ats = scoreResume(resume, template.atsSafe);
    const completeness = computeCompleteness(resume);
    const issues = checkWriting(resume);
    const writing = writingScore(issues);
    const overall = Math.round(
      ats.overall * 0.5 + completeness.score * 0.3 + writing * 0.2,
    );
    return { template, ats, completeness, issues, writing, overall };
  }, [open, resume]);

  function jump(tab: EditorTab) {
    setEditorTab(tab);
    onOpenChange(false);
  }

  if (!data) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const { ats, completeness, issues, writing, overall } = data;
  const unmet = completeness.items.filter((it) => !it.done);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Resume score
          </DialogTitle>
          <DialogDescription>
            ATS readiness, completeness, and writing quality in one grade.
            Every item links to where you fix it.
          </DialogDescription>
        </DialogHeader>

        {/* Overall */}
        <div className="flex items-center gap-4 rounded-lg border p-4">
          <span className={cn("text-4xl font-bold tabular-nums", toneOf(overall))}>
            {gradeOf(overall)}
          </span>
          <div className="flex-1">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm font-medium">{overall} / 100</span>
              <span className="text-xs text-muted-foreground">
                50% ATS · 30% completeness · 20% writing
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", barOf(overall))}
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>
        </div>

        {/* ATS readiness */}
        <Category
          icon={<Gauge className="h-4 w-4" />}
          title="ATS readiness"
          score={ats.overall}
        >
          {ats.sections.map((s) => (
            <Row
              key={s.key}
              ok={s.score >= 90}
              text={`${s.label}: ${s.detail}`}
              onJump={
                s.score < 90 && ATS_SECTION_TABS[s.key]
                  ? () => jump(ATS_SECTION_TABS[s.key])
                  : undefined
              }
            />
          ))}
        </Category>

        {/* Completeness */}
        <Category
          icon={<ListChecks className="h-4 w-4" />}
          title="Completeness"
          score={completeness.score}
        >
          {unmet.length === 0 ? (
            <Row ok text="Everything recruiters expect is filled in." />
          ) : (
            unmet.map((it) => (
              <Row
                key={it.label}
                ok={false}
                text={it.label}
                onJump={() => jump(tabForSuggestion(it.label))}
              />
            ))
          )}
        </Category>

        {/* Writing quality */}
        <Category
          icon={<PenLine className="h-4 w-4" />}
          title="Writing quality"
          score={writing}
        >
          {issues.length === 0 ? (
            <Row ok text="No weak openers, clichés, or overlong bullets found." />
          ) : (
            issues.slice(0, 12).map((iss, i) => (
              <Row
                key={i}
                ok={false}
                info={iss.severity === "info"}
                text={`${iss.where}: ${iss.message}`}
                onJump={() => jump(tabForIssue(iss.where))}
              />
            ))
          )}
          {issues.length > 12 && (
            <p className="pl-6 text-[11px] text-muted-foreground">
              …and {issues.length - 12} more.
            </p>
          )}
        </Category>
      </DialogContent>
    </Dialog>
  );
}

function Category({
  icon,
  title,
  score,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  score: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <span className={cn("text-sm font-bold tabular-nums", toneOf(score))}>
          {score}
        </span>
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barOf(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  ok,
  info,
  text,
  onJump,
}: {
  ok: boolean;
  info?: boolean;
  text: string;
  onJump?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : info ? (
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
      ) : (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      )}
      <span className="flex-1">{text}</span>
      {onJump && (
        <button
          type="button"
          onClick={onJump}
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          Fix
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
