"use client";

import { useMemo, useState } from "react";
import { Check, Lightbulb, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BULLET_LIBRARY, guessCategory } from "@/lib/content/bullet-library";
import { useResumeStore } from "@/lib/store";

/**
 * "Suggestions" button for bullet editors: a searchable library of pre-written,
 * role-specific bullets with metric placeholders. Static data, fully offline —
 * no AI key required. Clicking a bullet appends it; the dialog stays open so
 * several can be added in one visit.
 */
export function BulletSuggestions({
  hint,
  onInsert,
}: {
  /** Role-ish text (e.g. "Frontend Engineer at Acme") to pre-select a category. */
  hint?: string;
  onInsert: (text: string) => void;
}) {
  const headline = useResumeStore((s) => s.resume.basics.label);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const activeCategory =
    category ?? guessCategory(`${hint ?? ""} ${headline}`.trim());

  const bullets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      // Searching looks across every category, not just the active one.
      return BULLET_LIBRARY.flatMap((c) =>
        c.bullets
          .filter((b) => b.toLowerCase().includes(q))
          .map((b) => ({ text: b, from: c.label })),
      );
    }
    const cat =
      BULLET_LIBRARY.find((c) => c.id === activeCategory) ??
      BULLET_LIBRARY[BULLET_LIBRARY.length - 1];
    return cat.bullets.map((b) => ({ text: b, from: cat.label }));
  }, [query, activeCategory]);

  function insert(text: string) {
    onInsert(text);
    setAdded((prev) => new Set(prev).add(text));
  }

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v) {
      setQuery("");
      setAdded(new Set());
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        onClick={() => handleOpen(true)}
        title="Insert a pre-written bullet"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Suggest
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Bullet suggestions
            </DialogTitle>
            <DialogDescription>
              Proven phrasings with [bracketed] placeholders — insert one, then
              replace the placeholders with your real numbers.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all suggestions…"
            aria-label="Search suggestions"
          />

          {!query.trim() && (
            <div className="flex flex-wrap gap-1">
              {BULLET_LIBRARY.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={
                    c.id === activeCategory
                      ? "rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
                      : "rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <div className="scrollbar-thin -mr-2 max-h-[45vh] space-y-1.5 overflow-y-auto pr-2">
            {bullets.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No suggestions match that search.
              </p>
            )}
            {bullets.map((b) => {
              const isAdded = added.has(b.text);
              return (
                <button
                  key={b.text}
                  type="button"
                  onClick={() => insert(b.text)}
                  disabled={isAdded}
                  className="flex w-full items-start gap-2 rounded-md border p-2 text-left text-xs transition-colors hover:border-primary hover:bg-accent disabled:opacity-60"
                >
                  {isAdded ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  ) : (
                    <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1">{b.text}</span>
                  {query.trim() && (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {b.from}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
