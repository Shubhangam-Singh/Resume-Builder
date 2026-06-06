"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/lib/store";
import {
  AddButton,
  BulletEditor,
  EntryCard,
  FieldRow,
  TextAreaField,
  TextField,
} from "../fields";

/**
 * Editor for user-defined sections (Publications, Volunteering, Awards, …).
 * Each section has a title and a list of entries; entries reuse the same
 * fields + bullet editor as the built-in sections, and render in every
 * template via CustomSectionView.
 */
export function CustomSectionsEditor() {
  const customSections = useResumeStore((s) => s.resume.customSections) ?? [];
  const addCustomSection = useResumeStore((s) => s.addCustomSection);
  const updateCustomSection = useResumeStore((s) => s.updateCustomSection);
  const removeCustomSection = useResumeStore((s) => s.removeCustomSection);
  const addCustomItem = useResumeStore((s) => s.addCustomItem);
  const updateCustomItem = useResumeStore((s) => s.updateCustomItem);
  const removeCustomItem = useResumeStore((s) => s.removeCustomItem);
  const moveCustomItem = useResumeStore((s) => s.moveCustomItem);

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Add your own sections — Publications, Volunteering, Awards, Languages,
        and so on. Reorder or hide them from the{" "}
        <span className="font-medium">Sections</span> menu.
      </p>

      {customSections.map((section) => (
        <div
          key={section.id}
          className="space-y-3 rounded-lg border bg-muted/30 p-3"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label="Section title"
                value={section.title}
                onChange={(v) => updateCustomSection(section.id, { title: v })}
                placeholder="e.g. Volunteering"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="mb-0.5 h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => removeCustomSection(section.id)}
              aria-label="Remove section"
            >
              <Trash2 />
            </Button>
          </div>

          <div className="space-y-3">
            {section.items.map((item, i) => (
              <EntryCard
                key={item.id}
                title={item.name || "New entry"}
                onRemove={() => removeCustomItem(section.id, item.id)}
                onMoveUp={
                  i > 0 ? () => moveCustomItem(section.id, item.id, -1) : undefined
                }
                onMoveDown={
                  i < section.items.length - 1
                    ? () => moveCustomItem(section.id, item.id, 1)
                    : undefined
                }
              >
                <FieldRow>
                  <TextField
                    label="Title"
                    value={item.name}
                    onChange={(v) =>
                      updateCustomItem(section.id, item.id, { name: v })
                    }
                    placeholder="e.g. Best Paper Award"
                  />
                  <TextField
                    label="Date"
                    type="month"
                    value={item.date}
                    onChange={(v) =>
                      updateCustomItem(section.id, item.id, { date: v })
                    }
                  />
                </FieldRow>
                <TextField
                  label="Link (optional)"
                  type="url"
                  value={item.url}
                  onChange={(v) =>
                    updateCustomItem(section.id, item.id, { url: v })
                  }
                  placeholder="https://…"
                />
                <TextAreaField
                  label="Description"
                  value={item.description}
                  onChange={(v) =>
                    updateCustomItem(section.id, item.id, { description: v })
                  }
                  placeholder="A short description."
                  rows={2}
                />
                <BulletEditor
                  label="Bullets"
                  value={item.highlights}
                  onChange={(v) =>
                    updateCustomItem(section.id, item.id, { highlights: v })
                  }
                  placeholder="An additional detail."
                />
              </EntryCard>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => addCustomItem(section.id)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add entry
            </Button>
          </div>
        </div>
      ))}

      <AddButton label="Add custom section" onClick={() => addCustomSection()} />
    </div>
  );
}
