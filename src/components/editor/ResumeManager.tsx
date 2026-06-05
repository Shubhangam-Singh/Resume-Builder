"use client";

import { useState } from "react";
import { Check, Copy, Files, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { emptyResume, uid } from "@/lib/resume/factory";
import { useResumeStore } from "@/lib/store";
import {
  deleteDoc,
  listDocs,
  loadDoc,
  saveDoc,
  setActiveId,
  type SavedDoc,
} from "@/lib/persist/db";

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  return `${day} day${day === 1 ? "" : "s"} ago`;
}

export function ResumeManager() {
  const resume = useResumeStore((s) => s.resume);
  const documentId = useResumeStore((s) => s.documentId);
  const documentName = useResumeStore((s) => s.documentName);
  const loadDocument = useResumeStore((s) => s.loadDocument);
  const setDocumentName = useResumeStore((s) => s.setDocumentName);

  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<SavedDoc[]>([]);

  async function refresh() {
    setDocs(await listDocs());
  }

  function handleOpen(next: boolean) {
    setOpen(next);
    if (next) void refresh();
  }

  /** Flush the active document so unsaved edits aren't lost on switch. */
  async function persistCurrent() {
    if (!documentId) return;
    await saveDoc({
      id: documentId,
      name: documentName,
      updatedAt: Date.now(),
      data: resume,
    });
  }

  async function switchTo(id: string) {
    if (id !== documentId) {
      await persistCurrent();
      const doc = await loadDoc(id);
      if (doc) {
        loadDocument(doc);
        await setActiveId(id);
      }
    }
    setOpen(false);
  }

  async function createNew() {
    const name = window.prompt("Name this resume", "My resume");
    if (name === null) return;
    await persistCurrent();
    const doc: SavedDoc = {
      id: uid(),
      name: name.trim() || "Untitled",
      updatedAt: Date.now(),
      data: emptyResume(),
    };
    await saveDoc(doc);
    await setActiveId(doc.id);
    loadDocument(doc);
    setOpen(false);
  }

  async function duplicate() {
    await persistCurrent();
    const doc: SavedDoc = {
      id: uid(),
      name: `${documentName} (copy)`,
      updatedAt: Date.now(),
      data: structuredClone(resume),
    };
    await saveDoc(doc);
    await setActiveId(doc.id);
    loadDocument(doc);
    setOpen(false);
  }

  async function rename(doc: SavedDoc) {
    const name = window.prompt("Rename resume", doc.name);
    if (name === null) return;
    const trimmed = name.trim() || "Untitled";
    if (doc.id === documentId) setDocumentName(trimmed);
    await saveDoc({ ...doc, name: trimmed, updatedAt: Date.now() });
    await refresh();
  }

  async function remove(doc: SavedDoc) {
    if (!window.confirm(`Delete “${doc.name}”? This can't be undone.`)) return;
    await deleteDoc(doc.id);
    if (doc.id === documentId) {
      const remaining = await listDocs();
      if (remaining[0]) {
        loadDocument(remaining[0]);
        await setActiveId(remaining[0].id);
      } else {
        const fresh: SavedDoc = {
          id: uid(),
          name: "My resume",
          updatedAt: Date.now(),
          data: emptyResume(),
        };
        await saveDoc(fresh);
        await setActiveId(fresh.id);
        loadDocument(fresh);
      }
    }
    await refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Manage resumes">
          <Files />
          <span className="hidden max-w-[12ch] truncate sm:inline">
            {documentName}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your resumes</DialogTitle>
          <DialogDescription>
            All saved in your browser. Switch between versions, or keep separate
            resumes tailored to different roles.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {docs.map((doc) => {
            const isActive = doc.id === documentId;
            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-1 rounded-md border p-1.5",
                  isActive && "border-primary/40 bg-accent",
                )}
              >
                <button
                  type="button"
                  onClick={() => switchTo(doc.id)}
                  className="flex flex-1 items-center gap-2 rounded px-1.5 py-1 text-left text-sm hover:bg-accent/60"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary" : "text-transparent",
                    )}
                  />
                  <span className="flex-1 truncate">
                    <span className="font-medium">{doc.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {relativeTime(doc.updatedAt)}
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Rename ${doc.name}`}
                  onClick={() => rename(doc)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  aria-label={`Delete ${doc.name}`}
                  onClick={() => remove(doc)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={createNew}>
            <Plus />
            New resume
          </Button>
          <Button variant="outline" className="flex-1" onClick={duplicate}>
            <Copy />
            Duplicate current
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
