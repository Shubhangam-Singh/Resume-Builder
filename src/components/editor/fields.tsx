"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  Info,
  Plus,
  Trash2,
} from "lucide-react";

import { AiImproveButton } from "@/components/ai/AiImproveButton";
import { BulletSuggestions } from "@/components/editor/BulletSuggestions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { commaToList, linesToList } from "@/lib/resume/format";
import { checkText } from "@/lib/writing/check";
import { cn } from "@/lib/utils";

const SEP = ""; // join separator used only for cheap array comparison

interface BaseFieldProps {
  label: string;
  placeholder?: string;
  hint?: string;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = "text",
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Comma-separated list bound to a string[] (e.g. skill keywords). */
export function TagField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: BaseFieldProps & {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const id = useId();
  const [text, setText] = useState(value.join(", "));

  // Resync the local buffer only when the upstream array changes externally
  // (e.g. "Load sample" / import), not on the user's own keystrokes.
  useEffect(() => {
    if (commaToList(text).join(SEP) !== value.join(SEP)) {
      setText(value.join(", "));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(commaToList(e.target.value));
        }}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Newline-separated list bound to a string[] (e.g. bullet highlights). */
export function ListField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
  aiContext,
}: BaseFieldProps & {
  value: string[];
  onChange: (value: string[]) => void;
  rows?: number;
  /** When set, shows an "Improve with AI" button (only if a key is configured). */
  aiContext?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value.join("\n"));

  useEffect(() => {
    if (linesToList(text).join(SEP) !== value.join(SEP)) {
      setText(value.join("\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function applyImproved(improved: string[]) {
    setText(improved.join("\n"));
    onChange(improved);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {aiContext !== undefined ? (
          <AiImproveButton
            bullets={linesToList(text)}
            context={aiContext}
            onResult={applyImproved}
          />
        ) : null}
      </div>
      <Textarea
        id={id}
        rows={rows}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(linesToList(e.target.value));
        }}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Inline writing-quality indicator shown per-bullet. */
function BulletHint({ text }: { text: string }) {
  if (!text.trim()) return null;
  const issues = checkText(text, "");
  if (!issues.length) return null;
  const hasWarn = issues.some((i) => i.severity === "warn");
  const tip = issues.map((i) => i.message).join("\n");
  return (
    <div
      title={tip}
      role="img"
      aria-label={tip}
      className={cn(
        "mt-1.5 flex-shrink-0 cursor-help",
        hasWarn ? "text-amber-500" : "text-sky-400",
      )}
    >
      {hasWarn ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Info className="h-3.5 w-3.5" />
      )}
    </div>
  );
}

/**
 * Writing hints bar for a multi-line text field (e.g. the summary). Shows a
 * compact count + first message; click to expand the full list.
 */
export function WritingHintBar({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (!text.trim()) return null;
  const issues = checkText(text, "");
  if (!issues.length) return null;
  const warns = issues.filter((i) => i.severity === "warn");
  const infos = issues.filter((i) => i.severity === "info");
  const label =
    warns.length > 0
      ? `${warns.length} writing suggestion${warns.length > 1 ? "s" : ""}`
      : `${infos.length} tip${infos.length > 1 ? "s" : ""}`;
  return (
    <div className="mt-1 space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          warns.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-sky-500",
        )}
      >
        {warns.length > 0 ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Info className="h-3 w-3" />
        )}
        {label}
        <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul className="space-y-0.5 pl-1">
          {issues.map((issue, i) => (
            <li
              key={i}
              className={cn(
                "text-xs",
                issue.severity === "warn"
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground",
              )}
            >
              {issue.severity === "warn" ? "⚠ " : "ℹ "} {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Bullet editor: one row per bullet with a drag handle (reorder), up/down
 * buttons (touch/keyboard-friendly), and per-bullet delete — plus the optional
 * "Improve with AI" action. Empty rows are kept locally while typing but never
 * pushed to the resume, so the PDF never shows blank bullets.
 */
export function BulletEditor({
  label,
  value,
  onChange,
  placeholder,
  hint,
  aiContext,
}: BaseFieldProps & {
  value: string[];
  onChange: (value: string[]) => void;
  aiContext?: string;
}) {
  const [rows, setRows] = useState<string[]>(value);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Resync only when the upstream array changes externally (import / AI / reset).
  useEffect(() => {
    if (rows.filter((r) => r.trim()).join("\n") !== value.join("\n")) {
      setRows(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: string[]) => {
    setRows(next);
    onChange(next.filter((r) => r.trim()));
  };
  const updateRow = (i: number, v: string) =>
    commit(rows.map((r, idx) => (idx === i ? v : r)));
  const removeRow = (i: number) => commit(rows.filter((_, idx) => idx !== i));
  const move = (i: number, j: number) => {
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const dropOn = (i: number) => {
    if (dragIndex === null || dragIndex === i) {
      setDragIndex(null);
      return;
    }
    const next = [...rows];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setDragIndex(null);
    commit(next);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-1">
          <BulletSuggestions
            hint={aiContext}
            onInsert={(text) => commit([...rows.filter((r) => r.trim()), text])}
          />
          {aiContext !== undefined ? (
            <AiImproveButton
              bullets={rows.filter((r) => r.trim())}
              context={aiContext}
              onResult={commit}
            />
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-1 rounded-md border bg-background p-1 transition-colors",
              dragIndex === i && "opacity-50",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropOn(i)}
          >
            {/* HTML5 drag doesn't fire on touch, so the grip is desktop-only;
                the up/down buttons handle reordering everywhere. */}
            <button
              type="button"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              aria-label="Drag to reorder"
              className="mt-1.5 hidden cursor-grab text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing sm:block"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <Textarea
              rows={2}
              value={row}
              placeholder={placeholder}
              onChange={(e) => updateRow(i, e.target.value)}
              className="min-h-0 flex-1 resize-y py-1.5"
            />
            <BulletHint text={row} />
            <div className="flex flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                aria-label="Move bullet up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => move(i, i + 1)}
                disabled={i === rows.length - 1}
                aria-label="Move bullet down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-1.5 h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => removeRow(i)}
              aria-label="Remove bullet"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setRows([...rows, ""])}
      >
        <Plus className="h-3.5 w-3.5" />
        Add bullet
      </Button>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Wrapper for a repeatable entry with move/remove controls. */
/**
 * A collapsible entry (a job, a degree, a project). Collapsing keeps long
 * lists scannable; `autoFocus` is set on a freshly added entry so it scrolls
 * into view and takes the cursor instead of landing off-screen.
 */
export function EntryCard({
  title,
  subtitle,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  autoFocus = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onRemove: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  autoFocus?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    setOpen(true);
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus once the smooth scroll has settled, so the browser doesn't fight it.
    const t = setTimeout(() => {
      el.querySelector<HTMLInputElement>("input, textarea")?.focus({
        preventScroll: true,
      });
    }, 260);
    return () => clearTimeout(t);
  }, [autoFocus]);

  return (
    <div ref={ref} className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="truncate text-sm font-semibold text-muted-foreground">
            {title}
          </span>
          {subtitle ? (
            <span className="hidden shrink-0 truncate text-xs text-muted-foreground/60 sm:inline">
              {subtitle}
            </span>
          ) : null}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            aria-label="Move up"
          >
            <ChevronUp />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            aria-label="Move down"
          >
            <ChevronDown />
          </Button>
          {onDuplicate ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDuplicate}
              aria-label="Duplicate"
              title="Duplicate"
            >
              <Copy />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {open ? (
        <div className="space-y-3 border-t px-4 pb-4 pt-3">{children}</div>
      ) : null}
    </div>
  );
}

/** "Add another …" button used at the bottom of each repeatable section. */
export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" className="w-full" onClick={onClick}>
      <Plus />
      {label}
    </Button>
  );
}

/** Two fields side by side on wider screens. */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
