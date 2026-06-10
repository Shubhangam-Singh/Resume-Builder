"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    function checkSelection(e?: MouseEvent | KeyboardEvent) {
      setTimeout(() => {
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
        
        if (
          active &&
          (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
          active.selectionStart !== null &&
          active.selectionEnd !== null &&
          active.selectionEnd > active.selectionStart
        ) {
          const text = active.value.substring(active.selectionStart, active.selectionEnd).trim();
          
          if (text.length > 0) {
            // Only update X and Y if triggered by a mouse/keyboard event
            if (e) {
              let x = 0;
              let y = 0;
              if ("clientX" in e) {
                x = (e as MouseEvent).clientX;
                y = (e as MouseEvent).clientY - 40;
              } else {
                const rect = active.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top - 50;
              }
              setSelection({ text, x, y });
            } else {
              // If triggered by pure selectionchange (like moving mouse while holding),
              // just silently update the text, but DON'T move the tooltip.
              setSelection((prev) => (prev ? { ...prev, text } : null));
            }
            return;
          }
        }
        
        // Prevent clearing if focus shifts to our own buttons
        const activeNow = document.activeElement;
        if (activeNow && activeNow.closest && activeNow.closest("#floating-highlighter")) {
          return;
        }

        setSelection(null);
      }, 10);
    }

    function handleMouseUp(e: MouseEvent) {
      // Ignore mouseup if it happens directly on the floating toolbar buttons
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest("#floating-highlighter")) {
        return;
      }
      checkSelection(e);
    }

    function handleKeyUp(e: KeyboardEvent) {
      // Only capture selection on navigation/selection keys
      if (e.key === "Shift" || e.key.includes("Arrow")) {
        checkSelection(e);
      }
    }

    function handleSelectionChange() {
      // Handles unselecting when clicking away
      checkSelection();
    }

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  if (!selection) return null;

  function applyHighlight(colorHex: string) {
    if (!selection) return;

    const exists = storeHighlights.find(
      (h) => h.text.toLowerCase() === selection.text.toLowerCase()
    );

    let newHighlights;
    if (exists) {
      newHighlights = storeHighlights.map((h) =>
        h.id === exists.id ? { ...h, color: colorHex } : h
      );
    } else {
      newHighlights = [
        ...storeHighlights,
        { id: crypto.randomUUID(), text: selection.text, color: colorHex },
      ];
    }

    setHighlights(newHighlights);
  }

  return (
    <div
      id="floating-highlighter"
      className="fixed z-[100] flex items-center gap-1 rounded-full border bg-background px-2 py-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: Math.max(10, selection.x - 70), // Center roughly above cursor
        top: Math.max(10, selection.y),
      }}
    >
      <div className="flex items-center gap-1.5 border-r pr-2 mr-1">
        <Highlighter className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      
      {COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onMouseDown={(e) => {
             // Prevents the textarea from losing focus when clicking a color
             e.preventDefault();
             e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            applyHighlight(c.hex);
          }}
          className="h-6 w-6 rounded-full shadow-sm transition-transform hover:scale-110 active:scale-95 border border-transparent"
          style={{ backgroundColor: c.hex }}
          title={`Highlight ${c.id}`}
        />
      ))}
    </div>
  );
}
