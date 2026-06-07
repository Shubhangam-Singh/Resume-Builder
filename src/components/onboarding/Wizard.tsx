"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  SquarePen,
  User,
  Wand2,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { emptyResume, uid } from "@/lib/resume/factory";
import type { ResumeData } from "@/lib/resume/types";
import { useResumeStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const WIZARD_KEY = "resumeforge-wizard-done";

export function markWizardDone() {
  try { localStorage.setItem(WIZARD_KEY, "1"); } catch { /* ignore */ }
}

export function wizardIsDone(): boolean {
  try { return !!localStorage.getItem(WIZARD_KEY); } catch { return false; }
}

// ── Step data ────────────────────────────────────────────────────────────────

interface WizardState {
  // Step 1: basics
  name: string;
  email: string;
  phone: string;
  label: string; // headline / title
  city: string;
  region: string;
  // Step 2: work
  company: string;
  position: string;
  workCity: string;
  startDate: string;
  endDate: string;
  bullets: string; // newline-separated
  // Step 3: education
  institution: string;
  area: string;
  studyType: string;
  gradYear: string;
  // Step 4: skills
  skills: string; // comma-separated
  // Step 5: summary
  summary: string;
}

const DEFAULT: WizardState = {
  name: "", email: "", phone: "", label: "", city: "", region: "",
  company: "", position: "", workCity: "", startDate: "", endDate: "",
  bullets: "",
  institution: "", area: "", studyType: "", gradYear: "",
  skills: "",
  summary: "",
};

// ── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "welcome",    label: "Welcome",    icon: Wand2 },
  { id: "basics",     label: "Your info",  icon: User },
  { id: "work",       label: "Experience", icon: Briefcase },
  { id: "education",  label: "Education",  icon: GraduationCap },
  { id: "skills",     label: "Skills",     icon: Wrench },
  { id: "summary",    label: "Summary",    icon: BookOpen },
  { id: "done",       label: "Done!",      icon: CheckCircle2 },
] as const;
type StepId = (typeof STEPS)[number]["id"];

function stepIndex(id: StepId) {
  return STEPS.findIndex((s) => s.id === id);
}

// ── Build resume from wizard state ───────────────────────────────────────────

