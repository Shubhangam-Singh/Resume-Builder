"use client";

import { useResumeStore } from "@/lib/store";
import {
  AddButton,
  EntryCard,
  ListField,
  TagField,
  TextAreaField,
  TextField,
} from "../fields";

export function ProjectsSection() {
  const projects = useResumeStore((s) => s.resume.projects);
  const addEntry = useResumeStore((s) => s.addEntry);
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const moveEntry = useResumeStore((s) => s.moveEntry);

  return (
    <div className="space-y-4">
      {projects.map((p, i) => (
        <EntryCard
          key={p.id}
          title={p.name || "New project"}
          onRemove={() => removeEntry("projects", p.id)}
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
          <ListField
            label="Highlights"
            value={p.highlights}
            onChange={(v) => updateEntry("projects", p.id, { highlights: v })}
            placeholder="One highlight per line."
            rows={3}
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
      <AddButton label="Add project" onClick={() => addEntry("projects")} />
    </div>
  );
}
