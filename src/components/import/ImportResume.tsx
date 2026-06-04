"use client";

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTR, extractText } from "@/lib/import/extract";
import { parseResumeText, type ParseResult } from "@/lib/parser";
import { useResumeStore } from "@/lib/store";

type Status = "idle" | "reading" | "review" | "error";

export function ImportResume() {
  const setResume = useResumeStore((s) => s.setResume);
  const currentTemplate = useResumeStore((s) => s.resume.meta.template);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStatus("idle");
    setFileName("");
    setResult(null);
    setError("");
    setDragging(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleFile(file: File | undefined | null) {
    if (!file) return;
    setFileName(file.name);
    setStatus("reading");
    setError("");
    try {
      const text = await extractText(file);
      setResult(parseResumeText(text));
      setStatus("review");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong reading that file.",
      );
      setStatus("error");
    }
  }

  function applyImport() {
    if (result) {
      // Import replaces content but keeps the template the user already picked.
      setResume({
        ...result.data,
        meta: { ...result.data.meta, template: currentTemplate },
      });
    }
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Import résumé">
          <Upload />
          <span className="hidden sm:inline">Import</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import an existing résumé</DialogTitle>
          <DialogDescription>
            PDF, DOCX, or TXT. Everything is read in your browser — your file is
            never uploaded anywhere.
          </DialogDescription>
        </DialogHeader>

        {status === "idle" && (
          <Dropzone
            dragging={dragging}
            onPick={() => inputRef.current?.click()}
            onDragState={setDragging}
            onDrop={(f) => handleFile(f)}
          />
        )}

        {status === "reading" && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Reading <span className="font-medium">{fileName}</span>…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={reset}>
              Try another file
            </Button>
          </div>
        )}

        {status === "review" && result && (
          <ReviewPanel result={result} onChooseAnother={reset} />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {status === "review" && result && (
          <DialogFooter>
            <Button variant="ghost" onClick={reset}>
              Choose another
            </Button>
            <Button onClick={applyImport}>
              {result.isEmpty ? "Use anyway" : "Use this résumé"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Dropzone({
  dragging,
  onPick,
  onDragState,
  onDrop,
}: {
  dragging: boolean;
  onPick: () => void;
  onDragState: (v: boolean) => void;
  onDrop: (file: File | undefined) => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        onDragState(true);
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragState(false);
        onDrop(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging
          ? "border-primary bg-accent"
          : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-accent/50",
      )}
    >
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">
          Drop your résumé here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX or TXT</p>
      </div>
    </button>
  );
}

function ReviewPanel({
  result,
  onChooseAnother,
}: {
  result: ParseResult;
  onChooseAnother: () => void;
}) {
  const { data, found, isEmpty } = result;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500" />
        <p className="text-sm font-medium">
          We couldn&apos;t read much from this file.
        </p>
        <p className="text-xs text-muted-foreground">
          It may be a scanned image or use an unusual layout. You can still
          import an empty resume and fill it in, or try another file.
        </p>
        <Button variant="outline" size="sm" onClick={onChooseAnother}>
          Try another file
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Here&apos;s what we found. Nothing is saved until you confirm — and you
        can edit everything afterwards.
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
        <FoundRow label="Name" value={data.basics.name} ok={found.name} />
        <FoundRow label="Email" value={data.basics.email} ok={found.email} />
        <FoundRow label="Phone" value={data.basics.phone} ok={found.phone} />
        <FoundRow
          label="Summary"
          value={found.summary ? "Found" : ""}
          ok={found.summary}
        />
        <FoundRow label="Work" value={count(found.work, "entry", "entries")} ok={found.work > 0} />
        <FoundRow
          label="Education"
          value={count(found.education, "entry", "entries")}
          ok={found.education > 0}
        />
        <FoundRow label="Skills" value={count(found.skills, "skill", "skills")} ok={found.skills > 0} />
        <FoundRow
          label="Projects"
          value={count(found.projects, "project", "projects")}
          ok={found.projects > 0}
        />
        <FoundRow
          label="Certificates"
          value={count(found.certificates, "item", "items")}
          ok={found.certificates > 0}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Importing replaces your current resume content.
      </p>
    </div>
  );
}

function count(n: number, singular: string, plural: string): string {
  if (n === 0) return "";
  return `${n} ${n === 1 ? singular : plural}`;
}

function FoundRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 truncate">
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
      )}
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="truncate font-medium">{value || "—"}</span>
    </div>
  );
}
