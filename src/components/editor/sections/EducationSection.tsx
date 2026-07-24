"use client";

import { useState } from "react";

import { formatDateRange } from "@/lib/resume/format";
import { useResumeStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import {
  AddButton,
  EntryCard,
  FieldRow,
  TagField,
  TextField,
} from "../fields";

export function EducationSection() {
  const education = useResumeStore((s) => s.resume.education);
  const addEntry = useResumeStore((s) => s.addEntry);
  const duplicateEntry = useResumeStore((s) => s.duplicateEntry);
  const updateEntry = useResumeStore((s) => s.updateEntry);
  const removeEntry = useResumeStore((s) => s.removeEntry);
  const moveEntry = useResumeStore((s) => s.moveEntry);
  const undo = useResumeStore((s) => s.undo);

  const [focusId, setFocusId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {education.map((e, i) => (
        <EntryCard
          key={e.id}
          title={
            [e.studyType, e.institution].filter(Boolean).join(" · ") ||
            "New education"
          }
          subtitle={formatDateRange(e.startDate, e.endDate)}
          autoFocus={e.id === focusId}
          onRemove={() => {
            removeEntry("education", e.id);
            toast("Education deleted", "info", { label: "Undo", onClick: undo });
          }}
          onDuplicate={() => setFocusId(duplicateEntry("education", e.id))}
          onMoveUp={i > 0 ? () => moveEntry("education", e.id, -1) : undefined}
          onMoveDown={
            i < education.length - 1
              ? () => moveEntry("education", e.id, 1)
              : undefined
          }
        >
          <TextField
            label="Institution"
            value={e.institution}
            onChange={(v) => updateEntry("education", e.id, { institution: v })}
            placeholder="State University"
          />
          <FieldRow>
            <TextField
              label="Degree / study type"
              value={e.studyType}
              onChange={(v) => updateEntry("education", e.id, { studyType: v })}
              placeholder="B.S."
            />
            <TextField
              label="Field of study"
              value={e.area}
              onChange={(v) => updateEntry("education", e.id, { area: v })}
              placeholder="Computer Science"
            />
          </FieldRow>
          <FieldRow>
            <TextField
              label="Start date"
              type="month"
              value={e.startDate}
              onChange={(v) => updateEntry("education", e.id, { startDate: v })}
            />
            <TextField
              label="End date"
              type="month"
              value={e.endDate}
              onChange={(v) => updateEntry("education", e.id, { endDate: v })}
              hint="Leave empty if in progress."
            />
          </FieldRow>
          <TextField
            label="Score / GPA"
            value={e.score}
            onChange={(v) => updateEntry("education", e.id, { score: v })}
            placeholder="3.8 GPA"
          />
          <TagField
            label="Relevant coursework"
            value={e.courses}
            onChange={(v) => updateEntry("education", e.id, { courses: v })}
            placeholder="Algorithms, Databases, Operating Systems"
            hint="Comma-separated. Optional."
          />
        </EntryCard>
      ))}
      <AddButton
        label="Add education"
        onClick={() => setFocusId(addEntry("education"))}
      />
    </div>
  );
}
