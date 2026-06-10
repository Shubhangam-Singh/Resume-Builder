"use client";

import { useId } from "react";

import { Label } from "@/components/ui/label";
import { useResumeStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AddButton, EntryCard, TagField, TextField } from "../fields";

const LEVELS = ["", "Beginner", "Intermediate", "Expert", "Fluent"] as const;

function LevelSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Proficiency</Label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          !value && "text-muted-foreground",
        )}
      >
        {LEVELS.map((l) => (
          <option key={l} value={l}>{l || "None"}</option>
        ))}
      </select>
    </div>
  );
}

export function SkillsSection() {
  const skills = useResumeStore((s) => s.resume.skills);
  const addEntry = useResumeStore((s) => s.addEntry);
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const moveEntry = useResumeStore((s) => s.moveEntry);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Group skills by category (e.g. Languages, Frameworks, Tools). Each
        category renders as one line on the resume.
      </p>
      {skills.map((s, i) => (
        <EntryCard
          key={s.id}
          title={s.name || "New skill group"}
          onRemove={() => removeEntry("skills", s.id)}
          onMoveUp={i > 0 ? () => moveEntry("skills", s.id, -1) : undefined}
          onMoveDown={
            i < skills.length - 1
              ? () => moveEntry("skills", s.id, 1)
              : undefined
          }
        >
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <TextField
              label="Category"
              value={s.name}
              onChange={(v) => updateEntry("skills", s.id, { name: v })}
              placeholder="Languages"
            />
            <LevelSelect
              value={s.level}
              onChange={(v) => updateEntry("skills", s.id, { level: v })}
            />
          </div>
          <TagField
            label="Skills"
            value={s.keywords}
            onChange={(v) => updateEntry("skills", s.id, { keywords: v })}
            placeholder="TypeScript, Python, SQL"
            hint="Comma-separated. Level shows in the PDF after the keywords."
          />
        </EntryCard>
      ))}
      <AddButton label="Add skill group" onClick={() => addEntry("skills")} />
    </div>
  );
}
