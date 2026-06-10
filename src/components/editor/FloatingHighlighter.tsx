"use client";

import { useEffect, useRef, useState } from "react";
import { useResumeStore } from "@/lib/store";
import { Highlighter } from "lucide-react";

const COLORS = [
  { id: "yellow", hex: "#fef08a" },
  { id: "green", hex: "#bbf7d0" },
  { id: "pink", hex: "#fbcfe8" },
  { id: "blue", hex: "#bfdbfe" },
];

export function FloatingHighlighter() {
  const storeHighlights = useResumeStore((s) => s.resume.meta.highlights) || [];
  const setHighlights = useResumeStore((s) => s.setHighlights);

  const [selection, setSelection] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Ref to the floating toolbar DOM node so we can check "click outside"
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      // If the click is on our own toolbar, do nothing — let onClick handlers fire.
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
        return;
      }

      // Use a short delay so the browser updates selectionStart/End first.
      setTimeout(() => {
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;

        if (
          active &&
          (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
          active.selectionStart !== null &&
          active.selectionEnd !== null &&
          active.selectionEnd > active.selectionStart
        ) {
          const text = active.value
            .substring(active.selectionStart, active.selectionEnd)
            .trim();

          if (text.length > 0) {
            // Anchor the toolbar above the mouse-up position.
            setSelection({ text, x: e.clientX, y: e.clientY - 50 });
            return;
          }
        }

        // Clicked somewhere with no selection → hide the toolbar.
        setSelection(null);
      }, 10);
    }

    function handleMouseDown(e: MouseEvent) {
      // If mousedown lands outside our toolbar, dismiss it.
      // (We check before the click so the toolbar is gone before selectionchange fires.)
      if (
        selection !== null &&
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        // Don't setSelection(null) immediately — let handleMouseUp decide;
        // otherwise a drag-to-select would flash the toolbar then hide it.
      }
    }

    // Dismiss when user presses Escape
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelection(null);
      }
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection]);

  function applyHighlight(colorHex: string) {
    if (!selection) return;

    const exists = storeHighlights.find(
      (h) => h.text.toLowerCase() === selection.text.toLowerCase()
    );

    const newHighlights = exists
      ? storeHighlights.map((h) =>
          h.id === exists.id ? { ...h, color: colorHex } : h
        )
      : [
          ...storeHighlights,
          { id: crypto.randomUUID(), text: selection.text, color: colorHex },
        ];

    setHighlights(newHighlights);
    // Keep the toolbar visible so the user can change color if they want.
  }

  if (!selection) return null;

  return (
    <div
      ref={toolbarRef}
      id="floating-highlighter"
      className="fixed z-[9999] flex items-center gap-1.5 rounded-full border bg-background px-3 py-2 shadow-2xl"
      style={{
        left: Math.max(10, Math.min(selection.x - 80, window.innerWidth - 200)),
        top: Math.max(10, selection.y),
        // Keep it above the text
        pointerEvents: "all",
      }}
      onMouseDown={(e) => {
        // Prevent any mousedown inside the toolbar from clearing the text selection
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Highlighter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="mx-1 h-4 w-px bg-border" />
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyHighlight(c.hex);
          }}
          className="h-6 w-6 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-125 active:scale-95"
          style={{ backgroundColor: c.hex }}
          title={`Highlight in ${c.id}`}
        />
      ))}
      <div className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelection(null);
        }}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
