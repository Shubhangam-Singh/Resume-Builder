"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { AiImproveButton } from "@/components/ai/AiImproveButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { commaToList, linesToList } from "@/lib/resume/format";

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
