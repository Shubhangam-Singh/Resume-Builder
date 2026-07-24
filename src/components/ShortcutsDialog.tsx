"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUiStore } from "@/lib/ui-store";

/** Cmd on Apple platforms, Ctrl everywhere else. */
function modKey(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
    ? "⌘"
    : "Ctrl";
}

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "General",
    items: [
      { keys: ["MOD", "K"], label: "Open the command palette" },
      { keys: ["?"], label: "Show this shortcuts list" },
      { keys: ["Esc"], label: "Close a dialog or the palette" },
    ],
  },
  {
    title: "Editing",
    items: [
      { keys: ["MOD", "Z"], label: "Undo" },
      { keys: ["MOD", "Shift", "Z"], label: "Redo" },
      { keys: ["Tab"], label: "Move to the next field" },
    ],
  },
  {
    title: "In the command palette",
    items: [
      { keys: ["↑", "↓"], label: "Move between results" },
      { keys: ["Enter"], label: "Run the highlighted command" },
    ],
  },
];

/**
 * Shortcut reference, opened with "?" or from the command palette. The app
 * already had shortcuts; nothing surfaced them until now.
 */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const [mod, setMod] = useState("Ctrl");

  const dialogRequest = useUiStore((s) => s.dialog);
  const closeDialogRequest = useUiStore((s) => s.closeDialog);

  useEffect(() => setMod(modKey()), []);

  useEffect(() => {
    if (dialogRequest === "shortcuts") {
      setOpen(true);
      closeDialogRequest();
    }
  }, [dialogRequest, closeDialogRequest]);

  // "?" opens the sheet — but never while the user is typing into a field.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      setOpen((v) => !v);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> any time to bring this back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {g.title}
              </p>
              <ul className="space-y-1">
                {g.items.map((it) => (
                  <li
                    key={it.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{it.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {it.keys.map((k) => (
                        <Kbd key={k}>{k === "MOD" ? mod : k}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
