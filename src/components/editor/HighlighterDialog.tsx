"use client";

import { useState } from "react";
import { Highlighter, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useResumeStore } from "@/lib/store";
import type { HighlightRule } from "@/lib/resume/types";

const COLORS = [
  { id: "yellow", hex: "#fef08a" },
  { id: "green", hex: "#bbf7d0" },
  { id: "pink", hex: "#fbcfe8" },
  { id: "blue", hex: "#bfdbfe" },
];

export function HighlighterDialog() {
  const storeHighlights = useResumeStore((s) => s.resume.meta.highlights) || [];
  const setHighlights = useResumeStore((s) => s.setHighlights);
  const [open, setOpen] = useState(false);

  // Local state for editing before applying
  const [rules, setRules] = useState<HighlightRule[]>(storeHighlights);

  // Sync state when dialog opens
  function handleOpenChange(next: boolean) {
    if (next) {
      setRules(storeHighlights);
    }
    setOpen(next);
  }

  function handleAdd() {
    setRules([...rules, { id: crypto.randomUUID(), text: "", color: COLORS[0].hex }]);
  }

  function handleUpdate(id: string, patch: Partial<HighlightRule>) {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleRemove(id: string) {
    setRules(rules.filter((r) => r.id !== id));
  }

  function handleApply() {
    // filter out empty text rules
    setHighlights(rules.filter((r) => r.text.trim().length > 0));
    setOpen(false);
  }

  const activeCount = storeHighlights.filter((r) => r.text.trim().length > 0).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground">
          {activeCount > 0 ? (
            <>
              <Highlighter className="h-3.5 w-3.5 text-primary" />
              <span className="text-foreground">Highlighter ({activeCount})</span>
            </>
          ) : (
            <>
              <Highlighter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Highlighter</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>PDF Highlighter</DialogTitle>
          <DialogDescription>
            Highlight specific words or phrases in your resume. These will appear with a colored background in the exported PDF.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto">
          {rules.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-4">
              No highlight rules added yet.
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-2">
                <Input
                  placeholder="Text to highlight..."
                  value={rule.text}
                  onChange={(e) => handleUpdate(rule.id, { text: e.target.value })}
                  className="flex-1 h-9"
                />
                <div className="flex gap-1 shrink-0">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleUpdate(rule.id, { color: c.hex })}
                      className={`h-7 w-7 rounded-full shadow-sm transition-transform active:scale-95 flex items-center justify-center border-2 ${
                        rule.color === c.hex ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      aria-label={`Select ${c.id}`}
                    />
                  ))}
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemove(rule.id)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
          
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="mt-2 w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Add Rule
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply Highlights
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
