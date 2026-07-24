"use client";

import { useState } from "react";

import { useResumeStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import {
  AddButton,
  BulletEditor,
  EntryCard,
  TagField,
  TextAreaField,
  TextField,
} from "../fields";

export function ProjectsSection() {
  const projects = useResumeStore((s) => s.resume.projects);
  const addEntry = useResumeStore((s) => s.addEntry);
  const duplicateEntry = useResumeStore((s) => s.duplicateEntry);
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const moveEntry = useResumeStore((s) => s.moveEntry);
  const undo = useResumeStore((s) => s.undo);

  const [focusId, setFocusId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {projects.map((p, i) => (
        <EntryCard
          key={p.id}
          title={p.name || "New project"}
          autoFocus={p.id === focusId}
          onRemove={() => {
            removeEntry("projects", p.id);
            toast("Project deleted", "info", { label: "Undo", onClick: undo });
          }}
          onDuplicate={() => setFocusId(duplicateEntry("projects", p.id))}
          onMoveUp={i > 0 ? () => moveEntry("projects", p.id, -1) : undefined}
          onMoveDown={
            i < projects.length - 1
              ? () => moveEntry("projects", p.id, 1)
              : undefined
          }
        >
          <TextField
            label="Name"
            value={p.name}
            onChange={(v) => updateEntry("projects", p.id, { name: v })}
            placeholder="Project name"
          />
          <TextField
            label="URL"
            type="url"
            value={p.url}
            onChange={(v) => updateEntry("projects", p.id, { url: v })}
            placeholder="https://github.com/you/project"
          />
          <TextAreaField
            label="Description"
            value={p.description}
            onChange={(v) => updateEntry("projects", p.id, { description: v })}
            placeholder="What it is and what it does."
            rows={2}
          />
          <BulletEditor
            label="Highlights"
            value={p.highlights}
            onChange={(v) => updateEntry("projects", p.id, { highlights: v })}
            placeholder="A notable highlight or result."
            aiContext={`project${p.name ? ` "${p.name}"` : ""}`}
          />
          <TagField
            label="Keywords / tech"
            value={p.keywords}
            onChange={(v) => updateEntry("projects", p.id, { keywords: v })}
            placeholder="Next.js, TypeScript, Postgres"
            hint="Comma-separated."
          />
        </EntryCard>
      ))}
      <AddButton
        label="Add project"
        onClick={() => setFocusId(addEntry("projects"))}
      />
    </div>
  );
}
