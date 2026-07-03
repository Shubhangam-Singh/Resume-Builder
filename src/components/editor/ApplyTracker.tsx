"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  APPLICATION_STATUSES,
  deleteApplication,
  emptyApplication,
  listApplications,
  saveApplication,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/persist/tracker";
import { useResumeStore } from "@/lib/store";

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  saved: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  applied: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  interview: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  offer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function ApplyTracker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const documentId = useResumeStore((s) => s.documentId);
  const documentName = useResumeStore((s) => s.documentName);

  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setApps(await listApplications());
    setLoading(false);
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  function patch(id: string, p: Partial<JobApplication>) {
    setApps((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...p } : a));
      const changed = next.find((a) => a.id === id);
      if (changed) void saveApplication(changed);
      return next;
    });
  }

  async function add() {
    const app = emptyApplication(documentId, documentName);
    await saveApplication(app);
    setApps((prev) => [app, ...prev]);
  }

  async function remove(id: string) {
    await deleteApplication(id);
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application tracker</DialogTitle>
          <DialogDescription>
            Track where you&apos;ve applied and which resume you used. Everything
            stays on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={add}>
            <Plus />
            Add application
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : apps.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No applications yet. Add one to start tracking.
          </p>
        ) : (
          <ul className="space-y-3">
            {apps.map((app) => (
              <li key={app.id} className="space-y-2.5 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLES[app.status],
                    )}
                  >
                    {app.status}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Resume: {app.docName || "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => remove(app.id)}
                    aria-label="Delete application"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={app.company}
                    onChange={(e) => patch(app.id, { company: e.target.value })}
                    placeholder="Company"
                  />
                  <Input
                    value={app.role}
                    onChange={(e) => patch(app.id, { role: e.target.value })}
                    placeholder="Role / title"
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    value={app.status}
                    onChange={(e) =>
                      patch(app.id, {
                        status: e.target.value as ApplicationStatus,
                      })
                    }
                    className="h-9 rounded-md border border-input bg-background px-2 text-base sm:text-sm"
                    aria-label="Status"
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="date"
                    value={app.appliedDate}
                    onChange={(e) =>
                      patch(app.id, { appliedDate: e.target.value })
                    }
                    aria-label="Applied date"
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="url"
                      value={app.jobUrl}
                      onChange={(e) => patch(app.id, { jobUrl: e.target.value })}
                      placeholder="Job posting URL"
                    />
                    {app.jobUrl ? (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Open job posting"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </div>

                <Textarea
                  value={app.notes}
                  onChange={(e) => patch(app.id, { notes: e.target.value })}
                  placeholder="Notes (contacts, salary, follow-ups…)"
                  rows={2}
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
