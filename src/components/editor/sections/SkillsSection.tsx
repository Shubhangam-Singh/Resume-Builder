"use client";

import { useResumeStore } from "@/lib/store";
import { AddButton, EntryCard, TagField, TextField } from "../fields";

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
          <TextField
            label="Category"
            value={s.name}
            onChange={(v) => updateEntry("skills", s.id, { name: v })}
            placeholder="Languages"
          />
          <TagField
            label="Skills"
            value={s.keywords}
            onChange={(v) => updateEntry("skills", s.id, { keywords: v })}
            placeholder="TypeScript, Python, SQL"
            hint="Comma-separated."
          />
        </EntryCard>
      ))}
      <AddButton label="Add skill group" onClick={() => addEntry("skills")} />
    </div>
  );
}
