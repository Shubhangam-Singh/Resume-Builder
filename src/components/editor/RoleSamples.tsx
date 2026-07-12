"use client";

import { useState } from "react";
import { LayoutTemplate } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_SAMPLES } from "@/lib/resume/role-samples";
import { useResumeStore } from "@/lib/store";

/**
 * A picker that lets the user replace the current resume with a pre-filled
 * role-specific example. Useful for starting from something realistic rather
 * than a blank slate.
 */
export function RoleSamples({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setResume = useResumeStore((s) => s.setResume);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const pending = ROLE_SAMPLES.find((r) => r.id === pendingId);

  function applySample(id: string) {
    setPendingId(id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Start from a role template
          </DialogTitle>
          <DialogDescription>
            Pick a pre-filled example tailored to a specific role. It replaces
            the current resume — swap in your real details from there.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => applySample(sample.id)}
              className="group flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent"
            >
              <div className="text-2xl">{sample.emoji}</div>
              <div>
                <p className="font-semibold leading-tight text-sm group-hover:text-primary">
                  {sample.role}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {sample.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={pending !== undefined && pendingId !== null}
        onOpenChange={(v) => {
          if (!v) setPendingId(null);
        }}
        title={`Start from the ${pending?.role ?? ""} example?`}
        description="This replaces your current resume. You can undo with Ctrl+Z."
        confirmLabel="Use this example"
        onConfirm={() => {
          if (pending) {
            setResume(pending.data());
            onOpenChange(false);
          }
        }}
      />
    </Dialog>
  );
}
