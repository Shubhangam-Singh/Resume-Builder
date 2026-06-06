"use client";

import { useEffect, useId, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { AiImproveButton } from "@/components/ai/AiImproveButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { commaToList, linesToList } from "@/lib/resume/format";
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
        {aiContext !== undefined ? (
          <AiImproveButton
            bullets={rows.filter((r) => r.trim())}
            context={aiContext}
            onResult={commit}
          />
        ) : null}
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
            <button
              type="button"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              aria-label="Drag to reorder"
              className="mt-1.5 cursor-grab text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
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
export function EntryCard({
  title,
  onRemove,
  onMoveUp,
  onMoveDown,
  children,
}: {
  title: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="truncate text-sm font-semibold text-muted-foreground">
          {title}
        </h4>
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
      {children}
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
