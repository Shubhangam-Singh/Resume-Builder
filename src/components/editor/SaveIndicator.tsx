"use client";

import { Check, CloudOff, Loader2 } from "lucide-react";

import { useSaveState } from "@/lib/persist/save-state";
import { cn } from "@/lib/utils";

/**
 * Quiet autosave status. This app has no account, so the only reassurance a
 * user gets that their resume survives a refresh is this indicator — and if
 * IndexedDB is unavailable (private windows, quota), it says so instead of
 * silently pretending the work is safe.
 */
export function SaveIndicator() {
  const state = useSaveState((s) => s.state);

  if (state === "idle") return null;

  const failed = state === "error";
  const saving = state === "saving";

  return (
    <span
      title={
        failed
          ? "Couldn't save to this browser's storage — export a copy to be safe."
          : saving
            ? "Saving to this browser…"
            : "Saved in this browser. Nothing is uploaded."
      }
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors",
        failed
          ? "bg-destructive/10 text-destructive"
          : "text-muted-foreground",
      )}
    >
      {failed ? (
        <CloudOff className="h-3.5 w-3.5" />
      ) : saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      )}
      <span className={cn(failed ? "inline" : "hidden 2xl:inline")}>
        {failed ? "Not saved" : saving ? "Saving…" : "Saved"}
      </span>
    </span>
  );
}