function buildResume(s: WizardState): ResumeData {
  const r = emptyResume();
  r.basics.name = s.name.trim();
  r.basics.email = s.email.trim();
  r.basics.phone = s.phone.trim();
  r.basics.label = s.label.trim();
  r.basics.location.city = s.city.trim();
  r.basics.location.region = s.region.trim();
  r.basics.summary = s.summary.trim();

  if (s.company.trim() || s.position.trim()) {
    r.work.push({
      id: uid(),
      name: s.company.trim(),
      position: s.position.trim(),
      location: s.workCity.trim(),
      url: "",
      startDate: s.startDate.trim(),
      endDate: s.endDate.trim(),
      summary: "",
      highlights: s.bullets.split("\n").map((b) => b.trim()).filter(Boolean),
    });
  }

  if (s.institution.trim()) {
    r.education.push({
      id: uid(),
      institution: s.institution.trim(),
      area: s.area.trim(),
      studyType: s.studyType.trim(),
      startDate: "",
      endDate: s.gradYear.trim() ? `${s.gradYear.trim()}-05` : "",
      score: "",
      courses: [],
    });
  }

  const skillList = s.skills.split(",").map((k) => k.trim()).filter(Boolean);
  if (skillList.length) {
    r.skills.push({ id: uid(), name: "Skills", keywords: skillList });
  }

  return r;
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive text-xs">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ── Step screens ──────────────────────────────────────────────────────────────

function WelcomeStep() {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Wand2 className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold">Build your resume in minutes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll walk you through the essentials — basics, experience,
          education, and skills — so you have a solid first draft to polish in
          the editor.
        </p>
      </div>
      <ul className="mx-auto max-w-xs space-y-2 text-left text-sm text-muted-foreground">
        {["Your basic info (name, contact)", "Most recent job", "Education", "Your key skills"].map(
          (item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ),
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        <SquarePen className="mr-1 inline h-3 w-3" />
        You can edit every field in detail after the wizard.
      </p>
    </div>
  );
}

function BasicsStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Full name" required>
        <Input
          value={state.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Jane Doe"
          autoFocus
        />
      </Field>
      <Field label="Headline / job title">
        <Input
          value={state.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Senior Software Engineer"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" required>
          <Input
            type="email"
            value={state.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="jane@example.com"
          />
        </Field>
        <Field label="Phone">
          <Input
            type="tel"
            value={state.phone}
            onChange={(e) => update({ phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City">
          <Input
            value={state.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder="San Francisco"
          />
        </Field>
        <Field label="Region / State">
          <Input
            value={state.region}
            onChange={(e) => update({ region: e.target.value })}
            placeholder="CA"
          />
        </Field>
      </div>
    </div>
  );
}

function WorkStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Enter your most recent or current role. You can add more in the editor.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Company name">
          <Input
            value={state.company}
            onChange={(e) => update({ company: e.target.value })}
            placeholder="Acme Corp"
            autoFocus
          />
        </Field>
        <Field label="Your title">
          <Input
            value={state.position}
            onChange={(e) => update({ position: e.target.value })}
            placeholder="Software Engineer"
          />
        </Field>
      </div>
      <Field label="Location (city or Remote)">
        <Input
          value={state.workCity}
          onChange={(e) => update({ workCity: e.target.value })}
          placeholder="Austin, TX"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <Input
            value={state.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            placeholder="2021-03"
          />
        </Field>
        <Field label="End date (blank = Present)">
          <Input
            value={state.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            placeholder="2023-09"
          />
        </Field>
      </div>
      <Field label="Key achievements (one per line)">
        <Textarea
          rows={4}
          value={state.bullets}
          onChange={(e) => update({ bullets: e.target.value })}
          placeholder={"Built X that achieved Y (quantify where possible)\nLed a team of 5 engineers to ship Z\nReduced page load by 40% through lazy loading"}
        />
      </Field>
    </div>
  );
}

function EducationStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="School / University">
        <Input
          value={state.institution}
          onChange={(e) => update({ institution: e.target.value })}
          placeholder="MIT"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Degree type">
          <Input
            value={state.studyType}
            onChange={(e) => update({ studyType: e.target.value })}
            placeholder="B.S. / M.S. / B.Tech."
          />
        </Field>
        <Field label="Field of study">
          <Input
            value={state.area}
            onChange={(e) => update({ area: e.target.value })}
            placeholder="Computer Science"
          />
        </Field>
      </div>
      <Field label="Graduation year">
        <Input
          value={state.gradYear}
          onChange={(e) => update({ gradYear: e.target.value })}
          placeholder="2022"
          maxLength={4}
        />
      </Field>
    </div>
  );
}

function SkillsStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Your skills (comma-separated)">
        <Textarea
          rows={4}
          value={state.skills}
          onChange={(e) => update({ skills: e.target.value })}
          placeholder="TypeScript, React, Node.js, PostgreSQL, Docker, AWS"
          autoFocus
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        <Lightbulb className="mr-1 inline h-3 w-3" />
        Include technical skills, tools, and soft skills. You can organise them
        into categories in the editor.
      </p>
    </div>
  );
}

function SummaryStep({
  state,
  update,
}: {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        A 2–3 sentence overview of who you are and what you bring. Recruiters
        read this first, so make it count. (You can skip and add it later.)
      </p>
      <Field label="Professional summary">
        <Textarea
          rows={5}
          value={state.summary}
          onChange={(e) => update({ summary: e.target.value })}
          placeholder={`${state.label || "Software engineer"} with ${state.company ? "experience at " + state.company : "X years of experience"}. Skilled in ${state.skills ? state.skills.split(",").slice(0, 3).join(", ") : "your key skills"}. Looking for…`}
          autoFocus
        />
      </Field>
      <p className="text-xs text-muted-foreground">
        Tip: start with your title, years of experience, and 1-2 biggest
        strengths. Avoid &ldquo;I&rdquo; — lead with action or nouns.
      </p>
    </div>
  );
}

function DoneStep({ name }: { name: string }) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold">
          {name ? `Great work, ${name.split(" ")[0]}!` : "Your resume is ready!"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your draft is loaded in the editor. Refine the details, pick a
          template, and download when you&apos;re happy with it.
        </p>
      </div>
      <ul className="mx-auto max-w-xs space-y-2 text-left text-sm text-muted-foreground">
        {[
          "Add more jobs or projects in the Experience / Projects tabs",
          "Reorder sections with the Sections button",
          "Check ATS compatibility with the ATS button",
          "Run the completeness check (score pill in the header)",
        ].map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Wizard component ──────────────────────────────────────────────────────────

export function Wizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setResume = useResumeStore((s) => s.setResume);
  const [step, setStep] = useState<StepId>("welcome");
  const [state, setState] = useState<WizardState>(DEFAULT);

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setStep("welcome");
    setState(DEFAULT);
  }

  function handleOpenChange(v: boolean) {
    onOpenChange(v);
    if (!v) reset();
  }

  function canProceed(): boolean {
    if (step === "basics") return state.name.trim().length > 0;
    return true;
  }

  function next() {
    const idx = stepIndex(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].id);
    }
    if (step === "summary") {
      // Last data step — apply the resume
      setResume(buildResume(state));
      markWizardDone();
    }
  }

  function back() {
    const idx = stepIndex(step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  }

  const currentIdx = stepIndex(step);
  const isFirst = currentIdx === 0;
  const isLast = step === "done";
  const isPreLast = step === "summary";

  // Progress dots (exclude welcome + done)
  const DATA_STEPS: StepId[] = ["basics", "work", "education", "skills", "summary"];
  const dataIdx = DATA_STEPS.indexOf(step as (typeof DATA_STEPS)[number]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Resume wizard</DialogTitle>
        </DialogHeader>

        {/* Progress dots for data steps */}
        {dataIdx >= 0 && (
          <div className="flex items-center justify-center gap-1.5">
            {DATA_STEPS.map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i < dataIdx
                    ? "w-4 bg-primary"
                    : i === dataIdx
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted",
                )}
              />
            ))}
          </div>
        )}

        {/* Step label */}
        {dataIdx >= 0 && (
          <p className="text-center text-xs font-medium text-muted-foreground">
            Step {dataIdx + 1} of {DATA_STEPS.length} —{" "}
            {STEPS.find((s) => s.id === step)?.label}
          </p>
        )}

        {/* Content */}
        <div className="py-2">
          {step === "welcome" && <WelcomeStep />}
          {step === "basics" && <BasicsStep state={state} update={update} />}
          {step === "work" && <WorkStep state={state} update={update} />}
          {step === "education" && (
            <EducationStep state={state} update={update} />
          )}
          {step === "skills" && <SkillsStep state={state} update={update} />}
          {step === "summary" && (
            <SummaryStep state={state} update={update} />
          )}
          {step === "done" && <DoneStep name={state.name} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          {isLast ? (
            <div />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground"
            >
              Skip wizard
            </Button>
          )}

          <div className="flex gap-2">
            {!isFirst && !isLast && (
              <Button variant="outline" size="sm" onClick={back}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={() => handleOpenChange(false)}>
                Open editor
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={next} disabled={!canProceed()}>
                {isPreLast ? "Build my resume" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
