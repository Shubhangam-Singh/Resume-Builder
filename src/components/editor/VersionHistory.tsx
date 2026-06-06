"use client";

import { useEffect, useState } from "react";
import { History, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { diffResumes } from "@/lib/resume/diff";
import {
  deleteSnapshot,
  listSnapshots,
  saveSnapshot,
  type Snapshot,
} from "@/lib/persist/snapshots";
import { useResumeStore } from "@/lib/store";

export function VersionHistory({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const documentId = useResumeStore((s) => s.documentId);
  const resume = useResumeStore((s) => s.resume);
  const setResume = useResumeStore((s) => s.setResume);

  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = async () => {
    if (!documentId) return;
    setLoading(true);
    setSnaps(await listSnapshots(documentId));
    setLoading(false);
  };

  useEffect(() => {
    if (open) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId]);

  async function handleSave() {
    if (!documentId) return;
    await saveSnapshot(documentId, label, resume);
    setLabel("");
    await refresh();
  }

  async function handleRestore(snap: Snapshot) {
    if (
      window.confirm(
        "Restore this version? Your current resume will be replaced (you can undo with Ctrl+Z).",
      )
    ) {
      setResume(snap.data);
      onOpenChange(false);
    }
  }

  async function handleDelete(snap: Snapshot) {
    await deleteSnapshot(documentId, snap.id);
    await refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Save snapshots of this resume, compare what changed, and restore any
            version. Stored only on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Snapshot label (optional)
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Before tailoring for Acme"
            />
          </div>
          <Button onClick={handleSave} disabled={!documentId}>
            <Save />
            Save snapshot
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : snaps.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No snapshots yet. Save one before a big change so you can roll back.
          </p>
        ) : (
          <ul className="space-y-2">
            {snaps.map((snap) => {
              const changes = diffResumes(snap.data, resume);
              const isOpen = expanded === snap.id;
              return (
                <li key={snap.id} className="rounded-md border p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{snap.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(snap.createdAt).toLocaleString()} ·{" "}
                        {changes.length === 0
                          ? "matches current"
                          : `${changes.length} change${changes.length === 1 ? "" : "s"} vs current`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(isOpen ? null : snap.id)}
                      disabled={changes.length === 0}
                    >
                      {isOpen ? "Hide" : "Diff"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(snap)}
                    >
                      <RotateCcw />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(snap)}
                      aria-label="Delete snapshot"
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  {isOpen && changes.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t pt-2">
                      {changes.map((c, i) => (
                        <li key={i} className="flex gap-2 text-xs">
                          <span
                            className={
                              c.kind === "added"
                                ? "font-medium text-emerald-600"
                                : c.kind === "removed"
                                  ? "font-medium text-destructive"
                                  : "font-medium text-amber-600"
                            }
                          >
                            {c.label}
                          </span>
                          <span className="text-muted-foreground">{c.detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Tip: snapshots compare against your current resume.
        </p>
      </DialogContent>
    </Dialog>
  );
}
