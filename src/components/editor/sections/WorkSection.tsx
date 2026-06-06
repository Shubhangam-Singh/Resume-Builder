"use client";

import { useResumeStore } from "@/lib/store";
import {
  AddButton,
  BulletEditor,
  EntryCard,
  FieldRow,
  TextField,
} from "../fields";

export function WorkSection() {
  const work = useResumeStore((s) => s.resume.work);
  const addEntry = useResumeStore((s) => s.addEntry);
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const moveEntry = useResumeStore((s) => s.moveEntry);

  return (
    <div className="space-y-4">
      {work.map((w, i) => (
        <EntryCard
          key={w.id}
          title={
            [w.position, w.name].filter(Boolean).join(" · ") || "New role"
          }
          onRemove={() => removeEntry("work", w.id)}
          onMoveUp={i > 0 ? () => moveEntry("work", w.id, -1) : undefined}
          onMoveDown={
            i < work.length - 1 ? () => moveEntry("work", w.id, 1) : undefined
          }
        >
          <FieldRow>
            <TextField
              label="Position"
              value={w.position}
              onChange={(v) => updateEntry("work", w.id, { position: v })}
              placeholder="Software Engineer"
            />
            <TextField
              label="Company"
              value={w.name}
              onChange={(v) => updateEntry("work", w.id, { name: v })}
              placeholder="Acme Inc."
            />
          </FieldRow>
          <FieldRow>
            <TextField
              label="Location"
              value={w.location}
              onChange={(v) => updateEntry("work", w.id, { location: v })}
              placeholder="Remote"
            />
            <TextField
              label="Company URL"
              type="url"
              value={w.url}
              onChange={(v) => updateEntry("work", w.id, { url: v })}
              placeholder="https://acme.com"
            />
          </FieldRow>
          <FieldRow>
            <TextField
              label="Start date"
              type="month"
              value={w.startDate}
              onChange={(v) => updateEntry("work", w.id, { startDate: v })}
            />
            <TextField
              label="End date"
              type="month"
              value={w.endDate}
              onChange={(v) => updateEntry("work", w.id, { endDate: v })}
              hint="Leave empty if this is your current role."
            />
          </FieldRow>
          <BulletEditor
            label="Highlights"
            value={w.highlights}
            onChange={(v) => updateEntry("work", w.id, { highlights: v })}
            placeholder="Start with an action verb and quantify when you can."
            hint="Drag the handle to reorder bullets."
            aiContext={`${w.position || "role"}${w.name ? ` at ${w.name}` : ""}`}
          />
        </EntryCard>
      ))}
      <AddButton label="Add experience" onClick={() => addEntry("work")} />
    </div>
  );
}
