"use client";

import { useResumeStore } from "@/lib/store";
import { AddButton, EntryCard, FieldRow, TextField } from "../fields";

export function CertificatesSection() {
  const certificates = useResumeStore((s) => s.resume.certificates);
  const addEntry = useResumeStore((s) => s.addEntry);
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const moveEntry = useResumeStore((s) => s.moveEntry);

  return (
    <div className="space-y-4">
      {certificates.map((c, i) => (
        <EntryCard
          key={c.id}
          title={c.name || "New certificate"}
          onRemove={() => removeEntry("certificates", c.id)}
          onMoveUp={
            i > 0 ? () => moveEntry("certificates", c.id, -1) : undefined
          }
          onMoveDown={
            i < certificates.length - 1
              ? () => moveEntry("certificates", c.id, 1)
              : undefined
          }
        >
          <TextField
            label="Name"
            value={c.name}
            onChange={(v) => updateEntry("certificates", c.id, { name: v })}
            placeholder="AWS Certified Solutions Architect"
          />
          <FieldRow>
            <TextField
              label="Issuer"
              value={c.issuer}
              onChange={(v) => updateEntry("certificates", c.id, { issuer: v })}
              placeholder="Amazon Web Services"
            />
            <TextField
              label="Date"
              type="month"
              value={c.date}
              onChange={(v) => updateEntry("certificates", c.id, { date: v })}
            />
          </FieldRow>
          <TextField
            label="URL"
            type="url"
            value={c.url}
            onChange={(v) => updateEntry("certificates", c.id, { url: v })}
            placeholder="https://credential-url"
          />
        </EntryCard>
      ))}
      <AddButton
        label="Add certificate"
        onClick={() => addEntry("certificates")}
      />
    </div>
  );
}
